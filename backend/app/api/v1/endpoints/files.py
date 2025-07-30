from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File as FastAPIFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, and_, delete
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any
from uuid import UUID
import magic
from app.db.base import get_db
from app.models.file import File
from app.models.user import User
from app.schemas.file import FileListResponse, FileInfo, FileUploadResponse
from app.api.deps import require_user
from app.services.storage import storage_service
from app.utils.files import generate_stored_filename
from app.core.validators import FileValidator, FilenameValidator

router = APIRouter()


@router.get("/", response_model=FileListResponse)
async def list_user_files(
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    # Get active files
    result = await db.execute(
        select(File)
        .where(File.user_id == current_user.id)
        .where(File.expires_at > datetime.now(timezone.utc))
        .where(File.deleted == False)
        .order_by(File.created_at.desc())
    )
    files = result.scalars().all()
    
    # Calculate total storage
    storage_result = await db.execute(
        select(func.sum(File.file_size))
        .where(File.user_id == current_user.id)
        .where(File.expires_at > datetime.now(timezone.utc))
        .where(File.deleted == False)
    )
    total_storage = storage_result.scalar() or 0
    
    # Get storage limit based on tier
    from app.core.plan_limits import get_plan_limits
    plan_limits = get_plan_limits(current_user.tier)
    storage_limit = plan_limits.get("active_storage_bytes", 0)
    
    file_infos = []
    for f in files:
        try:
            file_info = FileInfo(
                id=f.id,
                original_filename=f.original_filename,
                file_size=f.file_size,
                mime_type=f.mime_type,
                short_code=f.short_code,
                expires_at=f.expires_at,
                download_count=f.download_count,
                max_downloads=f.max_downloads,
                created_at=f.created_at,
                has_password=bool(f.password_hash),
                description=getattr(f, 'description', None),
                notes=getattr(f, 'notes', None),
                is_public=getattr(f, 'is_public', False),
                allow_comments=getattr(f, 'allow_comments', True),
                version=getattr(f, 'version', 1),
                folder_id=getattr(f, 'folder_id', None),
                parent_file_id=getattr(f, 'parent_file_id', None)
            )
            file_infos.append(file_info)
        except Exception as e:
            # Log error but don't fail the entire request
            import logging
            logging.error(f"Error processing file {f.id}: {e}")
            continue
    
    return FileListResponse(
        files=file_infos,
        total_storage_used=total_storage,
        storage_limit=storage_limit
    )


@router.delete("/{file_id}")
async def delete_file(
    file_id: UUID,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
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
    
    # Delete from R2
    await storage_service.delete_file(file.stored_filename)
    
    # Mark as deleted in database
    file.deleted = True
    await db.commit()
    
    return {"message": "File deleted successfully"}


@router.patch("/{file_id}")
async def update_file(
    file_id: UUID,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
    expiry_minutes: int = None,
    password: str = None,
    max_downloads: int = None,
    description: str = None,
    notes: str = None,
    folder_id: UUID = None,
    is_public: bool = None,
    allow_comments: bool = None
):
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
    
    if expiry_minutes is not None:
        # Validate expiry based on user tier
        from app.core.plan_limits import get_plan_limits
        from app.models.user import UserTier
        plan_limits = get_plan_limits(current_user.tier)
        max_hours = plan_limits.get("max_expiration_hours", 24)
        max_minutes = max_hours * 60
        
        if expiry_minutes > max_minutes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Expiry time exceeds your plan limit of {max_hours} hours"
            )
        file.expires_at = datetime.now(timezone.utc) + timedelta(minutes=expiry_minutes)
    
    if password is not None:
        from app.core.security import get_password_hash
        file.password_hash = get_password_hash(password) if password else None
    
    if max_downloads is not None:
        file.max_downloads = max_downloads if max_downloads > 0 else None
    
    if description is not None:
        file.description = description
    
    if notes is not None:
        file.notes = notes
    
    if folder_id is not None:
        # Validate folder ownership
        if folder_id:
            from app.models.folder import Folder
            folder_result = await db.execute(
                select(Folder)
                .where(Folder.id == folder_id)
                .where(Folder.user_id == current_user.id)
            )
            folder = folder_result.scalar_one_or_none()
            if not folder:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Folder not found"
                )
        file.folder_id = folder_id
    
    if is_public is not None:
        file.is_public = is_public
    
    if allow_comments is not None:
        file.allow_comments = allow_comments
    
    await db.commit()
    await db.refresh(file)
    
    return FileInfo(
        id=file.id,
        original_filename=file.original_filename,
        file_size=file.file_size,
        mime_type=file.mime_type,
        short_code=file.short_code,
        expires_at=file.expires_at,
        download_count=file.download_count,
        max_downloads=file.max_downloads,
        created_at=file.created_at,
        has_password=bool(file.password_hash)
    )


