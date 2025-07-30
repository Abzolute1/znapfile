"""
User notification endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.db.base import get_db
from app.models.notification import Notification
from app.models.user import User
from app.api.deps import require_user
from pydantic import BaseModel
from typing import List

router = APIRouter()


class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    type: str
    is_read: bool
    created_at: str


@router.get("/", response_model=List[NotificationResponse])
async def get_notifications(
    unread_only: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_user)
):
    """Get user's notifications"""
    query = select(Notification).where(
        Notification.user_id == current_user.id
    )
    
    if unread_only:
        query = query.where(Notification.is_read == False)
    
    query = query.order_by(Notification.created_at.desc())
    
    result = await db.execute(query)
    notifications = result.scalars().all()
    
    return [
        NotificationResponse(
            id=str(n.id),
            title=n.title,
            message=n.message,
            type=n.type,
            is_read=n.is_read,
            created_at=n.created_at.isoformat()
        )
        for n in notifications
    ]


@router.get("/unread-count")
async def get_unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_user)
):
    """Get count of unread notifications"""
    result = await db.execute(
        select(Notification).where(
            Notification.user_id == current_user.id,
            Notification.is_read == False
        )
    )
    
    count = len(result.scalars().all())
    
    return {"unread_count": count}


@router.post("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_user)
):
    """Mark a notification as read"""
    notification = await db.get(Notification, notification_id)
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    if notification.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    notification.is_read = True
    await db.commit()
    
    return {"message": "Notification marked as read"}


@router.post("/mark-all-read")
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_user)
):
    """Mark all notifications as read"""
    await db.execute(
        update(Notification)
        .where(
            Notification.user_id == current_user.id,
            Notification.is_read == False
        )
        .values(is_read=True)
    )
    
    await db.commit()
    
    return {"message": "All notifications marked as read"}