#!/usr/bin/env python3
"""Temporary simplified preview endpoint to get it working"""

# Add this simplified version to your download.py file temporarily

@router.get("/{code}/preview")
@limiter.limit(RATE_LIMITS["download"])
async def preview_file(
    code: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    password: Optional[str] = None,
    page: int = 1
):
    """Simplified preview for images only"""
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
    if file.expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="File expired")
    
    # Check password
    if file.password_hash and not verify_password(password or "", file.password_hash):
        raise HTTPException(status_code=401, detail="Invalid password")
    
    # For now, only handle images
    if not (file.mime_type and file.mime_type.startswith('image/')):
        raise HTTPException(status_code=415, detail="Preview only available for images")
    
    # Download file
    file_content = await storage_service.download_file(file.stored_filename)
    if not file_content:
        raise HTTPException(status_code=404, detail="File not found in storage")
    
    # Return image
    return Response(
        content=file_content,
        media_type=file.mime_type,
        headers={
            "Content-Disposition": f'inline; filename="{file.original_filename}"',
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=3600"
        }
    )