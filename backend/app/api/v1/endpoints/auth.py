from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta, timezone
from app.db.base import get_db
from app.models.user import User, UserTier
from app.schemas.user import UserCreate, UserLogin, TokenResponse, UserResponse
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, decode_token
from app.core.token_blacklist import token_blacklist
from app.core.config import settings
from app.core.rate_limiting import limiter, RATE_LIMITS
from app.core.validators import PasswordValidator
from app.core.email import EmailService
from app.core.defense import AdaptiveSecurityResponse
from app.api.deps import get_current_user, require_user, get_redis
import asyncio
import pyotp
import qrcode
import io
import base64
import secrets
from typing import Optional
from pydantic import BaseModel
import hashlib

router = APIRouter()


@router.get("/test")
async def test_endpoint():
    """Simple test endpoint"""
    return {"status": "ok", "message": "Auth endpoint is working"}


# 2FA Schemas
class Enable2FAResponse(BaseModel):
    qr_code: str
    secret: str
    backup_codes: list[str]


class Verify2FARequest(BaseModel):
    code: str


class Disable2FARequest(BaseModel):
    password: str
    code: Optional[str] = None  # Either 2FA code or backup code


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class BackupCodesResponse(BaseModel):
    backup_codes: list[str]


class TwoFactorResponse(BaseModel):
    requires_2fa: bool = True
    temp_token: str  # Temporary token to verify 2FA


class Verify2FALoginRequest(BaseModel):
    temp_token: str
    code: str


class ChallengeResponse(BaseModel):
    requires_challenge: bool = True
    challenge: dict
    message: Optional[str] = None


class LoginWithChallenge(UserLogin):
    challenge_id: Optional[str] = None
    challenge_solution: Optional[str] = None
    fingerprint: Optional[str] = None  # Browser fingerprint


class PasswordResetRequest(BaseModel):
    email: str


class PasswordResetVerify(BaseModel):
    email: str
    code: str
    new_password: str


def generate_backup_codes(count: int = 8) -> list[str]:
    """Generate backup codes for 2FA recovery"""
    return [secrets.token_hex(4).upper() for _ in range(count)]


