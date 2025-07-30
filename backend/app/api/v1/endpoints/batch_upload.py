from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File as FastAPIFile, Request, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta
from typing import Optional, List
from app.db.base import get_db
from app.models.file import File
from app.models.folder import Folder
from app.models.user import User
from app.schemas.file import FileUploadResponse
from app.schemas.batch import BatchUploadResponse, BatchUploadProgress
from app.api.deps import get_current_user
from app.services.storage import storage_service
from app.utils.files import generate_short_code, generate_stored_filename
from app.core.config import settings
from app.core.security import get_password_hash
from app.core.validators import FileValidator, FilenameValidator
from app.core.rate_limiting import limiter, RATE_LIMITS
import magic
import asyncio
import json
import zipfile
import io
import os

router = APIRouter()


@router.post("/batch", response_model=BatchUploadResponse)
@limiter.limit(RATE_LIMITS["upload_authenticated"])
async def upload_batch(
    files: List[UploadFile] = FastAPIFile(...),
    request: Request = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    folder_id: Optional[str] = Form(None),
    password: Optional[str] = Form(None),
    expiry_minutes: int = Form(30),
    description: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),  # Comma-separated tags
):
    """Upload multiple files at once"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    # Validate folder ownership if provided
    target_folder = None
    if folder_id:
        result = await db.execute(
            select(Folder)
            .where(Folder.id == folder_id)
            .where(Folder.user_id == current_user.id)
        )
        target_folder = result.scalar_one_or_none()
        if not target_folder:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Folder not found"
            )
    
    # Parse tags
    tag_list = [t.strip() for t in tags.split(",")] if tags else []
    
    # Check limits
    from app.api.v1.endpoints.upload import get_user_limits
    limits = get_user_limits(current_user)
    
    if len(files) > 100:  # Max 100 files at once
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 100 files per batch"
        )
    
    # Track results
    uploaded_files = []
    failed_files = []
    total_size = 0
    
    for idx, file in enumerate(files):
        try:
            # Sanitize filename
            safe_filename = FilenameValidator.sanitize_filename(file.filename)
            
            # Read file content
            file_content = await file.read()
            file_size = len(file_content)
            total_size += file_size
            
            # Validate file size
            if file_size > limits["file_size_limit"]:
                failed_files.append({
                    "filename": file.filename,
                    "error": f"File too large. Maximum size: {limits['file_size_limit'] / 1024 / 1024}MB"
                })
                continue
            
            # Validate file type
            is_valid, error_msg = FileValidator.validate_file(file_content, safe_filename, file.content_type)
            if not is_valid:
                failed_files.append({
                    "filename": file.filename,
                    "error": error_msg
                })
                continue
            
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
                failed_files.append({
                    "filename": file.filename,
                    "error": "Failed to upload file"
                })
                continue
            
            # Create database entry
            new_file = File(
                user_id=current_user.id,
                folder_id=target_folder.id if target_folder else None,
                original_filename=safe_filename,
                stored_filename=stored_filename,
                file_size=file_size,
                mime_type=mime_type,
                short_code=short_code,
                password_hash=get_password_hash(password) if password else None,
                expires_at=datetime.utcnow() + timedelta(minutes=expiry_minutes),
                description=description if idx == 0 else None,  # Apply description to first file only
            )
            
            db.add(new_file)
            await db.flush()  # Get the file ID
            
            # Add tags if provided
            if tag_list and idx == 0:  # Apply tags to first file only for now
                from app.models.folder import Tag, file_tags
                for tag_name in tag_list:
                    # Find or create tag
                    tag_result = await db.execute(
                        select(Tag)
                        .where(Tag.user_id == current_user.id)
                        .where(Tag.name == tag_name)
                    )
                    tag = tag_result.scalar_one_or_none()
                    
                    if not tag:
                        tag = Tag(user_id=current_user.id, name=tag_name)
                        db.add(tag)
                        await db.flush()
                    
                    # Associate tag with file
                    await db.execute(
                        file_tags.insert().values(file_id=new_file.id, tag_id=tag.id)
                    )
            
            uploaded_files.append(FileUploadResponse(
                id=new_file.id,
                short_code=new_file.short_code,
                download_url=f"/d/{new_file.short_code}",
                expires_at=new_file.expires_at,
                file_size=new_file.file_size,
                original_filename=new_file.original_filename
            ))
            
        except Exception as e:
            failed_files.append({
                "filename": file.filename,
                "error": str(e)
            })
    
    # Check total storage
    storage_result = await db.execute(
        select(func.sum(File.file_size))
        .where(File.user_id == current_user.id)
        .where(File.expires_at > datetime.utcnow())
        .where(File.deleted == False)
    )
    current_storage = storage_result.scalar() or 0
    
    if current_storage + total_size > limits["storage_limit"]:
        raise HTTPException(
            status_code=status.HTTP_507_INSUFFICIENT_STORAGE,
            detail=f"Storage limit exceeded"
        )
    
    await db.commit()
    
    return BatchUploadResponse(
        uploaded_files=uploaded_files,
        failed_files=failed_files,
        total_uploaded=len(uploaded_files),
        total_failed=len(failed_files)
    )


@router.post("/folder", response_model=BatchUploadResponse)
@limiter.limit(RATE_LIMITS["upload_authenticated"])
async def upload_folder(
    file: UploadFile = FastAPIFile(...),
    request: Request = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    parent_folder_id: Optional[str] = Form(None),
    password: Optional[str] = Form(None),
    expiry_minutes: int = Form(30),
    preserve_structure: bool = Form(True),
):
    """Upload a ZIP file and preserve folder structure"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    # Validate ZIP file
    if not file.filename.lower().endswith('.zip'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only ZIP files are supported for folder upload"
        )
    
    # Read ZIP content
    zip_content = await file.read()
    
    # Track results
    uploaded_files = []
    failed_files = []
    created_folders = {}
    
    try:
        with zipfile.ZipFile(io.BytesIO(zip_content)) as zf:
            # Extract folder name from ZIP
            root_folder_name = os.path.splitext(file.filename)[0]
            
            # Create root folder
            root_folder = Folder(
                user_id=current_user.id,
                parent_id=parent_folder_id,
                name=root_folder_name,
                path=f"/{root_folder_name}"
            )
            db.add(root_folder)
            await db.flush()
            
            created_folders[""] = root_folder.id
            
            # Process each file in ZIP
            for zip_info in zf.filelist:
                if zip_info.is_dir():
                    continue
                
                # Extract file path components
                file_path = zip_info.filename
                path_parts = file_path.split('/')
                filename = path_parts[-1]
                folder_path = '/'.join(path_parts[:-1])
                
                # Create folder structure if preserving
                current_folder_id = root_folder.id
                if preserve_structure and folder_path:
                    current_path = ""
                    for folder_name in path_parts[:-1]:
                        current_path = f"{current_path}/{folder_name}" if current_path else folder_name
                        
                        if current_path not in created_folders:
                            # Find parent folder ID
                            parent_path = '/'.join(current_path.split('/')[:-1])
                            parent_id = created_folders.get(parent_path, root_folder.id)
                            
                            # Create folder
                            new_folder = Folder(
                                user_id=current_user.id,
                                parent_id=parent_id,
                                name=folder_name,
                                path=f"/{root_folder_name}/{current_path}"
                            )
                            db.add(new_folder)
                            await db.flush()
                            
                            created_folders[current_path] = new_folder.id
                        
                        current_folder_id = created_folders[current_path]
                
                # Extract and upload file
                try:
                    file_content = zf.read(zip_info)
                    
                    # Validate file
                    safe_filename = FilenameValidator.sanitize_filename(filename)
                    is_valid, error_msg = FileValidator.validate_file(file_content, safe_filename, None)
                    
                    if not is_valid:
                        failed_files.append({
                            "filename": file_path,
                            "error": error_msg
                        })
                        continue
                    
                    # Detect MIME type
                    mime = magic.Magic(mime=True)
                    mime_type = mime.from_buffer(file_content)
                    
                    # Generate identifiers
                    short_code = generate_short_code()
                    stored_filename = generate_stored_filename(safe_filename)
                    
                    # Upload to R2
                    upload_success = await storage_service.upload_file(
                        file_content,
                        stored_filename,
                        mime_type
                    )
                    
                    if not upload_success:
                        failed_files.append({
                            "filename": file_path,
                            "error": "Failed to upload file"
                        })
                        continue
                    
                    # Create file entry
                    new_file = File(
                        user_id=current_user.id,
                        folder_id=current_folder_id,
                        original_filename=safe_filename,
                        stored_filename=stored_filename,
                        file_size=len(file_content),
                        mime_type=mime_type,
                        short_code=short_code,
                        password_hash=get_password_hash(password) if password else None,
                        expires_at=datetime.utcnow() + timedelta(minutes=expiry_minutes),
                    )
                    
                    db.add(new_file)
                    
                    uploaded_files.append(FileUploadResponse(
                        id=new_file.id,
                        short_code=new_file.short_code,
                        download_url=f"/d/{new_file.short_code}",
                        expires_at=new_file.expires_at,
                        file_size=new_file.file_size,
                        original_filename=new_file.original_filename
                    ))
                    
                except Exception as e:
                    failed_files.append({
                        "filename": file_path,
                        "error": str(e)
                    })
            
            await db.commit()
            
    except zipfile.BadZipFile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ZIP file"
        )
    
    return BatchUploadResponse(
        uploaded_files=uploaded_files,
        failed_files=failed_files,
        total_uploaded=len(uploaded_files),
        total_failed=len(failed_files),
        root_folder_id=root_folder.id
    )