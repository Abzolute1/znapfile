from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Any
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4
import json

from app.db.base import get_db
from app.models.user import User
from app.models.file import File
from app.api.deps import require_user
from app.core.config import settings
from app.services.storage import storage_service
from app.schemas.multipart_upload import (
    InitiateMultipartUploadRequest,
    InitiateMultipartUploadResponse,
    GetUploadUrlRequest,
    GetUploadUrlResponse,
    CompleteMultipartUploadRequest,
    CompleteMultipartUploadResponse,
    UploadSessionResponse
)
from app.utils.files import generate_short_code

router = APIRouter()

# Store active upload sessions (in production, use Redis)
upload_sessions = {}


@router.post("/initiate", response_model=InitiateMultipartUploadResponse)
async def initiate_multipart_upload(
    request: InitiateMultipartUploadRequest,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    """Initiate a multipart upload session"""
    # Validate file size against user limits
    plan_limits = {
        "free": 100 * 1024 * 1024,  # 100MB
        "pro": 10 * 1024 * 1024 * 1024,  # 10GB
        "max": 1024 * 1024 * 1024 * 1024  # 1TB
    }
    
    max_size = plan_limits.get(current_user.tier.value, plan_limits["free"])
    if request.file_size > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds your plan limit of {max_size / (1024**3):.1f}GB"
        )
    
    # Generate upload session ID
    session_id = str(uuid4())
    
    # Calculate chunk info
    chunk_size = 100 * 1024 * 1024  # 100MB chunks
    total_chunks = (request.file_size + chunk_size - 1) // chunk_size
    
    # Generate stored filename
    stored_filename = f"{int(datetime.now().timestamp())}_{uuid4().hex[:16]}"
    if request.filename:
        ext = request.filename.split('.')[-1] if '.' in request.filename else ''
        if ext:
            stored_filename += f".{ext}"
    
    # Initiate multipart upload with R2
    if hasattr(storage_service, 'initiate_multipart_upload'):
        upload_id = await storage_service.initiate_multipart_upload(
            stored_filename,
            request.content_type or 'application/octet-stream'
        )
    else:
        # Mock implementation
        upload_id = f"mock_upload_{uuid4().hex[:8]}"
    
    # Store session info
    session_data = {
        "session_id": session_id,
        "user_id": str(current_user.id),
        "upload_id": upload_id,
        "filename": request.filename,
        "stored_filename": stored_filename,
        "file_size": request.file_size,
        "content_type": request.content_type,
        "chunk_size": chunk_size,
        "total_chunks": total_chunks,
        "completed_chunks": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "metadata": request.metadata or {}
    }
    
    upload_sessions[session_id] = session_data
    
    return InitiateMultipartUploadResponse(
        session_id=session_id,
        upload_id=upload_id,
        chunk_size=chunk_size,
        total_chunks=total_chunks,
        expires_at=session_data["expires_at"]
    )


