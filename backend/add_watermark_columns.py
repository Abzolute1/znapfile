#!/usr/bin/env python3
"""Add watermark columns to files table"""

import asyncio
from sqlalchemy import text
from app.db.base import AsyncSessionLocal

async def add_columns():
    """Add watermark columns if they don't exist"""
    async with AsyncSessionLocal() as db:
        try:
            # Check if columns exist (SQLite way)
            result = await db.execute(text("PRAGMA table_info(files)"))
            existing_columns = {row[1] for row in result}
            
            # Add watermark_enabled if missing
            if 'watermark_enabled' not in existing_columns:
                await db.execute(text("""
                    ALTER TABLE files 
                    ADD COLUMN watermark_enabled BOOLEAN DEFAULT FALSE NOT NULL
                """))
                print("✓ Added watermark_enabled column")
            
            # Add watermark_text if missing
            if 'watermark_text' not in existing_columns:
                await db.execute(text("""
                    ALTER TABLE files 
                    ADD COLUMN watermark_text VARCHAR(100)
                """))
                print("✓ Added watermark_text column")
            
            await db.commit()
            print("✓ Database updated successfully")
            
        except Exception as e:
            print(f"Error updating database: {e}")
            await db.rollback()

if __name__ == "__main__":
    asyncio.run(add_columns())