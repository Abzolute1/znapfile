"""
Stripe payment integration for subscription management
"""
import stripe
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from app.core.config import settings
from app.models.user import UserTier
import logging

logger = logging.getLogger(__name__)

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

# Stripe Price IDs for each plan
STRIPE_PRICE_IDS = {
    UserTier.PRO: settings.STRIPE_PRO_PRICE_ID,
    UserTier.MAX: settings.STRIPE_MAX_PRICE_ID,
}

class PaymentService:
    """Service for handling Stripe payments and subscriptions"""
    
    @staticmethod
    async def create_checkout_session(
        user_email: str,
        user_id: str,
        plan: UserTier,
        success_url: str,
        cancel_url: str
    ) -> Optional[str]:
        """Create a Stripe checkout session for subscription"""
        
        if plan not in STRIPE_PRICE_IDS:
            logger.error(f"No Stripe price ID for plan: {plan}")
            return None
        
        try:
            # Create or get customer
            customers = stripe.Customer.list(email=user_email, limit=1)
            if customers.data:
                customer = customers.data[0]
            else:
                customer = stripe.Customer.create(
                    email=user_email,
                    metadata={"user_id": user_id}
                )
            
            # Create checkout session
            session = stripe.checkout.Session.create(
                customer=customer.id,
                payment_method_types=['card'],
                line_items=[{
                    'price': STRIPE_PRICE_IDS[plan],
                    'quantity': 1,
                }],
                mode='subscription',
                success_url=success_url,
                cancel_url=cancel_url,
                metadata={
                    'user_id': user_id,
                    'plan': plan.value
                }
            )
            
            return session.url
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating checkout session: {e}")
            return None
    
    @staticmethod
    async def cancel_subscription(stripe_customer_id: str) -> bool:
        """Cancel a user's subscription"""
        
        try:
            # Get active subscriptions
            subscriptions = stripe.Subscription.list(
                customer=stripe_customer_id,
                status='active',
                limit=1
            )
            
            if not subscriptions.data:
                return True  # No active subscription
            
            # Cancel the subscription at period end
            subscription = subscriptions.data[0]
            stripe.Subscription.modify(
                subscription.id,
                cancel_at_period_end=True
            )
            
            return True
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error canceling subscription: {e}")
            return False
    
    @staticmethod
    async def get_subscription_status(stripe_customer_id: str) -> Dict[str, Any]:
        """Get current subscription status"""
        
        try:
            subscriptions = stripe.Subscription.list(
                customer=stripe_customer_id,
                limit=1
            )
            
            if not subscriptions.data:
                return {
                    "active": False,
                    "plan": None,
                    "current_period_end": None,
                    "cancel_at_period_end": False
                }
            
            subscription = subscriptions.data[0]
            
            # Determine plan from price ID
            plan = None
            for tier, price_id in STRIPE_PRICE_IDS.items():
                if subscription.items.data[0].price.id == price_id:
                    plan = tier
                    break
            
            return {
                "active": subscription.status == 'active',
                "plan": plan,
                "current_period_end": datetime.fromtimestamp(subscription.current_period_end),
                "cancel_at_period_end": subscription.cancel_at_period_end
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error getting subscription status: {e}")
            return {
                "active": False,
                "plan": None,
                "current_period_end": None,
                "cancel_at_period_end": False
            }
    
    @staticmethod
    async def handle_webhook(payload: bytes, signature: str) -> Dict[str, Any]:
        """Handle Stripe webhook events"""
        
        try:
            event = stripe.Webhook.construct_event(
                payload,
                signature,
                settings.STRIPE_WEBHOOK_SECRET
            )
            
            # Handle different event types
            if event.type == 'checkout.session.completed':
                # Subscription created
                session = event.data.object
                return {
                    "type": "subscription_created",
                    "user_id": session.metadata.get('user_id'),
                    "customer_id": session.customer,
                    "plan": session.metadata.get('plan')
                }
                
            elif event.type == 'customer.subscription.updated':
                # Subscription updated
                subscription = event.data.object
                return {
                    "type": "subscription_updated",
                    "customer_id": subscription.customer,
                    "status": subscription.status,
                    "cancel_at_period_end": subscription.cancel_at_period_end
                }
                
            elif event.type == 'customer.subscription.deleted':
                # Subscription canceled
                subscription = event.data.object
                return {
                    "type": "subscription_deleted",
                    "customer_id": subscription.customer
                }
            
            return {"type": event.type, "handled": False}
            
        except stripe.error.SignatureVerificationError:
            logger.error("Invalid webhook signature")
            raise
        except Exception as e:
            logger.error(f"Webhook handling error: {e}")
            raise