@router.post("/register", response_model=TokenResponse)
@limiter.limit(RATE_LIMITS["auth_register"])
async def register(request: Request, user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check if email already exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if username already exists
    result = await db.execute(select(User).where(User.username == user_data.username.lower()))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Validate password strength
    is_valid, error_msg = PasswordValidator.validate_password(user_data.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    
    hashed_password = get_password_hash(user_data.password)
    
    # Generate verification token for all users
    verification_token = EmailService.generate_verification_token()
    token_expires = datetime.now(timezone.utc) + timedelta(hours=24)
    
    new_user = User(
        email=user_data.email,
        username=user_data.username.lower(),
        password_hash=hashed_password,
        email_verification_token=verification_token,
        verification_token_expires_at=token_expires,
        email_verified=False,
        email_verified_at=None,
        tier=UserTier.FREE,
        is_superuser=False
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    # Send verification email (async, don't wait)
    base_url = str(request.url).split('/api')[0]
    asyncio.create_task(
        EmailService.send_verification_email(
            new_user.email, 
            verification_token,
            base_url
        )
    )
    
    access_token = create_access_token({"sub": str(new_user.id)})
    refresh_token = create_refresh_token({"sub": str(new_user.id)})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(new_user)
    )


@router.post("/login")
@limiter.limit(RATE_LIMITS["auth_login"])
async def login(
    request: Request, 
    user_data: LoginWithChallenge, 
    response: Response,
    db: AsyncSession = Depends(get_db),
    redis_client = Depends(get_redis)
):
    """
    Login endpoint with Adaptive Security Response (ASR)
    Protects against brute force with escalating challenges
    """
    # Initialize ASR
    asr = AdaptiveSecurityResponse(redis_client)
    
    # Get client IP and email hash for tracking
    client_ip = request.client.host
    email_hash = hashlib.sha256(user_data.email.lower().encode()).hexdigest()[:16]
    
    # Check if this request includes a challenge solution
    if user_data.challenge_id and user_data.challenge_solution:
        # Verify the challenge first
        if not await asr.verify_challenge(user_data.challenge_id, user_data.challenge_solution):
            # Record failure and create new challenge
            await asr.record_failure(client_ip, user_data.email, user_data.fingerprint)
            
            # Get new challenge
            challenge = await asr.create_challenge(client_ip)
            if not challenge:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Account temporarily locked due to too many failed attempts"
                )
            
            # Return new challenge
            return ChallengeResponse(
                requires_challenge=True,
                challenge=challenge,
                message="Invalid challenge solution. Please try again."
            )
    
    # Check threat level before attempting login
    threat_level = await asr.get_threat_level(client_ip)
    
    # If action required and no challenge solution provided
    if threat_level["action"] != "none" and not user_data.challenge_solution:
        challenge = await asr.create_challenge(client_ip)
        if not challenge:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Account temporarily locked due to too many failed attempts"
            )
        
        # Add client-side script if it's PoW
        if challenge.get("type") == "proof_of_work":
            script = await asr.get_client_challenge_script(challenge)
            if script:
                challenge["solver_script"] = script
        
        return ChallengeResponse(
            requires_challenge=True,
            challenge=challenge,
            message=f"Security verification required after {threat_level['attempts']} failed attempts"
        )
    
    # Proceed with authentication
    try:
        result = await db.execute(select(User).where(User.email == user_data.email))
        user = result.scalar_one_or_none()
        
        if not user or not verify_password(user_data.password, user.password_hash):
            # Record failure
            await asr.record_failure(client_ip, user_data.email, user_data.fingerprint)
            
            # Get challenge for next attempt
            challenge = await asr.create_challenge(client_ip)
            
            # Don't reveal if email exists
            error_response = HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
            
            # If challenge required, include it in response headers
            if challenge and challenge["type"] != "none":
                response.headers["X-Challenge-Required"] = "true"
                response.headers["X-Challenge-Type"] = challenge["type"]
            
            raise error_response
        
        # Success! Record it to reduce threat score
        await asr.record_success(client_ip, user_data.email, user_data.fingerprint)
        
        # Check if user has 2FA enabled
        if user.two_factor_enabled:
            temp_token_data = {
                "sub": str(user.id),
                "type": "2fa_temp",
                "exp": datetime.now(timezone.utc) + timedelta(minutes=5)
            }
            temp_token = create_access_token(temp_token_data)
            
            return TwoFactorResponse(
                requires_2fa=True,
                temp_token=temp_token
            )
        
        # Generate tokens
        access_token = create_access_token({"sub": str(user.id)})
        refresh_token = create_refresh_token({"sub": str(user.id)})
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserResponse.model_validate(user)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR in login: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during login"
        )


@router.post("/login/2fa", response_model=TokenResponse)
async def verify_2fa_login(request: Verify2FALoginRequest, db: AsyncSession = Depends(get_db)):
    """Verify 2FA code during login"""
    # Decode temporary token
    payload = decode_token(request.temp_token)
    if not payload or payload.get("type") != "2fa_temp":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired verification token"
        )
    
    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user or not user.two_factor_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid request"
        )
    
    # Verify the 2FA code
    totp = pyotp.TOTP(user.two_factor_secret)
    is_valid_totp = totp.verify(request.code, valid_window=1)
    
    # Also check backup codes
    is_valid_backup = False
    if user.backup_codes and request.code in user.backup_codes:
        is_valid_backup = True
        # Remove used backup code
        user.backup_codes.remove(request.code)
        await db.commit()
    
    if not is_valid_totp and not is_valid_backup:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid verification code"
        )
    
    # Generate real tokens
    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user)
    )


class RefreshTokenRequest(BaseModel):
    refresh_token: str


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    refresh_token = request.refresh_token
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    new_access_token = create_access_token({"sub": str(user.id)})
    new_refresh_token = create_refresh_token({"sub": str(user.id)})
    
    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        user=UserResponse.model_validate(user)
    )


