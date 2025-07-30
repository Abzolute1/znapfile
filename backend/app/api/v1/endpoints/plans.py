from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Dict, Any
from datetime import datetime, timezone

from app.api.deps import get_current_user
from app.db.base import get_db
from app.models.user import User, UserTier
from app.models.file import File
from app.core.plan_limits import PLAN_LIMITS, format_bytes

router = APIRouter()

@router.get("/")
async def get_pricing_plans() -> Dict[str, Any]:
    """Get all available pricing plans with their features and limits"""
    plans = []
    
    for tier in UserTier:
        limits = PLAN_LIMITS[tier]
        
        # Format the plan data for frontend display
        plan_data = {
            "id": tier.value,
            "name": tier.value.capitalize(),
            "price": {
                "free": 0,
                "pro": 6.99,
                "max": 21.99
            }.get(tier.value, 0),
            "features": {
                "monthly_transfer": format_bytes(limits["monthly_transfer_bytes"]),
                "max_file_size": format_bytes(limits["max_file_size_bytes"]),
                "active_storage": format_bytes(limits["active_storage_bytes"]) if limits["active_storage_bytes"] > 0 else "None",
                "file_expiration": f"{limits['file_expiration_hours']} hours" if limits['max_expiration_hours'] == limits['file_expiration_hours'] else f"1-{limits['max_expiration_hours'] // 24} days",
                "daily_transfers": limits["daily_transfer_limit"] if limits["daily_transfer_limit"] else "Unlimited",
                "password_protection": limits["password_protection"],
                "download_tracking": limits["download_tracking"],
                "api_access": limits["api_access"],
                "email_verification_required": limits["requires_email_verification"],
            },
            "limits": {
                "monthly_transfer_bytes": limits["monthly_transfer_bytes"],
                "max_file_size_bytes": limits["max_file_size_bytes"],
                "active_storage_bytes": limits["active_storage_bytes"],
                "max_expiration_hours": limits["max_expiration_hours"],
                "daily_transfer_limit": limits["daily_transfer_limit"],
            }
        }
        
        plans.append(plan_data)
    
    return {
        "plans": plans,
        "currency": "USD",
        "billing_period": "monthly"
    }

@router.post("/select")
async def select_plan(
    plan_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Select a plan for the current user (free plan only for now)"""
    
    # For now, only allow selecting the free plan
    # Pro and Max plans would require Stripe integration
    if plan_id != "free":
        return {
            "success": False,
            "message": "Pro and Max plans coming soon! Please continue with the free plan.",
            "selected_plan": current_user.tier.value
        }
    
    # User already has a plan
    return {
        "success": True,
        "message": f"You are on the {current_user.tier.value} plan",
        "selected_plan": current_user.tier.value
    }

@router.get("/current")
async def get_current_plan(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get the current user's plan and usage"""
    
    # If user is not authenticated, return free plan limits
    if not current_user:
        limits = PLAN_LIMITS[UserTier.FREE]
        return {
            "plan": {
                "id": UserTier.FREE.value,
                "name": "Free",
                "expires_at": None,
            },
            "usage": {
                "monthly_transfer_used": 0,
                "monthly_transfer_limit": limits["monthly_transfer_bytes"],
                "active_storage_used": 0,
                "active_storage_limit": limits["active_storage_bytes"],
                "daily_transfers_used": 0,
                "daily_transfers_limit": limits["daily_transfer_limit"],
            },
            "limits": limits
        }
    
    # Check if transfer reset is needed (monthly reset)
    now = datetime.now(timezone.utc)
    if current_user.transfer_reset_date:
        reset_date = current_user.transfer_reset_date.replace(tzinfo=timezone.utc) if current_user.transfer_reset_date.tzinfo is None else current_user.transfer_reset_date
        # If more than 30 days have passed, reset the counter
        if (now - reset_date).days >= 30:
            current_user.monthly_transfer_used = 0
            current_user.transfer_reset_date = now
            await db.commit()
    
    # Calculate active storage (files not expired and not deleted)
    active_storage_query = select(func.sum(File.file_size)).where(
        File.user_id == current_user.id,
        File.deleted == False,
        File.expires_at > now
    )
    result = await db.execute(active_storage_query)
    active_storage_used = result.scalar() or 0
    
    # Calculate daily transfers (uploads in the last 24 hours)
    daily_transfers_query = select(func.count(File.id)).where(
        File.user_id == current_user.id,
        File.created_at >= now.replace(hour=0, minute=0, second=0, microsecond=0)
    )
    result = await db.execute(daily_transfers_query)
    daily_transfers_used = result.scalar() or 0
    
    limits = PLAN_LIMITS[current_user.tier]
    
    return {
        "plan": {
            "id": current_user.tier.value,
            "name": current_user.tier.value.capitalize(),
            "expires_at": current_user.subscription_end_date.isoformat() if current_user.subscription_end_date else None,
        },
        "usage": {
            "monthly_transfer_used": current_user.monthly_transfer_used or 0,
            "monthly_transfer_limit": limits["monthly_transfer_bytes"],
            "active_storage_used": active_storage_used,
            "active_storage_limit": limits["active_storage_bytes"],
            "daily_transfers_used": daily_transfers_used,
            "daily_transfers_limit": limits["daily_transfer_limit"],
        },
        "limits": limits
    }