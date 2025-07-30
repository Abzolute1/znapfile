#!/usr/bin/env python3
"""Quick fix - create a minimal working backend"""
import sys
sys.path.append('/home/alex/PycharmProjects/FileShare/backend')

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta, timezone
import asyncio

from app.db.base import get_db
from app.models.user import User
from app.schemas.user import UserLogin, TokenResponse, UserResponse
from app.core.security import verify_password, create_access_token, create_refresh_token
from app.core.config import settings

app = FastAPI(title="FileShare Quick Fix")

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "FileShare API (Quick Fix)", "version": "1.0.0"}

@app.post("/api/v1/auth/login")
async def login(user_data: UserLogin, db: AsyncSession = Depends(get_db)):
    """Direct login endpoint without rate limiting"""
    print(f"Login attempt for: {user_data.email}")
    
    result = await db.execute(select(User).where(User.email == user_data.email))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(user_data.password, user.password_hash):
        await asyncio.sleep(1)
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    print(f"User authenticated: {user.email}")
    
    # Create tokens
    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    
    # Create response
    user_response = UserResponse.model_validate(user)
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_response
    )

@app.get("/api/v1/files/")
async def list_files(db: AsyncSession = Depends(get_db)):
    """Simple files endpoint"""
    return {
        "files": [],
        "total_storage_used": 0,
        "storage_limit": 1000000000
    }

@app.get("/api/v1/plans/current")
async def get_current_plan():
    """Simple plans endpoint"""
    return {
        "plan": {"id": "free", "name": "Free"},
        "active_storage_used": 0,
        "monthly_transfer_used": 0,
        "limits": {
            "monthly_transfer_bytes": 1000000000,
            "active_storage_bytes": 1000000000
        }
    }

if __name__ == "__main__":
    import uvicorn
    print("Starting Quick Fix server on port 8001...")
    uvicorn.run(app, host="0.0.0.0", port=8001)