@router.post("/get-upload-url", response_model=GetUploadUrlResponse)
async def get_chunk_upload_url(
    request: GetUploadUrlRequest,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a presigned URL for uploading a specific chunk"""
    # Validate session
    session = upload_sessions.get(request.session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Upload session not found or expired"
        )
    
    if session["user_id"] != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Check if chunk already uploaded
    if request.chunk_number in session["completed_chunks"]:
        return GetUploadUrlResponse(
            upload_url="",
            already_uploaded=True
        )
    
    # Generate presigned URL for chunk
    if hasattr(storage_service, 'generate_multipart_upload_url'):
        upload_url = await storage_service.generate_multipart_upload_url(
            session["stored_filename"],
            session["upload_id"],
            request.chunk_number,
            expires_in=3600  # 1 hour
        )
    else:
        # Mock implementation
        upload_url = f"http://localhost:8000/mock-upload/{request.session_id}/{request.chunk_number}"
    
    return GetUploadUrlResponse(
        upload_url=upload_url,
        already_uploaded=False
    )


@router.post("/complete-chunk")
async def complete_chunk_upload(
    session_id: str,
    chunk_number: int,
    etag: str,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark a chunk as successfully uploaded"""
    # Validate session
    session = upload_sessions.get(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Upload session not found"
        )
    
    if session["user_id"] != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Record chunk completion
    if chunk_number not in session["completed_chunks"]:
        session["completed_chunks"].append(chunk_number)
        session["chunk_etags"] = session.get("chunk_etags", {})
        session["chunk_etags"][str(chunk_number)] = etag
    
    return {
        "success": True,
        "completed_chunks": len(session["completed_chunks"]),
        "total_chunks": session["total_chunks"]
    }


@router.post("/complete", response_model=CompleteMultipartUploadResponse)
async def complete_multipart_upload(
    request: CompleteMultipartUploadRequest,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    """Complete the multipart upload and create the file record"""
    # Validate session
    session = upload_sessions.get(request.session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Upload session not found"
        )
    
    if session["user_id"] != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Verify all chunks uploaded
    if len(session["completed_chunks"]) != session["total_chunks"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Upload incomplete. {len(session['completed_chunks'])}/{session['total_chunks']} chunks uploaded"
        )
    
    # Complete multipart upload with R2
    if hasattr(storage_service, 'complete_multipart_upload'):
        parts = [
            {
                'PartNumber': i + 1,
                'ETag': session["chunk_etags"].get(str(i), f"mock-etag-{i}")
            }
            for i in range(session["total_chunks"])
        ]
        
        success = await storage_service.complete_multipart_upload(
            session["stored_filename"],
            session["upload_id"],
            parts
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to complete upload"
            )
    
    # Create file record in database
    file = File(
        user_id=current_user.id,
        original_filename=session["filename"],
        stored_filename=session["stored_filename"],
        storage_key=session["stored_filename"],
        storage_bucket=settings.R2_BUCKET,
        file_size=session["file_size"],
        mime_type=session["content_type"],
        short_code=request.short_code or generate_short_code(),
        password_hash=None,  # Set separately if needed
        expires_at=datetime.now(timezone.utc) + timedelta(hours=request.expiration_hours),
        max_downloads=request.max_downloads,
        description=request.description,
        is_public=request.is_public,
        metadata=session["metadata"]
    )
    
    db.add(file)
    await db.commit()
    await db.refresh(file)
    
    # Clean up session
    del upload_sessions[request.session_id]
    
    return CompleteMultipartUploadResponse(
        file_id=file.id,
        short_code=file.short_code,
        download_url=f"/d/{file.short_code}",
        expires_at=file.expires_at
    )


@router.get("/sessions", response_model=List[UploadSessionResponse])
async def get_upload_sessions(
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all active upload sessions for the current user"""
    user_sessions = []
    
    # Clean up expired sessions
    now = datetime.now(timezone.utc)
    expired_sessions = []
    
    for session_id, session in upload_sessions.items():
        expires_at = datetime.fromisoformat(session["expires_at"].replace('Z', '+00:00'))
        if expires_at < now:
            expired_sessions.append(session_id)
        elif session["user_id"] == str(current_user.id):
            user_sessions.append(
                UploadSessionResponse(
                    session_id=session_id,
                    filename=session["filename"],
                    file_size=session["file_size"],
                    total_chunks=session["total_chunks"],
                    completed_chunks=len(session["completed_chunks"]),
                    created_at=session["created_at"],
                    expires_at=session["expires_at"]
                )
            )
    
    # Remove expired sessions
    for session_id in expired_sessions:
        del upload_sessions[session_id]
    
    return user_sessions


@router.delete("/sessions/{session_id}")
async def cancel_upload_session(
    session_id: str,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    """Cancel an upload session"""
    session = upload_sessions.get(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Upload session not found"
        )
    
    if session["user_id"] != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Abort multipart upload with R2
    if hasattr(storage_service, 'abort_multipart_upload'):
        await storage_service.abort_multipart_upload(
            session["stored_filename"],
            session["upload_id"]
        )
    
    # Remove session
    del upload_sessions[session_id]
    
    return {"success": True, "message": "Upload session cancelled"}