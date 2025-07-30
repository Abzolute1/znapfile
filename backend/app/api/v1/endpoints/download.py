from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.responses import RedirectResponse, FileResponse, StreamingResponse, Response as FastAPIResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
from typing import Optional
import re
import asyncio
import os
import json
import io
import random
from app.db.base import get_db
from app.models.file import File, DownloadLog
from app.schemas.file import DownloadRequest, FileInfo, PublicFileInfo
from pydantic import BaseModel
from app.services.storage import storage_service
from app.core.security import verify_password
from app.core.rate_limiting import limiter, RATE_LIMITS
from app.core.cors_utils import get_cors_headers
from app.core.abuse_prevention import AbuseDetector
from app.models.user import User, UserTier

router = APIRouter()


@router.get("/{code}/info", response_model=PublicFileInfo)
async def get_file_info(
    code: str,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(File)
        .where(File.short_code == code)
        .where(File.deleted == False)
    )
    file = result.scalar_one_or_none()
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Oops! This file has expired or doesn't exist"
        )
    
    # Handle both naive and aware datetimes
    expires_at = file.expires_at
    if expires_at.tzinfo is None:
        # Assume UTC for naive datetimes from database
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Oops! This file has expired"
        )
    
    return PublicFileInfo(
        original_filename=file.original_filename,
        file_size=file.file_size,
        mime_type=file.mime_type,
        expires_at=file.expires_at,
        download_count=file.download_count,
        max_downloads=file.max_downloads,
        has_password=bool(file.password_hash)
    )


@router.get("/{code}")
@limiter.limit(RATE_LIMITS["download"])
async def download_file(
    code: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    password: Optional[str] = None
):
    # Validate short code format (alphanumeric, underscore, hyphen)
    if not re.match(r'^[a-zA-Z0-9_-]+$', code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file code"
        )
    result = await db.execute(
        select(File)
        .where(File.short_code == code)
        .where(File.deleted == False)
    )
    file = result.scalar_one_or_none()
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Oops! This file has expired or doesn't exist"
        )
    
    # Handle both naive and aware datetimes
    expires_at = file.expires_at
    if expires_at.tzinfo is None:
        # Assume UTC for naive datetimes from database
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Oops! This file has expired"
        )
    
    # Check password if protected
    if file.password_hash:
        # Check if max password attempts exceeded
        if file.max_password_attempts and file.failed_password_attempts >= file.max_password_attempts:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Maximum password attempts ({file.max_password_attempts}) exceeded. This file is now locked."
            )
        
        # Treat empty strings as no password
        if not password or password.strip() == "":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="This file is password protected"
            )
        
        if not verify_password(password, file.password_hash):
            # Increment failed attempts
            file.failed_password_attempts += 1
            await db.commit()
            
            # Add delay to prevent brute force
            await asyncio.sleep(1)
            
            attempts_remaining = None
            if file.max_password_attempts:
                attempts_remaining = file.max_password_attempts - file.failed_password_attempts
            
            error_msg = "Incorrect password"
            if attempts_remaining is not None and attempts_remaining > 0:
                error_msg += f" ({attempts_remaining} attempts remaining)"
            elif attempts_remaining == 0:
                error_msg = "Incorrect password. This file is now locked."
            
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=error_msg
            )
    
    # Check download limit
    if file.max_downloads and file.download_count >= file.max_downloads:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Download limit exceeded"
        )
    
    # No bandwidth limits needed - R2 has free egress!
    # Still track downloads for analytics but don't block
    
    # Update download count and log in a separate query to avoid StaleDataError
    await db.execute(
        select(File).where(File.id == file.id).with_for_update()
    )
    file.download_count += 1
    file.bandwidth_used = (file.bandwidth_used or 0) + file.file_size
    file.last_download_at = datetime.now(timezone.utc)
    
    # Track unique downloaders (simplified - production should use Redis)
    client_ip = request.client.host
    if not file.unique_downloaders:
        file.unique_downloaders = 1
    else:
        # In production, use Redis set to track unique IPs properly
        # For now, increment conservatively
        if file.download_count % 5 == 0:  # Rough approximation
            file.unique_downloaders += 1
    
    download_log = DownloadLog(
        file_id=file.id,
        download_ip=client_ip,
        user_agent=request.headers.get("user-agent")
    )
    db.add(download_log)
    
    await db.commit()
    await db.refresh(file)
    
    # For mock storage, return the file directly
    if type(storage_service).__name__ == 'MockStorageService':
        file_path = os.path.join(storage_service.storage_path, file.stored_filename)
        if os.path.exists(file_path):
            return FileResponse(
                path=file_path,
                filename=file.original_filename,
                media_type='application/octet-stream'
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found in storage"
            )
    
    # For production storage, generate presigned URL
    download_url = storage_service.generate_presigned_download_url(
        file.stored_filename,
        file.original_filename,
        expires_in=3600  # 1 hour
    )
    
    if not download_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate download URL"
        )
    
    return RedirectResponse(url=download_url)


