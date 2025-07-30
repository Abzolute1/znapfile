#!/usr/bin/env python3
"""Debug script to test image preview functionality"""

import asyncio
from sqlalchemy import select
from app.db.base import AsyncSessionLocal
from app.models.file import File
from app.services.storage import storage_service
import os

async def debug_preview():
    """Debug image preview issues"""
    async with AsyncSessionLocal() as db:
        # Get a recent file
        result = await db.execute(
            select(File)
            .where(File.deleted == False)
            .order_by(File.created_at.desc())
            .limit(5)
        )
        files = result.scalars().all()
        
        print("Recent files:")
        for f in files:
            print(f"  - {f.original_filename} ({f.mime_type}) - {f.short_code}")
            print(f"    Stored as: {f.stored_filename}")
            
            # Check if file exists
            if type(storage_service).__name__ == 'MockStorageService':
                file_path = os.path.join(storage_service.storage_path, f.stored_filename)
                exists = os.path.exists(file_path)
                print(f"    File exists: {exists}")
                if exists:
                    size = os.path.getsize(file_path)
                    print(f"    File size on disk: {size} bytes")
                    
                    # Try to download
                    content = await storage_service.download_file(f.stored_filename)
                    if content:
                        print(f"    Downloaded successfully: {len(content)} bytes")
                    else:
                        print(f"    Download FAILED!")

if __name__ == "__main__":
    asyncio.run(debug_preview())