#!/usr/bin/env python3
"""Add preview_blur_images field to files table"""

import asyncio
from sqlalchemy import text
from app.db.base import engine

async def add_blur_field():
    """Add preview_blur_images field to files table"""
    async with engine.begin() as conn:
        try:
            # Add preview_blur_images column
            await conn.execute(text("""
                ALTER TABLE files 
                ADD COLUMN preview_blur_images BOOLEAN DEFAULT FALSE NOT NULL
            """))
            
            print("✅ Successfully added preview_blur_images column")
            
        except Exception as e:
            if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                print("ℹ️  preview_blur_images column already exists")
            else:
                print(f"❌ Error adding column: {e}")
                raise

if __name__ == "__main__":
    asyncio.run(add_blur_field())