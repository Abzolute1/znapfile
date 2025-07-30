"""Secure download endpoints with token-based authentication"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel
import asyncio

from app.db.base import get_db
from app.models.file import File, DownloadLog
from app.schemas.file import PublicFileInfo
from app.services.storage import storage_service
from app.core.security import verify_password
from app.core.rate_limiting import limiter, RATE_LIMITS
from app.core.download_tokens import get_download_token_manager
from app.core.captcha import MathCaptcha
from app.core.audit_log import security_auditor, AuditEventType
from app.core.config import settings

router = APIRouter()

# Initialize services
token_manager = get_download_token_manager(settings.get_secret_key)
captcha_service = MathCaptcha(settings.get_secret_key)

class PasswordVerifyRequest(BaseModel):
    password: str
    captcha_id: Optional[str] = None
    captcha_answer: Optional[str] = None

class PasswordVerifyResponse(BaseModel):
    download_token: str
    expires_in: int = 60  # seconds

class CaptchaRequiredResponse(BaseModel):
    captcha_required: bool = True
    captcha_id: str
    captcha_question: str
    attempts_remaining: int

@router.post("/{code}/verify-password", response_model=PasswordVerifyResponse)
@limiter.limit(RATE_LIMITS["password_attempt"])
async def verify_file_password(
    code: str,
    request: Request,
    data: PasswordVerifyRequest,
    db: AsyncSession = Depends(get_db)
):
    """Verify password and get secure download token"""
    # Get file
    result = await db.execute(
        select(File)
        .where(File.short_code == code)
        .where(File.deleted == False)
    )
    file = result.scalar_one_or_none()
    
    if not file:
        await security_auditor.log_event(
            db,
            AuditEventType.UNAUTHORIZED_ACCESS,
            request.client.host,
            details={"reason": "Invalid file code", "code": code},
            severity="warning"
        )
        raise HTTPException(status_code=404, detail="File not found")
    
    # Check if file requires password
    if not file.password_hash:
        raise HTTPException(status_code=400, detail="File does not require password")
    
    # Check if CAPTCHA is required (after 3 failed attempts)
    if file.failed_password_attempts >= 3:
        if not data.captcha_id or not data.captcha_answer:
            # Generate and return CAPTCHA
            captcha_id, question = captcha_service.generate_captcha()
            attempts_remaining = file.max_password_attempts - file.failed_password_attempts if file.max_password_attempts else 999
            
            raise HTTPException(
                status_code=428,  # Precondition Required
                detail={
                    "captcha_required": True,
                    "captcha_id": captcha_id,
                    "captcha_question": question,
                    "attempts_remaining": attempts_remaining
                }
            )
        
        # Verify CAPTCHA
        if not captcha_service.verify_captcha(data.captcha_id, data.captcha_answer):
            await security_auditor.log_event(
                db,
                AuditEventType.CAPTCHA_FAILED,
                request.client.host,
                resource_id=file.id,
                details={"file_code": code},
                severity="warning"
            )
            raise HTTPException(status_code=400, detail="Invalid CAPTCHA answer")
    
    # Check if max attempts exceeded
    if file.max_password_attempts and file.failed_password_attempts >= file.max_password_attempts:
        await security_auditor.log_event(
            db,
            AuditEventType.FILE_LOCKED,
            request.client.host,
            resource_id=file.id,
            details={"reason": "Max password attempts exceeded"},
            severity="critical"
        )
        raise HTTPException(status_code=403, detail="File is locked due to too many failed attempts")
    
    # Verify password
    if not verify_password(data.password, file.password_hash):
        # Increment failed attempts
        file.failed_password_attempts += 1
        await db.commit()
        
        # Log failed attempt
        await security_auditor.log_event(
            db,
            AuditEventType.PASSWORD_ATTEMPT_FAILED,
            request.client.host,
            resource_id=file.id,
            details={"attempts": file.failed_password_attempts},
            severity="warning"
        )
        
        # Add delay to prevent brute force
        await asyncio.sleep(2 ** min(file.failed_password_attempts, 5))  # Exponential backoff up to 32 seconds
        
        attempts_remaining = file.max_password_attempts - file.failed_password_attempts if file.max_password_attempts else 999
        
        # Check if CAPTCHA needed for next attempt
        if file.failed_password_attempts >= 3:
            captcha_id, question = captcha_service.generate_captcha()
            raise HTTPException(
                status_code=428,
                detail={
                    "captcha_required": True,
                    "captcha_id": captcha_id,
                    "captcha_question": question,
                    "attempts_remaining": attempts_remaining,
                    "error": "Incorrect password"
                }
            )
        
        raise HTTPException(
            status_code=401,
            detail=f"Incorrect password. {attempts_remaining} attempts remaining."
        )
    
    # Password correct - reset failed attempts
    file.failed_password_attempts = 0
    await db.commit()
    
    # Create download token
    download_token = token_manager.create_download_token(
        file_id=str(file.id),
        user_ip=request.client.host,
        password_verified=True
    )
    
    # Log successful verification
    await security_auditor.log_event(
        db,
        AuditEventType.FILE_DOWNLOAD,
        request.client.host,
        resource_id=file.id,
        details={"password_verified": True}
    )
    
    return PasswordVerifyResponse(
        download_token=download_token,
        expires_in=60
    )

@router.get("/{code}/download-with-token")
async def download_with_token(
    code: str,
    token: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Download file using secure token"""
    # Get file
    result = await db.execute(
        select(File)
        .where(File.short_code == code)
        .where(File.deleted == False)
    )
    file = result.scalar_one_or_none()
    
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Verify token
    if not token_manager.verify_download_token(token, str(file.id), request.client.host):
        await security_auditor.log_event(
            db,
            AuditEventType.TOKEN_REUSE,
            request.client.host,
            resource_id=file.id,
            details={"reason": "Invalid or expired token"},
            severity="warning"
        )
        raise HTTPException(status_code=403, detail="Invalid or expired download token")
    
    # Check expiry
    expires_at = file.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="File has expired")
    
    # Check download limit
    if file.max_downloads and file.download_count >= file.max_downloads:
        raise HTTPException(status_code=410, detail="Download limit exceeded")
    
    # Update download count
    file.download_count += 1
    
    # Log download
    download_log = DownloadLog(
        file_id=file.id,
        download_ip=request.client.host,
        user_agent=request.headers.get("user-agent")
    )
    db.add(download_log)
    await db.commit()
    
    # Get download URL from storage
    download_url = await storage_service.get_download_url(
        file.storage_path,
        file.original_filename,
        inline=False
    )
    
    # Return download URL (frontend will redirect)
    return {"download_url": download_url}

@router.post("/{code}/initiate-download")
async def initiate_secure_download(
    code: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Initiate download for non-password files"""
    # Get file
    result = await db.execute(
        select(File)
        .where(File.short_code == code)
        .where(File.deleted == False)
    )
    file = result.scalar_one_or_none()
    
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    # If password protected, require password verification first
    if file.password_hash:
        raise HTTPException(
            status_code=401,
            detail="This file requires password verification"
        )
    
    # Check expiry
    expires_at = file.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="File has expired")
    
    # Check download limit
    if file.max_downloads and file.download_count >= file.max_downloads:
        raise HTTPException(status_code=410, detail="Download limit exceeded")
    
    # Create download token
    download_token = token_manager.create_download_token(
        file_id=str(file.id),
        user_ip=request.client.host,
        password_verified=False
    )
    
    return {
        "download_token": download_token,
        "expires_in": 60
    }