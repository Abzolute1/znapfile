#!/usr/bin/env python3
"""Reset password for a user"""
import sys
import os
sys.path.append('/home/alex/PycharmProjects/FileShare/backend')

import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.models.user import User
from app.core.security import get_password_hash
from app.core.config import settings

# Create async engine
engine = create_async_engine(settings.DATABASE_URL)
async_session = async_sessionmaker(engine, expire_on_commit=False)

async def reset_password(email: str, new_password: str):
    async with async_session() as db:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        if not user:
            print(f"User {email} not found")
            return False
            
        user.password_hash = get_password_hash(new_password)
        await db.commit()
        print(f"Password reset successfully for {email}")
        return True

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python reset_password.py <email> <new_password>")
        sys.exit(1)
        
    email = sys.argv[1]
    password = sys.argv[2]
    
    asyncio.run(reset_password(email, password))