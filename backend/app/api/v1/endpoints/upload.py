from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File as FastAPIFile, Request, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta, timezone
from typing import Optional
from app.db.base import get_db
from app.models.file import File
from app.models.user import User, UserTier
from app.schemas.file import FileUploadResponse
from app.api.deps import get_current_user
from app.services.storage import storage_service
from app.utils.files import generate_short_code, generate_stored_filename
from app.core.config import settings
from app.core.security import get_password_hash
from app.core.validators import FileValidator, FilenameValidator
from app.core.rate_limiting import limiter, RATE_LIMITS
from app.core.plan_limits import get_plan_limits
from app.core.virus_scanner import virus_scanner
from app.core.streaming import StreamingFileHandler, ChunkedStorageUploader
import magic
import os
import aiofiles

router = APIRouter()


async def check_user_limits(
    user: User, 
    file_size: int, 
    db: AsyncSession
) -> None:
    """Check if user can upload based on their plan limits"""
    
    plan_limits = get_plan_limits(user.tier)
    
    # Check file size limit
    if file_size > plan_limits["max_file_size_bytes"]:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds your plan limit of {plan_limits['max_file_size_bytes'] / (1024**3):.0f}GB"
        )
    
    # Check email verification requirement
    if plan_limits["requires_email_verification"] and not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email address before uploading files"
        )
    
    # Check daily transfer limit
    if plan_limits["daily_transfer_limit"]:
        # Count uploads in the last 24 hours
        twenty_four_hours_ago = datetime.now(timezone.utc) - timedelta(hours=24)
        result = await db.execute(
            select(func.count(File.id))
            .where(File.user_id == user.id)
            .where(File.created_at > twenty_four_hours_ago)
        )
        daily_uploads = result.scalar() or 0
        
        if daily_uploads >= plan_limits["daily_transfer_limit"]:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Daily upload limit of {plan_limits['daily_transfer_limit']} files reached"
            )
    
    # Check monthly transfer limit
    # Get start of current month
    now = datetime.now(timezone.utc)
    month_start = datetime(now.year, now.month, 1)
    
    result = await db.execute(
        select(func.sum(File.file_size))
        .where(File.user_id == user.id)
        .where(File.created_at >= month_start)
    )
    monthly_usage = result.scalar() or 0
    
    if monthly_usage + file_size > plan_limits["monthly_transfer_bytes"]:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Monthly transfer limit reached. Upgrade to upload more files."
        )
    
    # Check active storage limit (if applicable)
    if plan_limits["active_storage_bytes"] > 0:
        result = await db.execute(
            select(func.sum(File.file_size))
            .where(File.user_id == user.id)
            .where(File.expires_at > datetime.now(timezone.utc))
            .where(File.deleted == False)
        )
        active_storage = result.scalar() or 0
        
        if active_storage + file_size > plan_limits["active_storage_bytes"]:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Active storage limit reached. Delete some files or wait for them to expire."
            )


@router.post("/anonymous", response_model=FileUploadResponse)
@limiter.limit(RATE_LIMITS["upload_anonymous"])
async def upload_anonymous(
    file: UploadFile = FastAPIFile(...),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
    password: Optional[str] = Form(default=None),
    expiry_minutes: int = 30,
):
    # Anonymous uploads are disabled - users must sign up
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Please sign up or log in to upload files"
    )
    limits = get_user_limits(None)
    
    # Sanitize filename
    safe_filename = FilenameValidator.sanitize_filename(file.filename)
    
    # Read file content
    file_content = await file.read()
    file_size = len(file_content)
    
    # Validate file size
    if file_size > limits["file_size_limit"]:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size: {limits['file_size_limit'] / 1024 / 1024}MB"
        )
    
    # Validate file type and content
    is_valid, error_msg = FileValidator.validate_file(file_content, safe_filename, file.content_type)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=error_msg
        )
    
    # Virus scan
    is_clean, threat_name = await virus_scanner.scan_file(file_content, safe_filename)
    if not is_clean:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"File rejected: Virus detected ({threat_name})"
        )
    
    # Check IP-based daily upload limit
    client_ip = request.client.host
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    upload_count_result = await db.execute(
        select(func.count(File.id))
        .where(File.upload_ip == client_ip)
        .where(File.created_at >= today_start)
        .where(File.user_id.is_(None))
    )
    upload_count = upload_count_result.scalar()
    
    if upload_count >= limits["daily_upload_limit"]:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Daily upload limit exceeded"
        )
    
    # Check concurrent files
    active_files_result = await db.execute(
        select(func.count(File.id))
        .where(File.upload_ip == client_ip)
        .where(File.expires_at > datetime.now(timezone.utc))
        .where(File.deleted == False)
        .where(File.user_id.is_(None))
    )
    active_files = active_files_result.scalar()
    
    if active_files >= limits["concurrent_files"]:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Maximum {limits['concurrent_files']} active files allowed"
        )
    
    # Detect MIME type
    mime = magic.Magic(mime=True)
    mime_type = mime.from_buffer(file_content)
    
    # Generate file identifiers
    short_code = generate_short_code()
    stored_filename = generate_stored_filename(safe_filename)
    
    # Upload to R2
    upload_success = await storage_service.upload_file(
        file_content, 
        stored_filename, 
        mime_type
    )
    
    if not upload_success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload file"
        )
    
    # Create database entry
    new_file = File(
        original_filename=safe_filename,
        stored_filename=stored_filename,
        file_size=file_size,
        mime_type=mime_type,
        upload_ip=client_ip,
        short_code=short_code,
        password_hash=get_password_hash(password) if password else None,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=expiry_minutes),
    )
    
    db.add(new_file)
    await db.commit()
    await db.refresh(new_file)
    
    return FileUploadResponse(
        id=new_file.id,
        short_code=new_file.short_code,
        download_url=f"/d/{new_file.short_code}",
        expires_at=new_file.expires_at,
        file_size=new_file.file_size,
        original_filename=new_file.original_filename
    )


