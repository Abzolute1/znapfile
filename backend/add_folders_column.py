#!/usr/bin/env python
"""Add folders column to collections table"""

import asyncio
from sqlalchemy import text
from app.db.base import engine, AsyncSessionLocal

async def add_folders_column():
    async with engine.begin() as conn:
        try:
            # Add folders column
            await conn.execute(text("""
                ALTER TABLE collections 
                ADD COLUMN folders JSON DEFAULT '[]'
            """))
            print("✓ Added folders column to collections table")
            
        except Exception as e:
            if "duplicate column name" in str(e).lower():
                print("✓ Folders column already exists")
            else:
                print(f"Error adding folders column: {e}")
                raise

if __name__ == "__main__":
    print("Adding folders column to collections table...")
    asyncio.run(add_folders_column())