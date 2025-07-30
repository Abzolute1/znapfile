from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID
from app.db.base import get_db
from app.models.file import File, FileShare, FileComment
from app.models.folder import Folder, shared_folders
from app.models.user import User
from app.schemas.sharing import (
    ShareFileRequest, ShareFileResponse, SharedFileInfo,
    FileCommentCreate, FileCommentResponse, SharedUsersResponse
)
from app.api.deps import require_user, get_current_user
from app.core.rate_limiting import limiter, RATE_LIMITS

router = APIRouter()


@router.post("/files/{file_id}/share", response_model=ShareFileResponse)
async def share_file(
    file_id: UUID,
    share_data: ShareFileRequest,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    """Share a file with another user"""
    # Verify file ownership
    result = await db.execute(
        select(File)
        .where(File.id == file_id)
        .where(File.user_id == current_user.id)
    )
    file = result.scalar_one_or_none()
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Find target user by email
    target_result = await db.execute(
        select(User).where(User.email == share_data.email)
    )
    target_user = target_result.scalar_one_or_none()
    
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if target_user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot share with yourself"
        )
    
    # Check if already shared
    existing_share = await db.execute(
        select(FileShare)
        .where(FileShare.file_id == file_id)
        .where(FileShare.shared_with_id == target_user.id)
    )
    if existing_share.scalar():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File already shared with this user"
        )
    
    # Create share
    file_share = FileShare(
        file_id=file_id,
        shared_by_id=current_user.id,
        shared_with_id=target_user.id,
        permission=share_data.permission,
        expires_at=datetime.utcnow() + timedelta(days=share_data.expiry_days) if share_data.expiry_days else None
    )
    
    db.add(file_share)
    await db.commit()
    await db.refresh(file_share)
    
    return ShareFileResponse(
        id=file_share.id,
        file_id=file_share.file_id,
        shared_with_email=target_user.email,
        permission=file_share.permission,
        shared_at=file_share.shared_at,
        expires_at=file_share.expires_at
    )


@router.get("/shared-with-me", response_model=List[SharedFileInfo])
async def get_shared_files(
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
    include_expired: bool = Query(False)
):
    """Get files shared with the current user"""
    query = (
        select(FileShare, File, User)
        .join(File, FileShare.file_id == File.id)
        .join(User, FileShare.shared_by_id == User.id)
        .where(FileShare.shared_with_id == current_user.id)
        .where(File.deleted == False)
    )
    
    if not include_expired:
        query = query.where(
            or_(
                FileShare.expires_at.is_(None),
                FileShare.expires_at > datetime.utcnow()
            )
        )
    
    result = await db.execute(query)
    shares = result.all()
    
    return [
        SharedFileInfo(
            share_id=share.FileShare.id,
            file_id=share.File.id,
            original_filename=share.File.original_filename,
            file_size=share.File.file_size,
            mime_type=share.File.mime_type,
            short_code=share.File.short_code,
            shared_by_email=share.User.email,
            shared_by_name=share.User.name,
            permission=share.FileShare.permission,
            shared_at=share.FileShare.shared_at,
            expires_at=share.FileShare.expires_at,
            file_expires_at=share.File.expires_at
        )
        for share in shares
    ]


@router.delete("/files/{file_id}/shares/{share_id}")
async def revoke_share(
    file_id: UUID,
    share_id: UUID,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    """Revoke a file share"""
    result = await db.execute(
        select(FileShare)
        .join(File, FileShare.file_id == File.id)
        .where(FileShare.id == share_id)
        .where(FileShare.file_id == file_id)
        .where(File.user_id == current_user.id)
    )
    share = result.scalar_one_or_none()
    
    if not share:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share not found"
        )
    
    await db.delete(share)
    await db.commit()
    
    return {"message": "Share revoked successfully"}


