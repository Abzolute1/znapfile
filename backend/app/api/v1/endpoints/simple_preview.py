from fastapi import APIRouter, Depends, HTTPException, Response, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
from typing import Optional
import traceback
import sys
from io import StringIO, BytesIO
from PIL import Image, ImageDraw, ImageFont
import math

from app.db.base import get_db
from app.models.file import File
from app.services.storage import storage_service
from app.core.security import verify_password
from app.core.cors_utils import get_cors_headers

router = APIRouter()

# Global error log
error_log = []


def apply_watermark(image_data: bytes, watermark_text: str) -> bytes:
    """Apply a tiled watermark to an image"""
    try:
        # Open the image
        img = Image.open(BytesIO(image_data))
        
        # Convert to RGBA for transparency support
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        # Create a transparent overlay
        overlay = Image.new('RGBA', img.size, (255, 255, 255, 0))
        draw = ImageDraw.Draw(overlay)
        
        # Try to use a good font, fallback to default
        font_size = 30  # Increased from 20
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", font_size)
        except:
            font = ImageFont.load_default()
            font_size = 11  # Default font is smaller
        
        # Calculate text size
        bbox = draw.textbbox((0, 0), watermark_text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        # Add padding
        padding = 50
        total_width = text_width + padding
        total_height = text_height + padding
        
        # Calculate rotation angle (45 degrees)
        angle = -45
        angle_rad = math.radians(angle)
        
        # Calculate diagonal spacing
        diagonal_width = int(abs(total_width * math.cos(angle_rad)) + abs(total_height * math.sin(angle_rad)))
        diagonal_height = int(abs(total_width * math.sin(angle_rad)) + abs(total_height * math.cos(angle_rad)))
        
        # Draw watermark pattern
        for y in range(-diagonal_height, img.height + diagonal_height, diagonal_height + 20):
            for x in range(-diagonal_width, img.width + diagonal_width, diagonal_width + 20):
                # Create a temporary image for the rotated text
                txt_img = Image.new('RGBA', (text_width + 20, text_height + 20), (255, 255, 255, 0))
                txt_draw = ImageDraw.Draw(txt_img)
                txt_draw.text((10, 10), watermark_text, font=font, fill=(255, 255, 255, 120))  # Increased from 80 to 120 (less transparent)
                
                # Rotate the text
                rotated = txt_img.rotate(angle, expand=1)
                
                # Calculate position
                overlay.paste(rotated, (x, y), rotated)
        
        # Composite the watermark onto the original image
        watermarked = Image.alpha_composite(img, overlay)
        
        # Convert back to original mode if needed
        if img.mode == 'RGB':
            watermarked = watermarked.convert('RGB')
        
        # Save to bytes
        output = BytesIO()
        if img.format:
            watermarked.save(output, format=img.format)
        else:
            watermarked.save(output, format='PNG')
        
        return output.getvalue()
        
    except Exception as e:
        print(f"Watermark error: {str(e)}")
        # Return original if watermarking fails
        return image_data

@router.get("/preview/{code}")
async def simple_preview(
    code: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    password: Optional[str] = None
):
    """Simple working preview endpoint"""
    try:
        # Get file from database
        result = await db.execute(
            select(File)
            .where(File.short_code == code)
            .where(File.deleted == False)
        )
        file = result.scalar_one_or_none()
        
        if not file:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Check if expired
        expires_at = file.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
            
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=410, detail="File expired")
        
        # Check password if needed
        if file.password_hash:
            if not password or not verify_password(password, file.password_hash):
                raise HTTPException(status_code=401, detail="Invalid password")
        
        # Download file content
        file_content = await storage_service.download_file(file.stored_filename)
        if not file_content:
            raise HTTPException(status_code=404, detail="File not found in storage")
        
        # Determine content type
        content_type = file.mime_type or 'application/octet-stream'
        
        # For images, apply watermark if enabled
        if content_type.startswith('image/'):
            # Apply watermark ONLY for preview - downloads get the original file
            if file.watermark_enabled and file.watermark_text:
                file_content = apply_watermark(file_content, file.watermark_text)
            
            return Response(
                content=file_content,
                media_type=content_type,
                headers={
                    "Content-Disposition": f'inline; filename="{file.original_filename}"',
                    "Cache-Control": "public, max-age=3600",
                    **get_cors_headers(request)
                }
            )
        
        # For PDFs, return with proper headers
        elif content_type == 'application/pdf':
            return Response(
                content=file_content,
                media_type=content_type,
                headers={
                    "Content-Disposition": f'inline; filename="{file.original_filename}"',
                    "Cache-Control": "public, max-age=3600",
                    # Don't include X-Frame-Options to allow iframe embedding
                    **get_cors_headers(request)
                }
            )
        
        # For text files
        elif content_type.startswith('text/'):
            text_content = file_content.decode('utf-8', errors='replace')
            # Limit preview to 1000 lines
            lines = text_content.split('\n')
            if len(lines) > 1000:
                text_content = '\n'.join(lines[:1000]) + '\n\n... (truncated)'
            
            return Response(
                content=text_content,
                media_type="text/plain; charset=utf-8",
                headers={
                    "Content-Disposition": f'inline; filename="{file.original_filename}"',
                    **get_cors_headers(request)
                }
            )
        
        else:
            raise HTTPException(status_code=415, detail="Preview not available for this file type")
            
    except Exception as e:
        # Capture the error
        error_buffer = StringIO()
        traceback.print_exc(file=error_buffer)
        error_str = error_buffer.getvalue()
        
        error_log.append({
            "time": datetime.now().isoformat(),
            "code": code,
            "error": str(e),
            "traceback": error_str
        })
        
        # Re-raise if it's already an HTTP exception
        if isinstance(e, HTTPException):
            raise
        
        # Otherwise return 500
        raise HTTPException(status_code=500, detail=f"Preview failed: {str(e)}")

@router.get("/preview-errors")
async def get_preview_errors():
    """Get captured preview errors for debugging"""
    return {"errors": error_log}