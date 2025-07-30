#!/usr/bin/env python3
"""Add preview redaction fields to files table"""

import asyncio
from sqlalchemy import create_engine, text
from app.core.config import settings

async def add_redaction_fields():
    # Use async connection directly
    from sqlalchemy.ext.asyncio import create_async_engine
    engine = create_async_engine(settings.DATABASE_URL)
    
    async with engine.begin() as conn:
        # Add preview redaction fields
        try:
            await conn.execute(text("""
                ALTER TABLE files 
                ADD COLUMN preview_redaction_enabled BOOLEAN DEFAULT FALSE NOT NULL
            """))
            print("✓ Added preview_redaction_enabled column")
        except Exception as e:
            if "duplicate column name" in str(e).lower():
                print("✓ preview_redaction_enabled column already exists")
            else:
                print(f"✗ Error adding preview_redaction_enabled: {e}")
        
        try:
            await conn.execute(text("""
                ALTER TABLE files 
                ADD COLUMN preview_line_start INTEGER
            """))
            print("✓ Added preview_line_start column")
        except Exception as e:
            if "duplicate column name" in str(e).lower():
                print("✓ preview_line_start column already exists")
            else:
                print(f"✗ Error adding preview_line_start: {e}")
        
        try:
            await conn.execute(text("""
                ALTER TABLE files 
                ADD COLUMN preview_line_end INTEGER
            """))
            print("✓ Added preview_line_end column")
        except Exception as e:
            if "duplicate column name" in str(e).lower():
                print("✓ preview_line_end column already exists")
            else:
                print(f"✗ Error adding preview_line_end: {e}")
        
        try:
            await conn.execute(text("""
                ALTER TABLE files 
                ADD COLUMN preview_redaction_patterns TEXT
            """))
            print("✓ Added preview_redaction_patterns column")
        except Exception as e:
            if "duplicate column name" in str(e).lower():
                print("✓ preview_redaction_patterns column already exists")
            else:
                print(f"✗ Error adding preview_redaction_patterns: {e}")
    
    await engine.dispose()

if __name__ == "__main__":
    print("Adding preview redaction fields to files table...")
    asyncio.run(add_redaction_fields())
    print("Done!")