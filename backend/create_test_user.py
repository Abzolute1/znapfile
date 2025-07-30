#!/usr/bin/env python3
import asyncio
import sys
sys.path.append('.')

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.core.config import settings
from app.models.user import User, UserTier
from app.core.security import get_password_hash
from datetime import datetime, timezone
import secrets

async def create_test_user():
    # Test user credentials
    email = "debug@test.com"
    username = "debuguser"
    password = "Password123"
    
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Check if user exists
        result = await session.execute(select(User).where(User.email == email))
        existing = result.scalar_one_or_none()
        
        if existing:
            print(f"User {email} already exists")
            # Update password
            existing.password_hash = get_password_hash(password)
            existing.email_verified = True
            existing.email_verified_at = datetime.now(timezone.utc)
            await session.commit()
            print(f"Updated password for {email}")
        else:
            # Create new user
            new_user = User(
                id=secrets.token_hex(16),
                email=email,
                username=username,
                password_hash=get_password_hash(password),
                email_verified=True,
                email_verified_at=datetime.now(timezone.utc),
                tier=UserTier.FREE,
                is_superuser=False,
                created_at=datetime.now(timezone.utc)
            )
            session.add(new_user)
            await session.commit()
            print(f"Created user {email}")
        
        print(f"\nTest user credentials:")
        print(f"Email: {email}")
        print(f"Password: {password}")

if __name__ == "__main__":
    asyncio.run(create_test_user())