@router.post("/verify-email")
async def verify_email(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """Verify user's email address"""
    
    # Find user with this token
    result = await db.execute(
        select(User).where(User.email_verification_token == token)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification token"
        )
    
    # Check if token has expired
    if user.verification_token_expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token has expired"
        )
    
    # Mark email as verified
    user.email_verified = True
    user.email_verified_at = datetime.now(timezone.utc)
    user.email_verification_token = None
    user.verification_token_expires_at = None
    
    await db.commit()
    
    return {"message": "Email verified successfully"}


@router.post("/resend-verification")
@limiter.limit("3/hour")
async def resend_verification(
    request: Request,
    data: dict,
    db: AsyncSession = Depends(get_db)
):
    """Resend verification email"""
    
    email = data.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is required"
        )
    
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    if not user:
        # Don't reveal if email exists
        return {"message": "If the email exists, a verification link has been sent"}
    
    if user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already verified"
        )
    
    # Generate new token
    verification_token = EmailService.generate_verification_token()
    token_expires = datetime.now(timezone.utc) + timedelta(hours=24)
    
    user.email_verification_token = verification_token
    user.verification_token_expires_at = token_expires
    
    await db.commit()
    
    # Send verification email
    base_url = str(request.url).split('/api')[0]
    await EmailService.send_verification_email(
        user.email, 
        verification_token,
        base_url
    )
    
    return {"message": "Verification email sent"}


@router.post("/2fa/enable", response_model=Enable2FAResponse)
async def enable_2fa(
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    """Enable 2FA for the current user"""
    if current_user.two_factor_enabled:
        raise HTTPException(
            status_code=400,
            detail="2FA is already enabled"
        )
    
    # Generate a new secret
    secret = pyotp.random_base32()
    
    # Generate QR code
    totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=current_user.email,
        issuer_name='ZnapFile'
    )
    
    # Create QR code image
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(totp_uri)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    
    # Convert to base64
    qr_code_base64 = base64.b64encode(buf.getvalue()).decode()
    
    # Generate backup codes
    backup_codes = generate_backup_codes()
    
    # Store the secret temporarily (not enabled yet)
    # User must verify with a code first
    current_user.two_factor_secret = secret
    current_user.backup_codes = backup_codes
    
    await db.commit()
    
    return Enable2FAResponse(
        qr_code=f"data:image/png;base64,{qr_code_base64}",
        secret=secret,
        backup_codes=backup_codes
    )


