#!/usr/bin/env python3
import sys
import os
sys.path.append('/home/alex/PycharmProjects/FileShare/backend')

import asyncio
from app.core.security import create_access_token, decode_token
from app.models.user import UserTier

async def test_auth():
    # Create a test token
    test_data = {
        "sub": 1,  # user_id
        "email": "test@example.com",
        "tier": "free"
    }
    
    print("Creating test token...")
    token = create_access_token(test_data)
    print(f"Token created: {token[:50]}...")
    
    print("\nDecoding token...")
    decoded = decode_token(token)
    print(f"Decoded payload: {decoded}")
    
    return token

if __name__ == "__main__":
    token = asyncio.run(test_auth())
    print(f"\nUse this token to test the API:")
    print(f"curl -H 'Authorization: Bearer {token}' http://localhost:8000/api/v1/files/")