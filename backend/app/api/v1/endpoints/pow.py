"""
Proof-of-Work endpoints with rate limiting
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Dict
import redis.asyncio as redis
from app.core.config import settings
from app.core.server_pow import ServerSidePoW
from app.core.rate_limiting import limiter
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()


class PoWChallengeResponse(BaseModel):
    challenge_id: str
    challenge_data: Dict


class PoWVerifyRequest(BaseModel):
    challenge_id: str
    solution: str
    resource: str  # What resource they're trying to access


class PoWVerifyResponse(BaseModel):
    valid: bool
    token: str = None  # Access token if valid


# Initialize Redis client for PoW storage
async def get_redis_client():
    client = await redis.from_url(settings.REDIS_URL)
    return client


# Rate limits for PoW endpoints
POW_RATE_LIMITS = {
    "challenge_generation": "10/minute",  # Max 10 challenges per minute per IP
    "challenge_verification": "20/minute",  # Max 20 verification attempts per minute
    "authenticated_challenge": "30/minute"  # Higher limit for authenticated users
}


@router.post("/challenge", response_model=PoWChallengeResponse)
@limiter.limit(POW_RATE_LIMITS["challenge_generation"])
async def generate_pow_challenge(
    request: Request,
    resource: str,
    current_user: User = Depends(get_current_user)
):
    """
    Generate a proof-of-work challenge for accessing a resource
    Rate limited to prevent DoS attacks
    """
    # Use authenticated rate limit if user is logged in
    if current_user:
        # Apply higher rate limit for authenticated users
        await limiter._check_request_limit(
            request, 
            POW_RATE_LIMITS["authenticated_challenge"]
        )
    
    # Get client IP
    client_ip = request.client.host
    
    # Initialize PoW service
    redis_client = await get_redis_client()
    pow_service = ServerSidePoW(redis_client)
    
    try:
        # Create challenge
        challenge_id, challenge_data = pow_service.create_challenge(
            ip=client_ip,
            resource=resource
        )
        
        return PoWChallengeResponse(
            challenge_id=challenge_id,
            challenge_data=challenge_data
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate challenge: {str(e)}"
        )
    finally:
        await redis_client.close()


@router.post("/verify", response_model=PoWVerifyResponse)
@limiter.limit(POW_RATE_LIMITS["challenge_verification"])
async def verify_pow_solution(
    request: Request,
    data: PoWVerifyRequest
):
    """
    Verify a proof-of-work solution
    Rate limited to prevent brute force attempts
    """
    # Get client IP
    client_ip = request.client.host
    
    # Initialize PoW service
    redis_client = await get_redis_client()
    pow_service = ServerSidePoW(redis_client)
    
    try:
        # Verify solution
        is_valid, access_token = pow_service.verify_challenge(
            challenge_id=data.challenge_id,
            solution=data.solution,
            ip=client_ip,
            resource=data.resource
        )
        
        if not is_valid:
            # Record failed attempt for adaptive difficulty
            pow_service.record_failed_attempt(client_ip)
            
            raise HTTPException(
                status_code=400,
                detail="Invalid proof-of-work solution"
            )
        
        return PoWVerifyResponse(
            valid=True,
            token=access_token
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to verify solution: {str(e)}"
        )
    finally:
        await redis_client.close()


@router.get("/difficulty/{resource}")
@limiter.limit("30/minute")
async def get_pow_difficulty(
    request: Request,
    resource: str
):
    """
    Get the current PoW difficulty for a resource
    This helps clients estimate solving time
    """
    client_ip = request.client.host
    
    redis_client = await get_redis_client()
    pow_service = ServerSidePoW(redis_client)
    
    try:
        difficulty = pow_service._get_difficulty_for_ip(client_ip)
        
        return {
            "resource": resource,
            "difficulty": difficulty,
            "estimated_seconds": 2 ** (difficulty - 2),  # Rough estimate
            "message": f"Find nonce where SHA256(challenge:nonce) has {difficulty} leading zeros"
        }
    finally:
        await redis_client.close()