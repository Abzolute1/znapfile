"""
Admin endpoints for system management
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select, and_, distinct
from datetime import datetime, timedelta, timezone
from app.db.base import get_db
from app.models.user import User, UserTier
from app.models.file import File, DownloadLog, ShareLink
from app.models.notification import Notification
from app.api.deps import require_user
from app.core.key_management import master_key_manager
from pydantic import BaseModel
from typing import List, Dict, Optional, Any

router = APIRouter()


class KeyRotationRequest(BaseModel):
    key_type: str  # "encryption" or "jwt"
    
    
class KeyRotationResponse(BaseModel):
    key_type: str
    new_version: int
    message: str


class GlobalMessageRequest(BaseModel):
    title: str
    message: str
    type: str = "info"  # info, warning, success, error


async def require_admin(current_user: User = Depends(require_user)) -> User:
    """Require admin/superuser privileges"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user


@router.post("/rotate-key", response_model=KeyRotationResponse)
async def rotate_encryption_key(
    request: KeyRotationRequest,
    admin_user: User = Depends(require_admin)
):
    """Rotate encryption or JWT signing keys"""
    
    if request.key_type not in ["encryption", "jwt"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid key type. Must be 'encryption' or 'jwt'"
        )
    
    try:
        new_version = await master_key_manager.rotate_master_key(request.key_type)
        
        return KeyRotationResponse(
            key_type=request.key_type,
            new_version=new_version,
            message=f"Successfully rotated {request.key_type} key to version {new_version}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to rotate key: {str(e)}"
        )


@router.get("/key-rotation-history/{key_type}")
async def get_key_rotation_history(
    key_type: str,
    admin_user: User = Depends(require_admin)
) -> List[Dict]:
    """Get key rotation history for audit purposes"""
    
    if key_type not in ["encryption", "jwt"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid key type. Must be 'encryption' or 'jwt'"
        )
    
    try:
        history = await master_key_manager.key_rotation.get_key_rotation_history(key_type)
        return history
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get rotation history: {str(e)}"
        )


# Analytics Endpoints

