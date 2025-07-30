"""
Quick script to reset the admin password
Run this with: python reset_admin_password.py
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.models.user import User
from app.core.security import get_password_hash
from app.core.config import settings

async def reset_admin_password():
    # Create async engine
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Find the admin user
        result = await session.execute(
            select(User).where(User.email == "asemu93@hotmail.com")
        )
        user = result.scalar_one_or_none()
        
        if not user:
            print("User not found!")
            return
        
        # Set new password
        new_password = "Ykqyep_24"  # Your requested password
        user.password_hash = get_password_hash(new_password)
        
        await session.commit()
        print(f"Password reset successfully!")
        print(f"Email: asemu93@hotmail.com")
        print(f"New Password: {new_password}")
        print(f"Username: {user.username}")
        print(f"Is Superuser: {user.is_superuser}")

if __name__ == "__main__":
    asyncio.run(reset_admin_password())