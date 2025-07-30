from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from typing import Optional
from uuid import UUID
import io
import re
from PIL import Image
import PyPDF2
import pandas as pd
from app.db.base import get_db
from app.models.file import File, FileShare
from app.models.user import User
from app.api.deps import get_current_user
from app.services.storage import storage_service
from app.core.security import verify_password
from app.core.rate_limiting import limiter, RATE_LIMITS

router = APIRouter()


def check_file_access(file: File, current_user: Optional[User], password: Optional[str] = None) -> bool:
    """Check if user has access to preview file"""
    # Check if file is public
    if file.is_public:
        # Still need password if protected
        if file.password_hash and password:
            return verify_password(password, file.password_hash)
        elif file.password_hash:
            return False
        return True
    
    # Check if user is authenticated
    if not current_user:
        return False
    
    # Check if user owns the file
    if file.user_id == current_user.id:
        return True
    
    # Access will be checked via shares in the endpoint
    return False


@router.get("/{file_id}/preview")
@limiter.limit(RATE_LIMITS["download"])
async def preview_file(
    request: Request,
    file_id: UUID,
    current_user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    password: Optional[str] = None,
    page: int = 1,
    thumbnail: bool = False
):
    """Generate preview for supported file types"""
    # Get file
    result = await db.execute(
        select(File)
        .where(File.id == file_id)
        .where(File.deleted == False)
    )
    file = result.scalar_one_or_none()
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    if file.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="File has expired"
        )
    
    # Check access
    has_access = check_file_access(file, current_user, password)
    
    # If not direct access, check shares
    if not has_access and current_user:
        share_result = await db.execute(
            select(FileShare)
            .where(FileShare.file_id == file_id)
            .where(FileShare.shared_with_id == current_user.id)
            .where(
                (FileShare.expires_at.is_(None)) | 
                (FileShare.expires_at > datetime.utcnow())
            )
        )
        has_access = share_result.scalar() is not None
    
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Determine preview type based on MIME type
    mime_type = file.mime_type or "application/octet-stream"
    
    # Image preview
    if mime_type.startswith("image/"):
        return await generate_image_preview(file, thumbnail)
    
    # PDF preview
    elif mime_type == "application/pdf":
        return await generate_pdf_preview(file, page)
    
    # Text preview
    elif mime_type.startswith("text/") or mime_type in [
        "application/json", "application/xml", "application/javascript"
    ]:
        return await generate_text_preview(file)
    
    # CSV/Excel preview
    elif mime_type in ["text/csv", "application/vnd.ms-excel", 
                       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]:
        return await generate_spreadsheet_preview(file)
    
    # Video preview (return metadata)
    elif mime_type.startswith("video/"):
        return await generate_video_metadata(file)
    
    else:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Preview not available for this file type"
        )


async def generate_image_preview(file: File, thumbnail: bool = False):
    """Generate image preview or thumbnail"""
    # Download file from storage
    file_content = await storage_service.download_file(file.stored_filename)
    
    if not file_content:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve file"
        )
    
    # Open image
    img = Image.open(io.BytesIO(file_content))
    
    # Generate thumbnail if requested
    if thumbnail:
        # Maintain aspect ratio
        img.thumbnail((200, 200), Image.Resampling.LANCZOS)
    else:
        # Resize for preview if too large
        max_size = (1200, 1200)
        if img.size[0] > max_size[0] or img.size[1] > max_size[1]:
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
    
    # Convert to RGB if necessary
    if img.mode in ('RGBA', 'LA', 'P'):
        rgb_img = Image.new('RGB', img.size, (255, 255, 255))
        if img.mode == 'P':
            img = img.convert('RGBA')
        rgb_img.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
        img = rgb_img
    
    # Save to bytes
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='JPEG', quality=85)
    img_bytes.seek(0)
    
    return StreamingResponse(
        img_bytes,
        media_type="image/jpeg",
        headers={
            "Cache-Control": "public, max-age=3600",
            "Content-Disposition": f"inline; filename=preview_{file.original_filename}"
        }
    )


async def generate_pdf_preview(file: File, page: int = 1):
    """Generate PDF page preview as image"""
    # Download file
    file_content = await storage_service.download_file(file.stored_filename)
    
    if not file_content:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve file"
        )
    
    try:
        # For basic implementation, return PDF info
        # In production, use pdf2image or similar
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
        num_pages = len(pdf_reader.pages)
        
        if page > num_pages or page < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid page number. PDF has {num_pages} pages."
            )
        
        # Extract text from requested page
        page_obj = pdf_reader.pages[page - 1]
        text = page_obj.extract_text()
        
        return JSONResponse({
            "type": "pdf",
            "total_pages": num_pages,
            "current_page": page,
            "text_preview": text[:1000] + "..." if len(text) > 1000 else text,
            "metadata": {
                "title": pdf_reader.metadata.title if pdf_reader.metadata else None,
                "author": pdf_reader.metadata.author if pdf_reader.metadata else None,
                "subject": pdf_reader.metadata.subject if pdf_reader.metadata else None,
            }
        })
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process PDF: {str(e)}"
        )


async def generate_text_preview(file: File):
    """Generate text file preview"""
    # Download file
    file_content = await storage_service.download_file(file.stored_filename)
    
    if not file_content:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve file"
        )
    
    try:
        # Decode text
        text = file_content.decode('utf-8')
        
        # Limit preview size
        max_chars = 50000  # 50KB of text
        if len(text) > max_chars:
            text = text[:max_chars] + f"\n\n... (truncated, showing first {max_chars} characters)"
        
        # Count lines
        lines = text.split('\n')
        
        return JSONResponse({
            "type": "text",
            "content": text,
            "stats": {
                "total_size": len(file_content),
                "total_lines": len(lines),
                "preview_truncated": len(file_content) > max_chars
            }
        })
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="File is not valid UTF-8 text"
        )


async def generate_spreadsheet_preview(file: File):
    """Generate spreadsheet preview"""
    # Download file
    file_content = await storage_service.download_file(file.stored_filename)
    
    if not file_content:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve file"
        )
    
    try:
        # Read spreadsheet
        if file.mime_type == "text/csv":
            df = pd.read_csv(io.BytesIO(file_content))
        else:
            df = pd.read_excel(io.BytesIO(file_content))
        
        # Limit preview size
        preview_rows = min(100, len(df))
        preview_cols = min(20, len(df.columns))
        
        # Convert to dict for JSON response
        preview_data = df.iloc[:preview_rows, :preview_cols].to_dict('records')
        
        return JSONResponse({
            "type": "spreadsheet",
            "data": preview_data,
            "columns": list(df.columns[:preview_cols]),
            "stats": {
                "total_rows": len(df),
                "total_columns": len(df.columns),
                "preview_rows": preview_rows,
                "preview_columns": preview_cols
            }
        })
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process spreadsheet: {str(e)}"
        )


async def generate_video_metadata(file: File):
    """Return video metadata (preview generation would require ffmpeg)"""
    return JSONResponse({
        "type": "video",
        "mime_type": file.mime_type,
        "size": file.file_size,
        "filename": file.original_filename,
        "message": "Video preview requires streaming endpoint"
    })


@router.get("/{file_id}/thumbnail")
async def get_thumbnail(
    request: Request,
    file_id: UUID,
    current_user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get thumbnail for image files"""
    return await preview_file(request, file_id, current_user, db, thumbnail=True)