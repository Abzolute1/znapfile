"""CAPTCHA endpoints for security"""
from fastapi import APIRouter, Depends, HTTPException, Request
from app.core.captcha import MathCaptcha
from app.core.config import settings
from app.core.rate_limiting import limiter, RATE_LIMITS
from pydantic import BaseModel

router = APIRouter()

# Use math CAPTCHA as it doesn't require PIL
captcha_service = MathCaptcha(settings.get_secret_key)

class CaptchaResponse(BaseModel):
    captcha_id: str
    question: str

class CaptchaVerifyRequest(BaseModel):
    captcha_id: str
    answer: str

@router.get("/generate", response_model=CaptchaResponse)
@limiter.limit(RATE_LIMITS["captcha_generate"])
async def generate_captcha(request: Request):
    """Generate a new CAPTCHA challenge"""
    captcha_id, question = captcha_service.generate_captcha()
    return CaptchaResponse(captcha_id=captcha_id, question=question)

@router.post("/verify")
@limiter.limit(RATE_LIMITS["captcha_verify"])
async def verify_captcha(request: Request, data: CaptchaVerifyRequest):
    """Verify CAPTCHA answer"""
    is_valid = captcha_service.verify_captcha(data.captcha_id, data.answer)
    
    if not is_valid:
        raise HTTPException(
            status_code=400,
            detail="Invalid CAPTCHA answer"
        )
    
    return {"success": True}