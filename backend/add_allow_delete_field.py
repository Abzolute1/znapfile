#!/usr/bin/env python3
"""Add allow_delete field to collections table"""

import asyncio
from sqlalchemy import text
from app.db.base import engine

async def add_allow_delete_field():
    """Add allow_delete field to collections table"""
    async with engine.begin() as conn:
        try:
            # Add allow_delete column
            await conn.execute(text("""
                ALTER TABLE collections 
                ADD COLUMN allow_delete BOOLEAN DEFAULT FALSE NOT NULL
            """))
            
            print("✅ Successfully added allow_delete column to collections table")
            
        except Exception as e:
            if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                print("ℹ️  allow_delete column already exists")
            else:
                print(f"❌ Error adding column: {e}")
                raise

if __name__ == "__main__":
    asyncio.run(add_allow_delete_field())