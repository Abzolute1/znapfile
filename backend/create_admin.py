import asyncio
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.base import engine, Base
from app.models.user import User, UserTier
from app.core.security import get_password_hash
from sqlalchemy.ext.asyncio import async_sessionmaker

async def create_admin_user():
    """Create an admin user for testing"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession)
    
    async with AsyncSessionLocal() as db:
        # Check if admin already exists
        from sqlalchemy import select
        result = await db.execute(select(User).where(User.email == "admin@fileshare.com"))
        existing_admin = result.scalar_one_or_none()
        
        if existing_admin:
            print(f"Admin user already exists: {existing_admin.email}")
            if not existing_admin.is_superuser:
                existing_admin.is_superuser = True
                await db.commit()
                print("Updated user to superuser status")
            return
        
        # Create new admin user
        admin_user = User(
            id=uuid.uuid4(),
            email="admin@fileshare.com",
            username="admin",
            password_hash=get_password_hash("admin123"),
            is_superuser=True,
            email_verified=True,
            tier=UserTier.MAX  # Give admin MAX tier
        )
        
        db.add(admin_user)
        await db.commit()
        
        print("Admin user created successfully!")
        print("Email: admin@fileshare.com")
        print("Password: admin123")
        print("Status: Superuser with MAX tier")

if __name__ == "__main__":
    asyncio.run(create_admin_user())