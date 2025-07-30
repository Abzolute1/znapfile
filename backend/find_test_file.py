#!/usr/bin/env python3
"""Find a test file for preview debugging"""

import asyncio
from sqlalchemy import select
from app.db.base import AsyncSessionLocal
from app.models.file import File
from datetime import datetime, timezone

async def find_test_file():
    """Find a recent image file for testing"""
    async with AsyncSessionLocal() as db:
        # Get recent image files
        result = await db.execute(
            select(File)
            .where(File.deleted == False)
            .where(File.mime_type.like('image/%'))
            .order_by(File.created_at.desc())
            .limit(5)
        )
        files = result.scalars().all()
        
        print("Recent image files for testing:")
        print("-" * 80)
        
        for f in files:
            # Check if file is expired
            expires_at = f.expires_at
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            
            is_expired = expires_at < datetime.now(timezone.utc)
            
            print(f"File: {f.original_filename}")
            print(f"  Code: {f.short_code}")
            print(f"  Type: {f.mime_type}")
            print(f"  Size: {f.file_size} bytes")
            print(f"  Stored: {f.stored_filename}")
            print(f"  Created: {f.created_at}")
            print(f"  Expires: {f.expires_at}")
            print(f"  Expired: {'YES' if is_expired else 'NO'}")
            print(f"  Has Password: {'YES' if f.password_hash else 'NO'}")
            print()
            
            if not is_expired and f.original_filename == "error_page.png":
                print(f">>> FOUND error_page.png: Use code '{f.short_code}' for testing")
                print(f">>> Preview URL: http://localhost:8000/api/v1/download/{f.short_code}/preview")
                break

if __name__ == "__main__":
    asyncio.run(find_test_file())