@router.put("/{file_id}/replace", response_model=FileUploadResponse)
async def replace_file(
    file_id: UUID,
    file: UploadFile = FastAPIFile(...),
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
    keep_versions: bool = True
):
    """Replace an existing file with a new version"""
    # Get the original file
    result = await db.execute(
        select(File)
        .where(File.id == file_id)
        .where(File.user_id == current_user.id)
    )
    original_file = result.scalar_one_or_none()
    
    if not original_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Read new file content
    file_content = await file.read()
    file_size = len(file_content)
    
    # Validate file
    safe_filename = FilenameValidator.sanitize_filename(file.filename)
    is_valid, error_msg = FileValidator.validate_file(file_content, safe_filename, file.content_type)
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=error_msg
        )
    
    # Detect MIME type
    mime = magic.Magic(mime=True)
    mime_type = mime.from_buffer(file_content)
    
    # Generate new stored filename
    stored_filename = generate_stored_filename(safe_filename)
    
    # Upload new file to R2
    upload_success = await storage_service.upload_file(
        file_content,
        stored_filename,
        mime_type
    )
    
    if not upload_success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload new file"
        )
    
    # If keeping versions, create a new file entry as a version
    if keep_versions:
        new_version = File(
            user_id=current_user.id,
            folder_id=original_file.folder_id,
            original_filename=safe_filename,
            stored_filename=stored_filename,
            file_size=file_size,
            mime_type=mime_type,
            short_code=original_file.short_code,  # Keep same short code
            password_hash=original_file.password_hash,
            expires_at=original_file.expires_at,
            description=original_file.description,
            notes=original_file.notes,
            parent_file_id=original_file.parent_file_id or original_file.id,
            version=original_file.version + 1,
            is_public=original_file.is_public,
            allow_comments=original_file.allow_comments
        )
        
        db.add(new_version)
        
        # Mark old version as deleted (soft delete)
        original_file.deleted = True
        
        await db.commit()
        await db.refresh(new_version)
        
        return FileUploadResponse(
            id=new_version.id,
            short_code=new_version.short_code,
            download_url=f"/d/{new_version.short_code}",
            expires_at=new_version.expires_at,
            file_size=new_version.file_size,
            original_filename=new_version.original_filename
        )
    else:
        # Replace the file in-place
        # Delete old file from storage
        await storage_service.delete_file(original_file.stored_filename)
        
        # Update file record
        original_file.original_filename = safe_filename
        original_file.stored_filename = stored_filename
        original_file.file_size = file_size
        original_file.mime_type = mime_type
        original_file.version += 1
        
        await db.commit()
        await db.refresh(original_file)
        
        return FileUploadResponse(
            id=original_file.id,
            short_code=original_file.short_code,
            download_url=f"/d/{original_file.short_code}",
            expires_at=original_file.expires_at,
            file_size=original_file.file_size,
            original_filename=original_file.original_filename
        )


@router.delete("/expired/cleanup")
async def delete_expired_files(
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Delete all expired files for the current user"""
    now = datetime.now(timezone.utc)
    
    # Find all expired files for this user
    result = await db.execute(
        select(File)
        .where(
            and_(
                File.user_id == current_user.id,
                File.expires_at < now,
                File.deleted == False
            )
        )
    )
    expired_files = result.scalars().all()
    
    deleted_count = 0
    total_size_freed = 0
    
    for file in expired_files:
        try:
            # Delete from R2 storage
            await storage_service.delete_file(file.stored_filename)
            
            # Mark as deleted in database
            file.deleted = True
            deleted_count += 1
            total_size_freed += file.file_size
        except Exception as e:
            # Log error but continue with other files
            import logging
            logging.error(f"Error deleting expired file {file.id}: {e}")
            continue
    
    await db.commit()
    
    return {
        "deleted_count": deleted_count,
        "total_size_freed": total_size_freed,
        "message": f"Successfully deleted {deleted_count} expired files, freed {total_size_freed / (1024 * 1024):.2f} MB"
    }