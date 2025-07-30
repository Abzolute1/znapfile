#!/usr/bin/env python3
"""Check existing users in database"""
import asyncio
from sqlalchemy import select
from app.db.base import AsyncSessionLocal
from app.models.user import User

async def check_users():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User))
        users = result.scalars().all()
        
        print(f"Found {len(users)} users:")
        for user in users:
            print(f"  - Email: {user.email}, ID: {user.id}")

if __name__ == "__main__":
    asyncio.run(check_users())