@router.post("/folders/{folder_id}/share")
async def share_folder(
    folder_id: UUID,
    share_data: ShareFileRequest,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    """Share a folder with another user"""
    # Verify folder ownership
    result = await db.execute(
        select(Folder)
        .where(Folder.id == folder_id)
        .where(Folder.user_id == current_user.id)
    )
    folder = result.scalar_one_or_none()
    
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found"
        )
    
    # Find target user
    target_result = await db.execute(
        select(User).where(User.email == share_data.email)
    )
    target_user = target_result.scalar_one_or_none()
    
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if already shared
    existing = await db.execute(
        select(shared_folders.c.folder_id)
        .where(shared_folders.c.folder_id == folder_id)
        .where(shared_folders.c.user_id == target_user.id)
    )
    if existing.scalar():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Folder already shared with this user"
        )
    
    # Share folder
    await db.execute(
        shared_folders.insert().values(
            folder_id=folder_id,
            user_id=target_user.id,
            permission=share_data.permission,
            shared_at=datetime.utcnow()
        )
    )
    await db.commit()
    
    return {"message": "Folder shared successfully"}


@router.post("/files/{file_id}/comments", response_model=FileCommentResponse)
@limiter.limit(RATE_LIMITS["comment"])
async def add_comment(
    request: Request,
    file_id: UUID,
    comment_data: FileCommentCreate,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    """Add a comment to a file"""
    # Check if user has access to the file
    query = select(File).where(File.id == file_id).where(File.deleted == False)
    
    # Check if it's the owner's file or shared with user
    share_query = (
        select(FileShare)
        .where(FileShare.file_id == file_id)
        .where(FileShare.shared_with_id == current_user.id)
    )
    
    file_result = await db.execute(query)
    file = file_result.scalar_one_or_none()
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Check permissions
    has_access = file.user_id == current_user.id
    if not has_access:
        share_result = await db.execute(share_query)
        share = share_result.scalar_one_or_none()
        has_access = share is not None
    
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No access to this file"
        )
    
    if not file.allow_comments:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Comments are disabled for this file"
        )
    
    # Create comment
    comment = FileComment(
        file_id=file_id,
        user_id=current_user.id,
        content=comment_data.content
    )
    
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    
    return FileCommentResponse(
        id=comment.id,
        file_id=comment.file_id,
        user_id=comment.user_id,
        user_email=current_user.email,
        user_name=current_user.name,
        content=comment.content,
        created_at=comment.created_at
    )


@router.get("/files/{file_id}/comments", response_model=List[FileCommentResponse])
async def get_comments(
    file_id: UUID,
    current_user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0)
):
    """Get comments for a file"""
    # Get file and check access
    file_result = await db.execute(
        select(File).where(File.id == file_id).where(File.deleted == False)
    )
    file = file_result.scalar_one_or_none()
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Check if file is public or user has access
    has_access = file.is_public
    if current_user and not has_access:
        has_access = file.user_id == current_user.id
        if not has_access:
            share_result = await db.execute(
                select(FileShare)
                .where(FileShare.file_id == file_id)
                .where(FileShare.shared_with_id == current_user.id)
            )
            has_access = share_result.scalar() is not None
    
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No access to this file"
        )
    
    # Get comments
    query = (
        select(FileComment, User)
        .join(User, FileComment.user_id == User.id)
        .where(FileComment.file_id == file_id)
        .order_by(FileComment.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    
    result = await db.execute(query)
    comments = result.all()
    
    return [
        FileCommentResponse(
            id=comment.FileComment.id,
            file_id=comment.FileComment.file_id,
            user_id=comment.FileComment.user_id,
            user_email=comment.User.email,
            user_name=comment.User.name,
            content=comment.FileComment.content,
            created_at=comment.FileComment.created_at
        )
        for comment in comments
    ]


@router.get("/files/{file_id}/shared-users", response_model=SharedUsersResponse)
async def get_shared_users(
    file_id: UUID,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    """Get list of users a file is shared with"""
    # Verify ownership
    file_result = await db.execute(
        select(File)
        .where(File.id == file_id)
        .where(File.user_id == current_user.id)
    )
    file = file_result.scalar_one_or_none()
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Get shares
    shares_result = await db.execute(
        select(FileShare, User)
        .join(User, FileShare.shared_with_id == User.id)
        .where(FileShare.file_id == file_id)
    )
    shares = shares_result.all()
    
    return SharedUsersResponse(
        file_id=file_id,
        shares=[
            {
                "share_id": share.FileShare.id,
                "user_id": share.User.id,
                "user_email": share.User.email,
                "user_name": share.User.name,
                "permission": share.FileShare.permission,
                "shared_at": share.FileShare.shared_at,
                "expires_at": share.FileShare.expires_at
            }
            for share in shares
        ]
    )