@router.get("/analytics/overview")
async def get_analytics_overview(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get high-level analytics overview"""
    # Total users
    total_users = await db.scalar(select(func.count(User.id)))
    
    # Users by tier (excluding superusers for revenue calculation)
    tier_counts = await db.execute(
        select(User.tier, func.count(User.id))
        .group_by(User.tier)
    )
    users_by_tier = {tier.value: count for tier, count in tier_counts}
    
    # Get paying user counts (excluding superusers)
    paying_tier_counts = await db.execute(
        select(User.tier, func.count(User.id))
        .where(User.is_superuser == False)
        .group_by(User.tier)
    )
    paying_users_by_tier = {tier.value: count for tier, count in paying_tier_counts}
    
    # Active users (last 30 days)
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    active_users = await db.scalar(
        select(func.count(distinct(User.id)))
        .select_from(User)
        .join(File)
        .where(File.created_at >= thirty_days_ago)
    )
    
    # New users (last 30 days)
    new_users_30d = await db.scalar(
        select(func.count(User.id))
        .where(User.created_at >= thirty_days_ago)
    )
    
    # Calculate MRR (Monthly Recurring Revenue) - excluding admin users
    pro_paying_users = paying_users_by_tier.get(UserTier.PRO.value, 0)
    max_paying_users = paying_users_by_tier.get(UserTier.MAX.value, 0)
    mrr = (pro_paying_users * 6.99) + (max_paying_users * 22.99)
    
    return {
        "total_users": total_users,
        "users_by_tier": {
            "free": users_by_tier.get(UserTier.FREE.value, 0),
            "pro": users_by_tier.get(UserTier.PRO.value, 0),
            "max": users_by_tier.get(UserTier.MAX.value, 0)
        },
        "active_users_30d": active_users,
        "new_users_30d": new_users_30d,
        "mrr": round(mrr, 2),
        "arr": round(mrr * 12, 2)  # Annual Recurring Revenue
    }


@router.get("/analytics/users/growth")
async def get_user_growth(
    period: str = Query("30d", regex="^(7d|30d|90d|1y)$"),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get user growth over time"""
    # Determine date range
    end_date = datetime.now(timezone.utc)
    if period == "7d":
        start_date = end_date - timedelta(days=7)
        date_format = "%Y-%m-%d"
    elif period == "30d":
        start_date = end_date - timedelta(days=30)
        date_format = "%Y-%m-%d"
    elif period == "90d":
        start_date = end_date - timedelta(days=90)
        date_format = "%Y-%W"  # Year-Week
    else:  # 1y
        start_date = end_date - timedelta(days=365)
        date_format = "%Y-%m"  # Year-Month
    
    # Get signups by period - using SQLite-compatible date formatting
    signups = await db.execute(
        select(
            func.strftime(date_format, User.created_at).label("period"),
            func.count(User.id).label("count")
        )
        .where(User.created_at >= start_date)
        .group_by("period")
        .order_by("period")
    )
    
    return {
        "period": period,
        "data": [
            {
                "date": row.period,
                "signups": row.count
            }
            for row in signups
        ]
    }


@router.get("/analytics/system/health")
async def get_system_health(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get system health metrics"""
    # Total files
    total_files = await db.scalar(select(func.count(File.id)))
    
    # Active files (not expired)
    active_files = await db.scalar(
        select(func.count(File.id))
        .where(File.expires_at > datetime.now(timezone.utc))
    )
    
    # Total storage used
    total_storage = await db.scalar(
        select(func.coalesce(func.sum(File.file_size), 0))
        .where(File.expires_at > datetime.now(timezone.utc))
    ) or 0
    
    # Files uploaded today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    files_today = await db.scalar(
        select(func.count(File.id))
        .where(File.created_at >= today_start)
    )
    
    # Bandwidth used today (uploads)
    bandwidth_today = await db.scalar(
        select(func.coalesce(func.sum(File.file_size), 0))
        .where(File.created_at >= today_start)
    ) or 0
    
    # Average file size
    avg_file_size = await db.scalar(
        select(func.avg(File.file_size))
    ) or 0
    
    # Downloads today
    downloads_today = await db.scalar(
        select(func.count(DownloadLog.id))
        .where(DownloadLog.downloaded_at >= today_start)
    )
    
    return {
        "files": {
            "total": total_files,
            "active": active_files,
            "uploaded_today": files_today,
            "average_size": int(avg_file_size)
        },
        "storage": {
            "used_bytes": total_storage,
            "used_gb": round(total_storage / (1024**3), 2)
        },
        "bandwidth": {
            "today_bytes": bandwidth_today,
            "today_gb": round(bandwidth_today / (1024**3), 2),
            "downloads_today": downloads_today
        }
    }


@router.get("/analytics/revenue/breakdown")
async def get_revenue_breakdown(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get detailed revenue analytics"""
    # Get user counts by tier with join dates (excluding superusers)
    users = await db.execute(
        select(User.tier, User.created_at, User.stripe_customer_id)
        .where(
            User.tier != UserTier.FREE,
            User.is_superuser == False
        )
    )
    
    # Calculate metrics
    pro_users = []
    max_users = []
    
    for row in users:
        if row.tier == UserTier.PRO:
            pro_users.append(row)
        elif row.tier == UserTier.MAX:
            max_users.append(row)
    
    # Monthly growth
    now = datetime.now()  # Use naive datetime to match database
    last_month = now - timedelta(days=30)
    
    new_pro_last_month = sum(1 for u in pro_users if u[1] >= last_month)  # u[1] is created_at
    new_max_last_month = sum(1 for u in max_users if u[1] >= last_month)  # u[1] is created_at
    
    # Churn calculation would require subscription history
    # For now, we'll just show active subscriptions
    active_pro = sum(1 for u in pro_users if u[2])  # u[2] is stripe_customer_id
    active_max = sum(1 for u in max_users if u[2])  # u[2] is stripe_customer_id
    
    return {
        "subscriptions": {
            "pro": {
                "active": active_pro,
                "monthly_revenue": active_pro * 6.99,
                "new_last_30d": new_pro_last_month
            },
            "max": {
                "active": active_max,
                "monthly_revenue": active_max * 22.99,
                "new_last_30d": new_max_last_month
            }
        },
        "totals": {
            "mrr": (active_pro * 6.99) + (active_max * 22.99),
            "arr": ((active_pro * 6.99) + (active_max * 22.99)) * 12,
            "active_subscriptions": active_pro + active_max
        }
    }


@router.get("/analytics/features/usage")
async def get_feature_usage(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get feature usage statistics"""
    # Password protected files
    password_protected = await db.scalar(
        select(func.count(File.id))
        .where(File.password_hash.isnot(None))
    )
    
    total_files = await db.scalar(select(func.count(File.id)))
    
    # Share link usage
    total_shares = await db.scalar(select(func.count(ShareLink.id)))
    
    # File type distribution (by extension)
    file_types = await db.execute(
        select(
            func.lower(func.substr(File.original_filename, -4)),
            func.count(File.id)
        )
        .group_by(func.lower(func.substr(File.original_filename, -4)))
        .order_by(func.count(File.id).desc())
        .limit(10)
    )
    
    return {
        "password_protection": {
            "enabled": password_protected,
            "percentage": round((password_protected / total_files * 100) if total_files > 0 else 0, 1)
        },
        "share_links": {
            "total": total_shares
        },
        "top_file_types": [
            {"extension": ext, "count": count}
            for ext, count in file_types
        ]
    }


@router.get("/users/search")
async def search_users(
    q: str = Query(..., min_length=2),
    limit: int = Query(20, le=100),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Search users by email or username"""
    search_term = f"%{q}%"
    
    users = await db.execute(
        select(User)
        .where(
            (User.email.ilike(search_term)) | 
            (User.username.ilike(search_term))
        )
        .limit(limit)
    )
    
    return {
        "users": [
            {
                "id": str(user.id),
                "email": user.email,
                "username": user.username,
                "tier": user.tier.value,
                "created_at": user.created_at.isoformat(),
                "email_verified": user.email_verified,
                "is_active": user.is_active
            }
            for user in users.scalars()
        ]
    }


@router.get("/users/{user_id}")
async def get_user_details(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get detailed user information"""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user's file stats
    file_stats = await db.execute(
        select(
            func.count(File.id).label("total_files"),
            func.coalesce(func.sum(File.file_size), 0).label("total_size")
        )
        .where(File.user_id == user.id)
    )
    stats = file_stats.first()
    
    # Get recent uploads
    recent_files = await db.execute(
        select(File)
        .where(File.user_id == user.id)
        .order_by(File.created_at.desc())
        .limit(5)
    )
    
    return {
        "user": {
            "id": str(user.id),
            "email": user.email,
            "username": user.username,
            "tier": user.tier.value,
            "created_at": user.created_at.isoformat(),
            "email_verified": user.email_verified,
            "is_active": user.is_active,
            "is_superuser": user.is_superuser,
            "stripe_customer_id": user.stripe_customer_id
        },
        "stats": {
            "total_files": stats.total_files,
            "total_size": stats.total_size,
            "total_size_gb": round(stats.total_size / (1024**3), 2)
        },
        "recent_files": [
            {
                "id": str(file.id),
                "filename": file.original_filename,
                "size": file.file_size,
                "created_at": file.created_at.isoformat(),
                "expires_at": file.expires_at.isoformat() if file.expires_at else None,
                "password_protected": bool(file.password_hash)
            }
            for file in recent_files.scalars()
        ]
    }


@router.patch("/users/{user_id}/tier")
async def update_user_tier(
    user_id: str,
    tier: UserTier,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Manually update a user's tier (for support purposes)"""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    old_tier = user.tier
    user.tier = tier
    
    await db.commit()
    
    return {
        "message": "User tier updated",
        "user_id": str(user.id),
        "old_tier": old_tier.value,
        "new_tier": tier.value
    }


# Notification endpoints

@router.post("/notifications/global")
async def send_global_notification(
    request: GlobalMessageRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Send a notification to all users"""
    # Get all active users
    users = await db.execute(
        select(User).where(User.is_active == True)
    )
    
    notifications_created = 0
    
    # Create a notification for each user
    for user in users.scalars():
        notification = Notification(
            user_id=user.id,
            title=request.title,
            message=request.message,
            type=request.type,
            created_by_id=admin.id
        )
        db.add(notification)
        notifications_created += 1
    
    await db.commit()
    
    return {
        "message": "Global notification sent",
        "recipients": notifications_created,
        "notification": {
            "title": request.title,
            "message": request.message,
            "type": request.type
        }
    }


@router.get("/notifications/recent")
async def get_recent_notifications(
    limit: int = Query(10, le=50),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get recently sent global notifications"""
    notifications = await db.execute(
        select(
            Notification.title,
            Notification.message,
            Notification.type,
            Notification.created_at,
            func.count(Notification.id).label("recipient_count")
        )
        .where(Notification.created_by_id == admin.id)
        .group_by(
            Notification.title,
            Notification.message,
            Notification.type,
            Notification.created_at
        )
        .order_by(Notification.created_at.desc())
        .limit(limit)
    )
    
    return {
        "notifications": [
            {
                "title": n.title,
                "message": n.message,
                "type": n.type,
                "created_at": n.created_at.isoformat(),
                "recipient_count": n.recipient_count
            }
            for n in notifications
        ]
    }