@router.post("/", response_model=FileUploadResponse)
@limiter.limit(RATE_LIMITS["upload_authenticated"])
async def upload_authenticated(
    file: UploadFile = FastAPIFile(...),
    request: Request = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    password: Optional[str] = Form(default=None),
    max_password_attempts: Optional[int] = Form(default=10),
    expiry_minutes: int = Form(30),
    max_downloads: Optional[int] = Form(None),
    # Preview redaction options
    enable_preview_redaction: bool = Form(default=False),
    preview_line_start: Optional[int] = Form(default=None),
    preview_line_end: Optional[int] = Form(default=None),
    preview_redaction_patterns: Optional[str] = Form(default=None),  # JSON string
    preview_blur_images: bool = Form(default=False),
    # Watermark options
    watermark_enabled: bool = Form(default=False),
    watermark_text: Optional[str] = Form(default=None),
):
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    # Get plan limits
    plan_limits = get_plan_limits(current_user.tier)
    
    # Validate expiry time
    max_expiry_minutes = plan_limits["max_expiration_hours"] * 60
    if expiry_minutes > max_expiry_minutes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Expiry time exceeds your plan limit of {plan_limits['max_expiration_hours']} hours"
        )
    
    # Sanitize filename
    safe_filename = FilenameValidator.sanitize_filename(file.filename)
    
    # Stream file to temporary storage to prevent memory DoS
    temp_path = None
    try:
        # Get file size limit for user's plan
        file_size_limit = plan_limits["max_file_size_bytes"]
        
        # Process upload stream
        temp_path, file_size, mime_type, first_chunk = await StreamingFileHandler.process_upload_stream(
            file,
            file_size_limit
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=str(e)
        )
    
    try:
        # Check user limits with actual file size
        await check_user_limits(current_user, file_size, db)
        
        # Validate file type using streaming validation
        is_valid, error_msg = await StreamingFileHandler.validate_file_stream(
            temp_path, safe_filename, mime_type, first_chunk
        )
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=error_msg
            )
        
        # For small files, do virus scan
        if file_size < StreamingFileHandler.MAX_MEMORY_SIZE:
            async with aiofiles.open(temp_path, 'rb') as f:
                file_content = await f.read()
            is_clean, threat_name = await virus_scanner.scan_file(file_content, safe_filename)
            if not is_clean:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"File rejected: Virus detected ({threat_name})"
                )
        
        # Generate file identifiers
        short_code = generate_short_code()
        stored_filename = generate_stored_filename(safe_filename)
        
        # Upload to R2 using appropriate method based on size
        upload_success = await ChunkedStorageUploader.upload_from_temp_file(
            storage_service,
            temp_path,
            stored_filename,
            mime_type
        )
        
        if not upload_success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload file"
            )
        
        # Create database entry
        new_file = File(
            user_id=current_user.id,
            original_filename=safe_filename,
            stored_filename=stored_filename,
            file_size=file_size,
            mime_type=mime_type,
            short_code=short_code,
            password_hash=get_password_hash(password) if password else None,
            max_password_attempts=max_password_attempts if password else None,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=expiry_minutes),
            max_downloads=max_downloads,
            # Preview redaction settings
            preview_redaction_enabled=enable_preview_redaction,
            preview_line_start=preview_line_start if enable_preview_redaction else None,
            preview_line_end=preview_line_end if enable_preview_redaction else None,
            preview_redaction_patterns=preview_redaction_patterns if enable_preview_redaction else None,
            preview_blur_images=preview_blur_images if enable_preview_redaction else False,
            # Watermark settings
            watermark_enabled=watermark_enabled,
            watermark_text=watermark_text or "ZnapFile"
        )
        
        db.add(new_file)
        
        # Update user's monthly transfer usage
        current_user.monthly_transfer_used = (current_user.monthly_transfer_used or 0) + file_size
        
        await db.commit()
        await db.refresh(new_file)
        
        return FileUploadResponse(
            id=new_file.id,
            short_code=new_file.short_code,
            download_url=f"/d/{new_file.short_code}",
            expires_at=new_file.expires_at,
            file_size=new_file.file_size,
            original_filename=new_file.original_filename
        )
    finally:
        # Always cleanup temp file
        if temp_path:
            StreamingFileHandler.cleanup_temp_file(temp_path)