@router.post("/2fa/verify")
async def verify_2fa_setup(
    request: Verify2FARequest,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    """Verify 2FA setup with a code"""
    if current_user.two_factor_enabled:
        raise HTTPException(
            status_code=400,
            detail="2FA is already enabled"
        )
    
    if not current_user.two_factor_secret:
        raise HTTPException(
            status_code=400,
            detail="2FA setup not initiated"
        )
    
    # Verify the code
    totp = pyotp.TOTP(current_user.two_factor_secret)
    if not totp.verify(request.code, valid_window=1):
        raise HTTPException(
            status_code=400,
            detail="Invalid verification code"
        )
    
    # Enable 2FA
    current_user.two_factor_enabled = True
    await db.commit()
    
    return {"message": "2FA enabled successfully"}


@router.post("/2fa/disable")
async def disable_2fa(
    request: Disable2FARequest,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    """Disable 2FA for the current user"""
    if not current_user.two_factor_enabled:
        raise HTTPException(
            status_code=400,
            detail="2FA is not enabled"
        )
    
    # Verify password
    if not verify_password(request.password, current_user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Invalid password"
        )
    
    # Disable 2FA
    current_user.two_factor_enabled = False
    current_user.two_factor_secret = None
    current_user.backup_codes = None
    
    await db.commit()
    
    return {"message": "2FA disabled successfully"}


@router.get("/2fa/backup-codes", response_model=BackupCodesResponse)
async def get_backup_codes(
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current backup codes or generate new ones"""
    if not current_user.two_factor_enabled:
        raise HTTPException(
            status_code=400,
            detail="2FA is not enabled"
        )
    
    return BackupCodesResponse(
        backup_codes=current_user.backup_codes or []
    )


@router.post("/2fa/regenerate-backup-codes", response_model=BackupCodesResponse)
async def regenerate_backup_codes(
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    """Regenerate backup codes"""
    if not current_user.two_factor_enabled:
        raise HTTPException(
            status_code=400,
            detail="2FA is not enabled"
        )
    
    # Generate new backup codes
    backup_codes = generate_backup_codes()
    current_user.backup_codes = backup_codes
    
    await db.commit()
    
    return BackupCodesResponse(backup_codes=backup_codes)


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    """Change user password"""
    # Verify current password
    if not verify_password(request.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Current password is incorrect"
        )
    
    # Update password
    current_user.password_hash = get_password_hash(request.new_password)
    await db.commit()
    
    # Revoke all existing tokens when password is changed
    await token_blacklist.revoke_all_user_tokens(current_user.id)
    
    return {"message": "Password changed successfully"}


@router.post("/logout")
async def logout(
    request: Request,
    current_user: User = Depends(require_user)
):
    """Logout current session by revoking the token"""
    # Get token from authorization header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        payload = decode_token(token)
        
        if payload:
            jti = payload.get("jti")
            exp = datetime.fromtimestamp(payload.get("exp"), tz=timezone.utc)
            
            if jti:
                await token_blacklist.add_token(jti, current_user.id, exp)
    
    return {"message": "Logged out successfully"}


@router.post("/logout-all")
async def logout_all_sessions(
    current_user: User = Depends(require_user)
):
    """Logout all sessions by revoking all tokens for the user"""
    await token_blacklist.revoke_all_user_tokens(current_user.id)
    
    return {"message": "All sessions logged out successfully"}


class TokenValidationRequest(BaseModel):
    token: str


@router.post("/validate-token")
async def validate_token(
    request: TokenValidationRequest,
    db: AsyncSession = Depends(get_db)
):
    """Validate if a token is still valid and not blacklisted"""
    payload = decode_token(request.token)
    
    if not payload:
        return {"valid": False, "reason": "Invalid token"}
    
    # Check if blacklisted
    jti = payload.get("jti")
    if jti and await token_blacklist.is_blacklisted(jti):
        return {"valid": False, "reason": "Token has been revoked"}
    
    # Check if user exists
    user_id = payload.get("sub")
    if user_id:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            return {"valid": False, "reason": "User not found"}
    
    return {"valid": True}


@router.post("/forgot-password")
@limiter.limit("3/hour")
async def forgot_password(
    request: Request,
    data: PasswordResetRequest,
    db: AsyncSession = Depends(get_db),
    redis_client = Depends(get_redis)
):
    """Request password reset - sends 6-digit code to email"""
    # Find user by email
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    
    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If the email exists, a reset code has been sent"}
    
    # Generate 6-digit code
    reset_code = str(secrets.randbelow(900000) + 100000)  # Ensures 6 digits
    
    # Store in Redis with 15 minute expiry
    await redis_client.setex(
        f"password_reset:{data.email}",
        900,  # 15 minutes
        reset_code
    )
    
    # Send email
    await EmailService.send_password_reset_email(user.email, reset_code)
    
    return {"message": "If the email exists, a reset code has been sent"}


@router.post("/reset-password")
@limiter.limit("5/hour")
async def reset_password(
    request: Request,
    data: PasswordResetVerify,
    db: AsyncSession = Depends(get_db),
    redis_client = Depends(get_redis)
):
    """Verify reset code and change password"""
    # Get stored code from Redis
    stored_code = await redis_client.get(f"password_reset:{data.email}")
    
    if not stored_code or stored_code != data.code:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset code"
        )
    
    # Find user
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=400,
            detail="User not found"
        )
    
    # Validate new password
    is_valid, error_msg = PasswordValidator.validate_password(data.new_password)
    if not is_valid:
        raise HTTPException(
            status_code=400,
            detail=error_msg
        )
    
    # Update password
    user.password_hash = get_password_hash(data.new_password)
    await db.commit()
    
    # Delete reset code
    await redis_client.delete(f"password_reset:{data.email}")
    
    # Revoke all existing tokens
    await token_blacklist.revoke_all_user_tokens(user.id)
    
    return {"message": "Password reset successfully"}