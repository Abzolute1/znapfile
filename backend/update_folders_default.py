#!/usr/bin/env python
"""Update existing collections to have empty folders array"""

import asyncio
from sqlalchemy import text
from app.db.base import engine

async def update_folders_default():
    async with engine.begin() as conn:
        try:
            # Update NULL folders to empty array
            await conn.execute(text("""
                UPDATE collections 
                SET folders = '[]'
                WHERE folders IS NULL
            """))
            print("✓ Updated existing collections with empty folders array")
            
        except Exception as e:
            print(f"Error updating folders: {e}")
            raise

if __name__ == "__main__":
    print("Updating folders default value...")
    asyncio.run(update_folders_default())