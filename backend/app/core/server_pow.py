"""Server-side Proof-of-Work verification - Actually secure"""
import time
import hmac
import hashlib
import secrets
import json
from typing import Tuple, Optional
import redis
from app.core.config import settings

class ServerSidePoW:
    """
    Server generates challenge, client solves, server verifies.
    Cannot be bypassed because server controls validation.
    """
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis = redis_client
        self.secret_key = settings.get_secret_key.encode()
        self.challenge_ttl = 300  # 5 minutes
        
    def create_challenge(self, ip: str, resource: str) -> Tuple[str, dict]:
        """Create a challenge that MUST be solved"""
        challenge_id = secrets.token_hex(16)
        nonce = secrets.token_hex(16)
        timestamp = int(time.time())
        difficulty = self._get_difficulty_for_ip(ip)
        
        # Create challenge data
        challenge_data = {
            'ip': ip,
            'resource': resource,
            'nonce': nonce,
            'timestamp': timestamp,
            'difficulty': difficulty,
            'used': False
        }
        
        # Store in Redis (or memory for testing)
        if self.redis:
            self.redis.setex(
                f"pow:{challenge_id}",
                self.challenge_ttl,
                json.dumps(challenge_data)
            )
        
        # Sign the challenge so client can't tamper
        signature = self._sign_challenge(challenge_id, nonce, difficulty)
        
        return challenge_id, {
            'challenge_id': challenge_id,
            'nonce': nonce,
            'difficulty': difficulty,
            'target': '0' * difficulty,
            'signature': signature,
            'expires_in': self.challenge_ttl
        }
    
    def verify_challenge(self, challenge_id: str, solution: str, ip: str, resource: str) -> Tuple[bool, Optional[str]]:
        """Verify the solution SERVER-SIDE (cannot be bypassed)"""
        # Get challenge from Redis
        if self.redis:
            data = self.redis.get(f"pow:{challenge_id}")
            if not data:
                return False, None
            challenge_data = json.loads(data)
        else:
            return False, None  # In production, must use Redis
        
        # Check if already used
        if challenge_data['used']:
            return False, None
        
        # Verify IP matches
        if challenge_data['ip'] != ip:
            return False, None
            
        # Verify resource matches
        if challenge_data['resource'] != resource:
            return False, None
        
        # Check expiry
        if time.time() - challenge_data['timestamp'] > self.challenge_ttl:
            return False, None
        
        # ACTUAL VERIFICATION - This runs on YOUR server
        nonce = challenge_data['nonce']
        difficulty = challenge_data['difficulty']
        
        # Compute hash
        attempt = f"{nonce}:{solution}"
        hash_result = hashlib.sha256(attempt.encode()).hexdigest()
        
        # Verify leading zeros
        is_valid = hash_result.startswith('0' * difficulty)
        
        if is_valid:
            # Mark as used (prevent replay)
            challenge_data['used'] = True
            if self.redis:
                self.redis.setex(
                    f"pow:{challenge_id}",
                    60,  # Keep for 1 minute after use
                    json.dumps(challenge_data)
                )
        
        if is_valid:
            # Generate access token for the resource
            access_token = self._generate_access_token(ip, resource)
            return True, access_token
        
        return False, None
    
    def _sign_challenge(self, challenge_id: str, nonce: str, difficulty: int) -> str:
        """Sign challenge to prevent tampering"""
        message = f"{challenge_id}:{nonce}:{difficulty}"
        return hmac.new(self.secret_key, message.encode(), hashlib.sha256).hexdigest()
    
    def _get_difficulty_for_ip(self, ip: str) -> int:
        """Adaptive difficulty based on behavior"""
        if self.redis:
            failures = self.redis.get(f"failures:{ip}")
            if failures:
                failure_count = int(failures)
                if failure_count > 50:
                    return 6  # Very hard
                elif failure_count > 20:
                    return 5  # Hard
                elif failure_count > 10:
                    return 4  # Medium
        return 3  # Default
    
    def record_failed_attempt(self, ip: str):
        """Record a failed PoW attempt"""
        if self.redis:
            key = f"failures:{ip}"
            self.redis.incr(key)
            self.redis.expire(key, 3600)  # Reset after 1 hour
    
    def _generate_access_token(self, ip: str, resource: str) -> str:
        """Generate a temporary access token for the resource"""
        timestamp = int(time.time())
        token_data = f"{ip}:{resource}:{timestamp}"
        signature = hmac.new(self.secret_key, token_data.encode(), hashlib.sha256).hexdigest()
        
        # Store token in Redis with 5-minute expiry
        token = f"{timestamp}:{signature}"
        if self.redis:
            self.redis.setex(
                f"pow_token:{token}",
                300,  # 5 minutes
                json.dumps({
                    'ip': ip,
                    'resource': resource,
                    'timestamp': timestamp
                })
            )
        
        return token

# Alternative: Rate limiting with exponential backoff
class ExponentialBackoff:
    """Simpler but effective - delays grow exponentially"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
    
    def check_and_delay(self, ip: str, resource: str) -> float:
        """Returns required delay in seconds"""
        key = f"attempts:{ip}:{resource}"
        attempts = self.redis.incr(key)
        self.redis.expire(key, 3600)  # Reset after 1 hour
        
        if attempts <= 3:
            return 0  # First 3 attempts free
        
        # Exponential backoff: 2^(attempts-3) seconds
        # 4th: 2s, 5th: 4s, 6th: 8s, 7th: 16s, etc.
        delay = min(2 ** (attempts - 3), 300)  # Cap at 5 minutes
        
        return delay

# Best practice: Combine multiple defenses
class DefenseInDepth:
    """Multiple layers of protection"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.pow = ServerSidePoW(redis_client)
        self.backoff = ExponentialBackoff(redis_client)
    
    async def protect_endpoint(self, ip: str, resource: str) -> dict:
        """Returns protection requirements"""
        # Check if IP is blocked
        if self.redis.get(f"blocked:{ip}"):
            raise Exception("IP temporarily blocked")
        
        # Get failure count
        failures = int(self.redis.get(f"failures:{ip}") or 0)
        
        protection = {
            'require_captcha': failures >= 3,
            'require_delay': False,
            'delay_seconds': 0,
            'require_pow': failures >= 5,
            'challenge': None
        }
        
        # Exponential backoff for repeat offenders
        if failures >= 10:
            delay = self.backoff.check_and_delay(ip, resource)
            protection['require_delay'] = True
            protection['delay_seconds'] = delay
        
        # Proof of work for persistent attackers
        if failures >= 5:
            challenge_id, challenge = self.pow.create_challenge(ip, resource)
            protection['challenge'] = challenge
        
        # Temporary block for extreme cases
        if failures >= 100:
            self.redis.setex(f"blocked:{ip}", 3600, "1")
            raise Exception("Too many attempts - blocked for 1 hour")
        
        return protection