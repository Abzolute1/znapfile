#!/usr/bin/env python3
"""
Run the migration to add abuse prevention fields
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def run_migration():
    """Run the migration SQL"""
    engine = create_async_engine(settings.DATABASE_URL)
    
    async with engine.begin() as conn:
        try:
            # Read migration file
            with open('migrations/add_abuse_prevention_fields.sql', 'r') as f:
                migration_sql = f.read()
            
            # Execute each statement separately
            statements = [s.strip() for s in migration_sql.split(';') if s.strip()]
            
            for statement in statements:
                if statement and not statement.startswith('--'):
                    logger.info(f"Executing: {statement[:50]}...")
                    await conn.execute(text(statement))
            
            logger.info("Migration completed successfully!")
            
        except Exception as e:
            logger.error(f"Migration failed: {e}")
            raise
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run_migration())