from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.base import get_db
from app.models.user import User
from app.schemas.user import UserResponse
from app.api.deps import require_user

router = APIRouter()


@router.get("/", response_model=UserResponse)
async def get_account(
    current_user: User = Depends(require_user)
):
    return UserResponse.from_orm(current_user)


@router.patch("/", response_model=UserResponse)
async def update_account(
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
    email_verified: bool = None
):
    if email_verified is not None:
        current_user.email_verified = email_verified
    
    await db.commit()
    await db.refresh(current_user)
    
    return UserResponse.from_orm(current_user)