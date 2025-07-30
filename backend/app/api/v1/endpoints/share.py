from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone

from app.db.base import get_db
from app.models.file import File
from app.models.user import User
from app.api.deps import get_current_user
from app.schemas.share import ShareFileRequest, ShareFileResponse
from app.core.email import EmailService
from app.core.config import settings

router = APIRouter()


@router.post("/file/{file_id}/email", response_model=ShareFileResponse)
async def share_file_via_email(
    file_id: UUID,
    request: ShareFileRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Send file download link via email"""
    # Get file
    result = await db.execute(
        select(File).where(File.id == file_id)
    )
    file = result.scalar_one_or_none()
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Check ownership if user is authenticated
    if current_user and file.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Check if file is expired
    if file.expires_at.tzinfo is None:
        expires_at = file.expires_at.replace(tzinfo=timezone.utc)
    else:
        expires_at = file.expires_at
        
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="File has expired"
        )
    
    # Generate download link
    download_url = f"{settings.FRONTEND_URL}/d/{file.short_code}"
    
    # Prepare email data
    email_data = {
        "recipient_email": request.recipient_email,
        "recipient_name": request.recipient_name,
        "sender_name": request.sender_name or (current_user.email if current_user else "Someone"),
        "sender_email": request.sender_email or (current_user.email if current_user else None),
        "message": request.message,
        "file_name": file.original_filename,
        "file_size": file.file_size,
        "download_url": download_url,
        "expires_at": expires_at,
        "has_password": bool(file.password_hash)
    }
    
    # Send email in background
    background_tasks.add_task(
        EmailService.send_share_email,
        **email_data
    )
    
    return ShareFileResponse(
        success=True,
        message=f"Download link sent to {request.recipient_email}"
    )


@router.post("/collection/{collection_id}/email", response_model=ShareFileResponse)
async def share_collection_via_email(
    collection_id: UUID,
    request: ShareFileRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send collection link via email"""
    from app.models.folder import Collection
    
    # Get collection
    result = await db.execute(
        select(Collection).where(Collection.id == collection_id)
    )
    collection = result.scalar_one_or_none()
    
    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection not found"
        )
    
    # Check ownership
    if collection.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Generate collection link
    collection_url = f"{settings.FRONTEND_URL}/c/{collection.slug}"
    
    # Count files and calculate total size
    from sqlalchemy import func
    from app.models.folder import CollectionItem
    
    file_count_result = await db.execute(
        select(func.count(CollectionItem.file_id))
        .where(CollectionItem.collection_id == collection.id)
    )
    file_count = file_count_result.scalar() or 0
    
    total_size_result = await db.execute(
        select(func.sum(File.file_size))
        .join(CollectionItem, CollectionItem.file_id == File.id)
        .where(CollectionItem.collection_id == collection.id)
    )
    total_size = total_size_result.scalar() or 0
    
    # Prepare email data
    email_data = {
        "recipient_email": request.recipient_email,
        "recipient_name": request.recipient_name,
        "sender_name": request.sender_name or current_user.email,
        "sender_email": request.sender_email or current_user.email,
        "message": request.message,
        "collection_name": collection.name,
        "collection_description": collection.description,
        "file_count": file_count,
        "total_size": total_size,
        "collection_url": collection_url,
        "has_password": bool(collection.password_hash),
        "is_collection": True
    }
    
    # Send email in background
    background_tasks.add_task(
        EmailService.send_share_email,
        **email_data
    )
    
    return ShareFileResponse(
        success=True,
        message=f"Collection link sent to {request.recipient_email}"
    )