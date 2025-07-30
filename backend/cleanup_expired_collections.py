#!/usr/bin/env python3
"""
Cleanup expired collections
This script should be run periodically (e.g., via cron) to remove expired collections
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, and_
from datetime import datetime, timezone
from app.models.folder import Collection
from app.core.config import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def cleanup_expired_collections():
    """Delete collections that have passed their expiry date"""
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        try:
            # Find expired collections
            now = datetime.now(timezone.utc)
            result = await session.execute(
                select(Collection).where(
                    and_(
                        Collection.expires_at.isnot(None),
                        Collection.expires_at < now
                    )
                )
            )
            expired_collections = result.scalars().all()
            
            if not expired_collections:
                logger.info("No expired collections found")
                return
            
            logger.info(f"Found {len(expired_collections)} expired collections")
            
            # Delete each expired collection
            for collection in expired_collections:
                logger.info(f"Deleting expired collection: {collection.name} (ID: {collection.id})")
                await session.delete(collection)
            
            await session.commit()
            logger.info(f"Successfully deleted {len(expired_collections)} expired collections")
            
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")
            await session.rollback()
            raise
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(cleanup_expired_collections())