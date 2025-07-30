#!/usr/bin/env python3
"""
Create a superuser account securely.
Usage: python create_superuser.py
"""

import asyncio
import getpass
import sys
from sqlalchemy import select
from app.db.base import AsyncSessionLocal
from app.models.user import User, UserTier
from app.core.security import get_password_hash
from datetime import datetime, timezone


async def create_superuser():
    """Create a superuser account with secure input."""
    print("\n=== Create Superuser Account ===\n")
    
    # Get email
    while True:
        email = input("Email address: ").strip().lower()
        if "@" in email and "." in email:
            break
        print("Please enter a valid email address.")
    
    # Get password securely
    while True:
        password = getpass.getpass("Password (min 8 chars): ")
        if len(password) >= 8:
            password_confirm = getpass.getpass("Confirm password: ")
            if password == password_confirm:
                break
            else:
                print("Passwords don't match. Try again.")
        else:
            print("Password must be at least 8 characters.")
    
    async with AsyncSessionLocal() as db:
        # Check if user already exists
        result = await db.execute(
            select(User).where(User.email == email)
        )
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            print(f"\nUser with email {email} already exists.")
            confirm = input("Update to superuser? (yes/no): ").lower()
            if confirm != "yes":
                print("Operation cancelled.")
                return
            
            # Update existing user
            existing_user.is_superuser = True
            existing_user.tier = UserTier.MAX
            existing_user.email_verified = True
            existing_user.email_verified_at = datetime.now(timezone.utc)
            existing_user.password_hash = get_password_hash(password)
            
            await db.commit()
            print(f"\n✅ User {email} updated to superuser with MAX tier.")
        else:
            # Create new superuser
            new_user = User(
                email=email,
                password_hash=get_password_hash(password),
                email_verified=True,
                email_verified_at=datetime.now(timezone.utc),
                tier=UserTier.MAX,
                is_superuser=True
            )
            
            db.add(new_user)
            await db.commit()
            print(f"\n✅ Superuser {email} created successfully with MAX tier.")
    
    print("\nSuperuser privileges include:")
    print("- MAX tier features")
    print("- Admin access to all areas")
    print("- No upload/storage limits")
    print("\n⚠️  Keep these credentials secure!")


if __name__ == "__main__":
    try:
        asyncio.run(create_superuser())
    except KeyboardInterrupt:
        print("\n\nOperation cancelled.")
        sys.exit(0)
    except Exception as e:
        print(f"\nError: {e}")
        sys.exit(1)