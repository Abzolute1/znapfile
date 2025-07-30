from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import Dict, Any
from datetime import datetime, timedelta, timezone
from app.db.base import get_db
from app.models.user import User, UserTier
from app.models.file import File
from app.models.folder import Collection, CollectionItem
from app.api.deps import get_current_user

router = APIRouter()


@router.get("/global")
async def get_global_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get global platform statistics (admin only)"""
    if not current_user or not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Total users
    total_users_result = await db.execute(select(func.count(User.id)))
    total_users = total_users_result.scalar() or 0
    
    # Active users (logged in last 30 days)
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    active_users_result = await db.execute(
        select(func.count(User.id))
        .where(User.last_login_at > thirty_days_ago)
    )
    active_users = active_users_result.scalar() or 0
    
    # Users by tier
    users_by_tier_result = await db.execute(
        select(User.tier, func.count(User.id))
        .group_by(User.tier)
    )
    users_by_tier = {tier.value: count for tier, count in users_by_tier_result.all()}
    
    # Total files
    total_files_result = await db.execute(
        select(func.count(File.id))
        .where(File.deleted == False)
    )
    total_files = total_files_result.scalar() or 0
    
    # Total storage used
    total_storage_result = await db.execute(
        select(func.sum(File.file_size))
        .where(File.deleted == False)
    )
    total_storage = total_storage_result.scalar() or 0
    
    # Files uploaded today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    files_today_result = await db.execute(
        select(func.count(File.id))
        .where(and_(
            File.created_at >= today_start,
            File.deleted == False
        ))
    )
    files_today = files_today_result.scalar() or 0
    
    # Total collections
    total_collections_result = await db.execute(select(func.count(Collection.id)))
    total_collections = total_collections_result.scalar() or 0
    
    # Public collections
    public_collections_result = await db.execute(
        select(func.count(Collection.id))
        .where(Collection.is_public == True)
    )
    public_collections = public_collections_result.scalar() or 0
    
    # Total downloads
    total_downloads_result = await db.execute(
        select(func.sum(File.download_count))
        .where(File.deleted == False)
    )
    total_downloads = total_downloads_result.scalar() or 0
    
    # Popular files (top 5)
    popular_files_result = await db.execute(
        select(
            File.original_filename,
            File.file_size,
            File.download_count,
            File.created_at
        )
        .where(File.deleted == False)
        .order_by(File.download_count.desc())
        .limit(5)
    )
    popular_files = [
        {
            "filename": f.original_filename,
            "size": f.file_size,
            "downloads": f.download_count,
            "created_at": f.created_at.isoformat()
        }
        for f in popular_files_result.all()
    ]
    
    # Storage by user tier
    storage_by_tier_result = await db.execute(
        select(User.tier, func.sum(File.file_size))
        .join(File, File.user_id == User.id)
        .where(File.deleted == False)
        .group_by(User.tier)
    )
    storage_by_tier = {tier.value: size or 0 for tier, size in storage_by_tier_result.all()}
    
    return {
        "users": {
            "total": total_users,
            "active_30d": active_users,
            "by_tier": users_by_tier
        },
        "files": {
            "total": total_files,
            "uploaded_today": files_today,
            "total_downloads": total_downloads,
            "total_storage_bytes": total_storage,
            "popular_files": popular_files
        },
        "collections": {
            "total": total_collections,
            "public": public_collections
        },
        "storage": {
            "total_bytes": total_storage,
            "by_tier": storage_by_tier
        },
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@router.get("/user/{user_id}")
async def get_user_stats(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get detailed statistics for a specific user"""
    # Users can see their own stats, admins can see anyone's
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if str(current_user.id) != user_id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get user
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Total files
    total_files_result = await db.execute(
        select(func.count(File.id))
        .where(and_(
            File.user_id == user.id,
            File.deleted == False
        ))
    )
    total_files = total_files_result.scalar() or 0
    
    # Total storage
    total_storage_result = await db.execute(
        select(func.sum(File.file_size))
        .where(and_(
            File.user_id == user.id,
            File.deleted == False
        ))
    )
    total_storage = total_storage_result.scalar() or 0
    
    # Total downloads
    total_downloads_result = await db.execute(
        select(func.sum(File.download_count))
        .where(and_(
            File.user_id == user.id,
            File.deleted == False
        ))
    )
    total_downloads = total_downloads_result.scalar() or 0
    
    # Collections
    collections_result = await db.execute(
        select(func.count(Collection.id))
        .where(Collection.user_id == user.id)
    )
    total_collections = collections_result.scalar() or 0
    
    # Files by type
    files_by_type_result = await db.execute(
        select(
            func.substring(File.mime_type, 1, func.strpos(File.mime_type, '/') - 1),
            func.count(File.id)
        )
        .where(and_(
            File.user_id == user.id,
            File.deleted == False
        ))
        .group_by(func.substring(File.mime_type, 1, func.strpos(File.mime_type, '/') - 1))
    )
    files_by_type = {mime_type or 'unknown': count for mime_type, count in files_by_type_result.all()}
    
    # Recent uploads
    recent_uploads_result = await db.execute(
        select(
            File.original_filename,
            File.file_size,
            File.created_at,
            File.short_code
        )
        .where(and_(
            File.user_id == user.id,
            File.deleted == False
        ))
        .order_by(File.created_at.desc())
        .limit(10)
    )
    recent_uploads = [
        {
            "filename": f.original_filename,
            "size": f.file_size,
            "created_at": f.created_at.isoformat(),
            "short_code": f.short_code
        }
        for f in recent_uploads_result.all()
    ]
    
    return {
        "user": {
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "tier": user.tier.value,
            "created_at": user.created_at.isoformat()
        },
        "stats": {
            "total_files": total_files,
            "total_storage_bytes": total_storage,
            "total_downloads": total_downloads,
            "total_collections": total_collections,
            "files_by_type": files_by_type,
            "monthly_transfer_used": user.monthly_transfer_used or 0
        },
        "recent_uploads": recent_uploads,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }