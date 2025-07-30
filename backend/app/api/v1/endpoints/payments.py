from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict, Any
import stripe.error

from app.api.deps import get_current_user
from app.db.base import get_db
from app.models.user import User, UserTier
from app.core.payments import PaymentService
from app.core.config import settings

router = APIRouter()

@router.post("/create-checkout-session")
async def create_checkout_session(
    plan: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Create a Stripe checkout session for subscription"""
    
    # Validate plan
    try:
        plan_tier = UserTier(plan)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid plan selected"
        )
    
    if plan_tier == UserTier.FREE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create checkout session for free plan"
        )
    
    # Check if user already has an active subscription
    if current_user.tier != UserTier.FREE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an active subscription"
        )
    
    # Create checkout session
    base_url = str(request.url).split('/api')[0]
    success_url = f"{base_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{base_url}/pricing"
    
    checkout_url = await PaymentService.create_checkout_session(
        user_email=current_user.email,
        user_id=str(current_user.id),
        plan=plan_tier,
        success_url=success_url,
        cancel_url=cancel_url
    )
    
    if not checkout_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create checkout session"
        )
    
    return {"checkout_url": checkout_url}

@router.post("/cancel-subscription")
async def cancel_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Cancel the current user's subscription"""
    
    if current_user.tier == UserTier.FREE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active subscription to cancel"
        )
    
    if not current_user.stripe_customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No payment information found"
        )
    
    success = await PaymentService.cancel_subscription(current_user.stripe_customer_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel subscription"
        )
    
    return {"message": "Subscription will be canceled at the end of the current billing period"}

@router.get("/subscription-status")
async def get_subscription_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get the current user's subscription status"""
    
    if not current_user.stripe_customer_id:
        return {
            "has_subscription": False,
            "plan": current_user.tier.value,
            "active": False
        }
    
    status = await PaymentService.get_subscription_status(current_user.stripe_customer_id)
    
    return {
        "has_subscription": status["active"],
        "plan": current_user.tier.value,
        "active": status["active"],
        "current_period_end": status["current_period_end"],
        "cancel_at_period_end": status["cancel_at_period_end"]
    }

@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Handle Stripe webhook events"""
    
    # Get the webhook payload and signature
    payload = await request.body()
    signature = request.headers.get("stripe-signature")
    
    if not signature:
        raise HTTPException(status_code=400, detail="Missing stripe signature")
    
    try:
        event_data = await PaymentService.handle_webhook(payload, signature)
        
        # Handle subscription created
        if event_data["type"] == "subscription_created":
            user_id = event_data["user_id"]
            if user_id:
                # Update user tier and customer ID
                result = await db.execute(
                    select(User).where(User.id == user_id)
                )
                user = result.scalar_one_or_none()
                
                if user:
                    plan = event_data["plan"]
                    if plan == "pro":
                        user.tier = UserTier.PRO
                    elif plan == "max":
                        user.tier = UserTier.MAX
                    
                    user.stripe_customer_id = event_data["customer_id"]
                    await db.commit()
        
        # Handle subscription canceled
        elif event_data["type"] == "subscription_deleted":
            # Downgrade user to free tier
            result = await db.execute(
                select(User).where(User.stripe_customer_id == event_data["customer_id"])
            )
            user = result.scalar_one_or_none()
            
            if user:
                user.tier = UserTier.FREE
                user.subscription_end_date = None
                await db.commit()
        
        return {"received": True}
        
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception as e:
        # Log the error but return success to Stripe
        print(f"Webhook error: {e}")
        return {"received": True}