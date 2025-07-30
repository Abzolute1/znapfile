#!/usr/bin/env python3
"""
Add expires_at and last_accessed_at columns to collections table
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def add_collection_tracking_fields():
    """Add tracking fields to collections table"""
    engine = create_async_engine(settings.DATABASE_URL)
    
    async with engine.begin() as conn:
        try:
            # Check if columns already exist (SQLite approach)
            result = await conn.execute(text("PRAGMA table_info(collections)"))
            columns = result.fetchall()
            existing_columns = [col[1] for col in columns]
            
            # Add expires_at column if it doesn't exist
            if 'expires_at' not in existing_columns:
                logger.info("Adding expires_at column...")
                await conn.execute(text("""
                    ALTER TABLE collections 
                    ADD COLUMN expires_at TIMESTAMP
                """))
                logger.info("✓ Added expires_at column")
            else:
                logger.info("✓ expires_at column already exists")
            
            # Add last_accessed_at column if it doesn't exist
            if 'last_accessed_at' not in existing_columns:
                logger.info("Adding last_accessed_at column...")
                await conn.execute(text("""
                    ALTER TABLE collections 
                    ADD COLUMN last_accessed_at TIMESTAMP
                """))
                logger.info("✓ Added last_accessed_at column")
            else:
                logger.info("✓ last_accessed_at column already exists")
            
            # Create index on expires_at for efficient cleanup queries
            logger.info("Creating index on expires_at...")
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_collections_expires_at 
                ON collections(expires_at) 
                WHERE expires_at IS NOT NULL
            """))
            logger.info("✓ Created expires_at index")
            
            logger.info("\n✅ Collection tracking fields migration complete!")
            
        except Exception as e:
            logger.error(f"Error during migration: {e}")
            raise
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(add_collection_tracking_fields())