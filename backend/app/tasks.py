from celery import Celery
from celery.schedules import crontab
from datetime import datetime, timezone
from sqlalchemy import select
from app.core.config import settings
from app.db.base import AsyncSessionLocal
from app.models.file import File
from app.services.storage import storage_service
import asyncio

# Create Celery instance
celery = Celery(
    'fileshare',
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

# Configure Celery
celery.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    beat_schedule={
        'cleanup-expired-files': {
            'task': 'app.tasks.cleanup_expired_files',
            'schedule': crontab(minute='*/5'),  # Run every 5 minutes
        },
    }
)


@celery.task
def cleanup_expired_files():
    """Remove expired files from storage and database"""
    asyncio.run(_cleanup_expired_files())


async def _cleanup_expired_files():
    async with AsyncSessionLocal() as db:
        try:
            # Find expired files
            result = await db.execute(
                select(File)
                .where(File.expires_at < datetime.now(timezone.utc))
                .where(File.deleted == False)
                .limit(100)  # Process in batches
            )
            expired_files = result.scalars().all()
            
            deleted_count = 0
            for file in expired_files:
                try:
                    # Delete from R2 storage
                    await storage_service.delete_file(file.stored_filename)
                    
                    # Mark as deleted in database
                    file.deleted = True
                    deleted_count += 1
                except Exception as e:
                    print(f"Error deleting file {file.short_code}: {e}")
                    continue
            
            # Commit all changes
            await db.commit()
            
            if deleted_count > 0:
                print(f"Cleaned up {deleted_count} expired files")
                
        except Exception as e:
            print(f"Error in cleanup task: {e}")
            await db.rollback()


@celery.task
def send_email_notification(to_email: str, subject: str, body: str):
    """Send email notifications (for premium features)"""
    # This would integrate with SendGrid
    # For now, just log
    print(f"Email to {to_email}: {subject}")


@celery.task
def check_storage_limits():
    """Check and enforce storage limits for users"""
    asyncio.run(_check_storage_limits())


async def _check_storage_limits():
    # This would check user storage limits and send warnings
    # or disable uploads if limits are exceeded
    pass