class SecureDownloadRequest(BaseModel):
    password: Optional[str] = None


@router.post("/{code}")
@limiter.limit(RATE_LIMITS["download"])
async def download_file_secure(
    code: str,
    request: Request,
    download_data: SecureDownloadRequest,
    db: AsyncSession = Depends(get_db)
):
    """Secure download endpoint that accepts password via POST body"""
    # Call the same logic as GET endpoint but with password from body
    return await download_file(code, request, db, download_data.password)


# Temporarily disabled - needs debugging
# @router.get("/{code}/preview")
# @limiter.limit(RATE_LIMITS["download"])
async def preview_file_disabled(
    code: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    password: Optional[str] = None,
    page: int = 1
):
    """Preview file inline (for images, PDFs, etc)"""
    # Validate short code format (alphanumeric, underscore, hyphen)
    if not re.match(r'^[a-zA-Z0-9_-]+$', code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file code"
        )
    result = await db.execute(
        select(File)
        .where(File.short_code == code)
        .where(File.deleted == False)
    )
    file = result.scalar_one_or_none()
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Oops! This file has expired or doesn't exist"
        )
    
    # Handle both naive and aware datetimes
    expires_at = file.expires_at
    if expires_at.tzinfo is None:
        # Assume UTC for naive datetimes from database
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Oops! This file has expired"
        )
    
    # Check password if protected
    if file.password_hash:
        # Check if max password attempts exceeded
        if file.max_password_attempts and file.failed_password_attempts >= file.max_password_attempts:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Maximum password attempts ({file.max_password_attempts}) exceeded. This file is now locked."
            )
        
        # Treat empty strings as no password
        if not password or password.strip() == "":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="This file is password protected"
            )
        
        if not verify_password(password, file.password_hash):
            # Increment failed attempts
            file.failed_password_attempts += 1
            await db.commit()
            
            # Add delay to prevent brute force
            await asyncio.sleep(1)
            
            attempts_remaining = None
            if file.max_password_attempts:
                attempts_remaining = file.max_password_attempts - file.failed_password_attempts
            
            error_msg = "Incorrect password"
            if attempts_remaining is not None and attempts_remaining > 0:
                error_msg += f" ({attempts_remaining} attempts remaining)"
            elif attempts_remaining == 0:
                error_msg = "Incorrect password. This file is now locked."
            
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=error_msg
            )
    
    # Determine content type for preview
    content_type = file.mime_type or 'application/octet-stream'
    
    # For mock storage, we need to decrypt the file first
    if type(storage_service).__name__ == 'MockStorageService':
        # Download and decrypt the file
        print(f"Preview: Downloading file {file.stored_filename}")
        try:
            file_content = await storage_service.download_file(file.stored_filename)
            if not file_content:
                print(f"Preview: File content is None for {file.stored_filename}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="File not found in storage"
                )
            print(f"Preview: Downloaded {len(file_content)} bytes, content_type: {content_type}")
        except Exception as e:
            print(f"Preview: Error downloading file: {str(e)}")
            import traceback
            traceback.print_exc()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to download file: {str(e)}"
            )
        
        # Check file extension for better mime type detection
        file_ext = file.original_filename.split('.')[-1].lower() if '.' in file.original_filename else ''
        
        # Fix mime types based on extension
        mime_type_map = {
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'svg': 'image/svg+xml',
            'bmp': 'image/bmp',
            'ico': 'image/x-icon',
            'pdf': 'application/pdf',
            'py': 'text/plain',
            'js': 'text/plain',
            'jsx': 'text/plain',
            'ts': 'text/plain',
            'tsx': 'text/plain',
            'java': 'text/plain',
            'cpp': 'text/plain',
            'c': 'text/plain',
            'h': 'text/plain',
            'css': 'text/plain',
            'html': 'text/plain',
            'xml': 'text/plain',
            'json': 'text/plain',
            'yaml': 'text/plain',
            'yml': 'text/plain',
            'md': 'text/plain',
            'txt': 'text/plain',
            'log': 'text/plain',
            'sh': 'text/plain',
            'bash': 'text/plain',
            # Config files
            'ini': 'text/plain',
            'conf': 'text/plain',
            'cfg': 'text/plain',
            'env': 'text/plain',
            # Data files
            'csv': 'text/plain',
            'sql': 'text/plain',
            # More languages
            'rb': 'text/plain',
            'php': 'text/plain',
            'go': 'text/plain',
            'rs': 'text/plain',
            'kt': 'text/plain',
            'swift': 'text/plain',
            'r': 'text/plain',
            'm': 'text/plain',
            'dart': 'text/plain',
            'lua': 'text/plain',
            'pl': 'text/plain',
            'vim': 'text/plain',
            # Special files
            'text': 'text/plain',
            'readme': 'text/plain',
            'license': 'text/plain',
            'makefile': 'text/plain',
            'dockerfile': 'text/plain',
            'gitignore': 'text/plain'
        }
        
        if file_ext in mime_type_map:
            content_type = mime_type_map[file_ext]
            print(f"Preview: Fixed content type to {content_type} based on extension {file_ext}")
        
        # Extended list of text file extensions for better support
        text_extensions = ['py', 'js', 'jsx', 'ts', 'tsx', 'java', 'cpp', 'c', 'h', 'css', 'html', 'xml', 'json', 
                          'yaml', 'yml', 'md', 'txt', 'log', 'sh', 'bash', 'ini', 'conf', 'cfg', 'csv', 'sql', 
                          'rb', 'php', 'go', 'rs', 'kt', 'swift', 'r', 'm', 'dart', 'lua', 'pl', 'vim', 'env',
                          'text', 'readme', 'license', 'makefile', 'dockerfile', 'gitignore']
        
        print(f"\n=== FILE PREVIEW DEBUG ===")
        print(f"File: {file.original_filename}")
        print(f"Extension: {file_ext}")
        print(f"Content type: {content_type}")
        print(f"Is text file: {content_type.startswith('text/') or content_type in ['application/json', 'application/javascript', 'application/xml'] or file_ext.lower() in text_extensions}")
        
        # For text/code files, return as text with preview limits
        if content_type.startswith('text/') or content_type in ['application/json', 'application/javascript', 'application/xml'] or file_ext.lower() in text_extensions:
            try:
                text_content = file_content.decode('utf-8')
                
                # Apply redaction if enabled
                print(f"\n=== REDACTION DEBUG ===")
                print(f"File: {file.original_filename}")
                print(f"Redaction enabled: {file.preview_redaction_enabled}")
                print(f"Redaction patterns: {file.preview_redaction_patterns}")
                print(f"Line start/end: {file.preview_line_start}/{file.preview_line_end}")
                
                if file.preview_redaction_enabled:
                    # Parse the patterns field which now contains both line ranges and patterns
                    line_ranges = []
                    patterns = []
                    
                    if file.preview_redaction_patterns:
                        try:
                            data = json.loads(file.preview_redaction_patterns)
                            print(f"Parsed redaction data: {data}")
                            if isinstance(data, dict):
                                line_ranges = data.get('lineRanges', [])
                                patterns = data.get('patterns', [])
                            elif isinstance(data, list):
                                # Legacy format - just patterns
                                patterns = data
                            print(f"Line ranges: {line_ranges}")
                            print(f"Patterns: {patterns}")
                        except Exception as e:
                            print(f"Error parsing redaction patterns: {e}")
                    
                    # Also check legacy line_start/line_end fields
                    lines = text_content.split('\n')
                    total_lines = len(lines)
                    total_size = len(text_content)
                    
                    if not line_ranges and (file.preview_line_start or file.preview_line_end):
                        line_ranges = [{
                            'start': file.preview_line_start or 1,
                            'end': file.preview_line_end or total_lines
                        }]
                    
                    # Apply line range redaction
                    print(f"Applying redaction with {len(line_ranges)} ranges")
                    # IMPORTANT: If no line ranges specified, don't redact anything!
                    if line_ranges and len(line_ranges) > 0:
                        # Create redacted content with magical blur
                        redacted_lines = []
                        for i, line in enumerate(lines):
                            line_number = i + 1
                            # Check if line is within any visible range
                            is_visible = any(
                                line_number >= r['start'] and line_number <= r['end'] 
                                for r in line_ranges
                            )
                            
                            if is_visible:
                                redacted_lines.append(line)
                            else:
                                # Create a beautiful blurred version of the line
                                if line.strip():  # Only blur non-empty lines
                                    # Mix the line with random blur characters for a magical effect
                                    blurred = ''
                                    for char in line:
                                        if char == ' ':
                                            blurred += ' '
                                        elif char in '\t\n':
                                            blurred += char
                                        else:
                                            # Use deterministic blur based on character
                                            blur_chars = '░▒▓'
                                            # Use character code to select blur char deterministically
                                            blurred += blur_chars[ord(char) % len(blur_chars)]
                                    redacted_lines.append(blurred)
                                else:
                                    redacted_lines.append(line)  # Keep empty lines as is
                        
                        text_content = '\n'.join(redacted_lines)
                        lines = redacted_lines
                    else:
                        # No line ranges specified - show everything
                        print("No line ranges specified - showing all content")
                    
                    # Apply pattern-based redaction with magical blur
                    if patterns:
                        try:
                            import re
                            import random
                            
                            def magical_blur(match):
                                """Create a deterministic blurred version of the matched text"""
                                text = match.group(0)
                                blur_chars = '●○◦•∙⋅'
                                # Preserve the length but use deterministic blur characters
                                return ''.join(blur_chars[ord(c) % len(blur_chars)] for c in text)
                            
                            for pattern in patterns:
                                # Replace matched patterns with magical blur
                                text_content = re.sub(
                                    pattern, 
                                    magical_blur, 
                                    text_content,
                                    flags=re.MULTILINE | re.IGNORECASE
                                )
                        except (json.JSONDecodeError, re.error) as e:
                            # Log error but continue with preview
                            print(f"Redaction pattern error: {e}")
                
                # Apply magical preview limits
                MAX_PREVIEW_LINES = 50
                MAX_PREVIEW_SIZE = 100_000  # 100KB
                
                preview_content = text_content
                is_truncated = False
                total_lines = text_content.count('\n') + 1
                total_size = len(text_content)
                
                # Truncate by size first
                if len(text_content) > MAX_PREVIEW_SIZE:
                    preview_content = text_content[:MAX_PREVIEW_SIZE]
                    is_truncated = True
                
                # Then truncate by lines
                lines = preview_content.split('\n')
                if len(lines) > MAX_PREVIEW_LINES:
                    preview_content = '\n'.join(lines[:MAX_PREVIEW_LINES])
                    is_truncated = True
                
                # Add magical truncation message
                if is_truncated:
                    preview_content += f"\n\n{'─' * 50}\n"
                    preview_content += f"✨ Preview limited to first {min(MAX_PREVIEW_LINES, len(lines))} lines\n"
                    preview_content += f"📄 Total: {total_lines:,} lines • {total_size:,} bytes\n"
                    preview_content += f"⬇️  Download to see complete file\n"
                    preview_content += f"{'─' * 50}"
                
                # Add preview metadata in headers
                headers = {
                    "Content-Disposition": f'inline; filename="{file.original_filename}"',
                    "X-Preview-Truncated": str(is_truncated).lower(),
                    "X-Total-Lines": str(total_lines),
                    "X-Total-Size": str(total_size),
                    "X-Redaction-Applied": str(file.preview_redaction_enabled).lower() if file.preview_redaction_enabled else "false",
                    **get_cors_headers(request)
                }
                
                return Response(
                    content=preview_content,
                    media_type=content_type,
                    headers=headers
                )
            except UnicodeDecodeError:
                # If decode fails, return as binary
                pass
        
        # For images, apply size limits and blur settings
        if content_type.startswith('image/'):
            # Limit large images to prevent browser memory issues
            MAX_IMAGE_PREVIEW_SIZE = 10 * 1024 * 1024  # 10MB
            
            # Add blur header if enabled
            headers = {
                "Content-Disposition": f'inline; filename="{file.original_filename}"',
                "Content-Length": str(len(file_content)),
                "Cache-Control": "public, max-age=3600",
                "Content-Type": content_type,
                **get_cors_headers(request)
            }
            
            if file.preview_redaction_enabled and file.preview_blur_images:
                headers["X-Preview-Blur"] = "true"
            
            return Response(
                content=file_content,
                media_type=content_type,
                headers=headers
            )
        
        # For PDFs, convert to image for secure preview
        if content_type == 'application/pdf':
            try:
                # Try to import pdf2image
                from pdf2image import convert_from_bytes
                from PIL import Image
                
                # Use page parameter
                page_num = page
                
                # Convert specific page to image
                images = convert_from_bytes(
                    file_content,
                    first_page=page_num,
                    last_page=page_num,
                    dpi=150,  # Good quality without being too large
                    fmt='JPEG'
                )
                
                if images:
                    # Convert PIL image to bytes
                    img_buffer = io.BytesIO()
                    images[0].save(img_buffer, format='JPEG', quality=85)
                    img_buffer.seek(0)
                    
                    headers = {
                        "Content-Disposition": f'inline; filename="preview_{file.original_filename}.jpg"',
                        "Cache-Control": "public, max-age=3600",
                        "Content-Type": "image/jpeg",
                        "X-PDF-Page": str(page_num),
                        "X-PDF-Total-Pages": str(len(PyPDF2.PdfReader(io.BytesIO(file_content)).pages)),
                        **get_cors_headers(request)
                    }
                    
                    return StreamingResponse(
                        img_buffer,
                        media_type="image/jpeg",
                        headers=headers
                    )
            except ImportError:
                # pdf2image not installed, fallback to iframe method
                pass
            except Exception as e:
                print(f"PDF to image conversion failed: {e}")
                # Fallback to iframe method
                pass
            
            # Fallback: return PDF with proper headers for iframe
            headers = {
                "Content-Disposition": f'inline; filename="{file.original_filename}"',
                "Content-Length": str(len(file_content)),
                "Cache-Control": "public, max-age=3600",
                "Content-Type": content_type,
                "X-Content-Type-Options": "nosniff",
                "X-Frame-Options": "SAMEORIGIN",
                **get_cors_headers(request)
            }
            
            return Response(
                content=file_content,
                media_type=content_type,
                headers=headers
            )
        
        # For other files, return as StreamingResponse
        headers = {
            "Content-Disposition": f'inline; filename="{file.original_filename}"',
            "Content-Length": str(len(file_content)),
            "Content-Type": content_type,
            **get_cors_headers(request)
        }
        
        return Response(
            content=file_content,
            media_type=content_type,
            headers=headers
        )
    
    # For production storage (R2), we need to handle it differently
    # R2 doesn't support presigned URLs with custom headers for inline viewing
    # So we'll proxy the content through our server
    
    # Download from R2
    file_content = await storage_service.download_file(file.stored_filename)
    if not file_content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found in storage"
        )
    
    # Determine content type
    content_type = file.mime_type or 'application/octet-stream'
    file_ext = file.original_filename.split('.')[-1].lower() if '.' in file.original_filename else ''
    
    # Fix mime types based on extension
    mime_type_map = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'bmp': 'image/bmp',
        'ico': 'image/x-icon',
        'pdf': 'application/pdf'
    }
    
    if file_ext in mime_type_map:
        content_type = mime_type_map[file_ext]
    
    # Return appropriate response based on file type
    if content_type.startswith('image/'):
        headers = {
            "Content-Disposition": f'inline; filename="{file.original_filename}"',
            "Content-Length": str(len(file_content)),
            "Cache-Control": "public, max-age=3600",
            "Content-Type": content_type,
            **get_cors_headers(request)
        }
        
        if file.preview_redaction_enabled and file.preview_blur_images:
            headers["X-Preview-Blur"] = "true"
        
        return Response(
            content=file_content,
            media_type=content_type,
            headers=headers
        )
    
    # For PDFs, convert to image for secure preview
    if content_type == 'application/pdf':
        try:
            # Try to import pdf2image
            from pdf2image import convert_from_bytes
            from PIL import Image
            
            # Use page parameter
            page_num = page
            
            # Convert specific page to image
            images = convert_from_bytes(
                file_content,
                first_page=page_num,
                last_page=page_num,
                dpi=150,  # Good quality without being too large
                fmt='JPEG'
            )
            
            if images:
                # Convert PIL image to bytes
                img_buffer = io.BytesIO()
                images[0].save(img_buffer, format='JPEG', quality=85)
                img_buffer.seek(0)
                
                headers = {
                    "Content-Disposition": f'inline; filename="preview_{file.original_filename}.jpg"',
                    "Cache-Control": "public, max-age=3600",
                    "Content-Type": "image/jpeg",
                    "X-PDF-Page": str(page_num),
                    "X-PDF-Total-Pages": str(len(PyPDF2.PdfReader(io.BytesIO(file_content)).pages)),
                    **get_cors_headers(request)
                }
                
                return StreamingResponse(
                    img_buffer,
                    media_type="image/jpeg",
                    headers=headers
                )
        except ImportError:
            # pdf2image not installed, fallback to iframe method
            pass
        except Exception as e:
            print(f"PDF to image conversion failed: {e}")
            # Fallback to iframe method
            pass
        
        # Fallback: return PDF with proper headers for iframe
        headers = {
            "Content-Disposition": f'inline; filename="{file.original_filename}"',
            "Content-Length": str(len(file_content)),
            "Cache-Control": "public, max-age=3600",
            "Content-Type": content_type,
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "SAMEORIGIN",
            **get_cors_headers(request)
        }
        
        return Response(
            content=file_content,
            media_type=content_type,
            headers=headers
        )
    
    # Default response for other types
    headers = {
        "Content-Disposition": f'inline; filename="{file.original_filename}"',
        "Content-Length": str(len(file_content)),
        "Content-Type": content_type,
        **get_cors_headers(request)
    }
    
    return StreamingResponse(
        io.BytesIO(file_content),
        media_type=content_type,
        headers=headers
    )


@router.post("/{code}")
async def download_file_with_password(
    code: str,
    request: Request,
    download_data: DownloadRequest,
    db: AsyncSession = Depends(get_db)
):
    return await download_file(code, request, db, download_data.password)