"""
Adaptive Security Response (ASR) System
Protects against brute force attacks with escalating challenges
"""
import hashlib
import time
import secrets
import json
from typing import Dict, Optional, Tuple
from datetime import datetime, timedelta
import redis.asyncio as redis
from app.core.config import settings

class AdaptiveSecurityResponse:
    """
    ASR - Multi-layered defense system that adapts to threat levels
    """
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.challenge_ttl = 60  # 60 seconds
        
        # Defense escalation levels - simplified
        self.levels = [
            {"attempts": 0, "action": "none", "difficulty": 0},
            {"attempts": 3, "action": "simple_math", "difficulty": 1},
            {"attempts": 5, "action": "proof_of_work", "difficulty": 2},    # ~1 second
            {"attempts": 10, "action": "proof_of_work", "difficulty": 3},   # ~5 seconds
            {"attempts": 15, "action": "proof_of_work", "difficulty": 4},   # ~30 seconds
            {"attempts": 20, "action": "temp_block", "difficulty": 300},    # 5 min block
            {"attempts": 30, "action": "temp_block", "difficulty": 3600},   # 1 hour block
            {"attempts": 50, "action": "permanent_block", "difficulty": 0}   # Ban
        ]
    
    async def get_threat_level(self, identifier: str) -> Dict:
        """Get current threat level for an identifier (IP, email, fingerprint)"""
        # Get failed attempts from multiple identifiers
        attempts = 0
        
        # Check by IP
        ip_attempts = await self.redis.get(f"asr:attempts:ip:{identifier}")
        if ip_attempts:
            attempts = max(attempts, int(ip_attempts))
        
        # Check by email/username pattern
        email_attempts = await self.redis.get(f"asr:attempts:email:{identifier}")
        if email_attempts:
            attempts = max(attempts, int(email_attempts))
        
        # Check by browser fingerprint
        fp_attempts = await self.redis.get(f"asr:attempts:fp:{identifier}")
        if fp_attempts:
            attempts = max(attempts, int(fp_attempts))
        
        # Check if blocked
        if await self.redis.get(f"asr:blocked:{identifier}"):
            return {"action": "blocked", "attempts": attempts}
        
        # Find appropriate defense level
        for level in reversed(self.levels):
            if attempts >= level["attempts"]:
                return {
                    "action": level["action"],
                    "difficulty": level["difficulty"],
                    "attempts": attempts
                }
        
        return {"action": "none", "difficulty": 0, "attempts": 0}
    
    async def record_failure(self, ip: str, email: str = None, fingerprint: str = None):
        """Record a failed login attempt"""
        # Increment counters for all identifiers
        pipe = self.redis.pipeline()
        
        # IP-based tracking
        pipe.incr(f"asr:attempts:ip:{ip}")
        pipe.expire(f"asr:attempts:ip:{ip}", 86400)  # 24 hour window
        
        # Email-based tracking (hashed)
        if email:
            email_hash = hashlib.sha256(email.lower().encode()).hexdigest()[:16]
            pipe.incr(f"asr:attempts:email:{email_hash}")
            pipe.expire(f"asr:attempts:email:{email_hash}", 86400)
        
        # Fingerprint-based tracking
        if fingerprint:
            pipe.incr(f"asr:attempts:fp:{fingerprint}")
            pipe.expire(f"asr:attempts:fp:{fingerprint}", 86400)
        
        await pipe.execute()
        
        # Check if we need to block
        threat_level = await self.get_threat_level(ip)
        if threat_level["action"] == "permanent_block":
            await self.redis.setex(f"asr:blocked:{ip}", 86400 * 30, "1")  # 30 day block
    
    async def record_success(self, ip: str, email: str = None, fingerprint: str = None):
        """Record successful login - reduces threat score"""
        pipe = self.redis.pipeline()
        
        # Decrement counters (but don't go below 0)
        for key in [
            f"asr:attempts:ip:{ip}",
            f"asr:attempts:email:{hashlib.sha256(email.lower().encode()).hexdigest()[:16]}" if email else None,
            f"asr:attempts:fp:{fingerprint}" if fingerprint else None
        ]:
            if key:
                current = await self.redis.get(key)
                if current and int(current) > 0:
                    pipe.decr(key)
        
        await pipe.execute()
    
    async def create_challenge(self, identifier: str) -> Optional[Dict]:
        """Create appropriate challenge based on threat level"""
        threat = await self.get_threat_level(identifier)
        
        if threat["action"] == "blocked":
            return None
        
        if threat["action"] == "none":
            return {"type": "none", "challenge": None}
        
        if threat["action"] == "simple_math":
            # Simple math CAPTCHA
            a = secrets.randbelow(10) + 1
            b = secrets.randbelow(10) + 1
            answer = a + b
            challenge_id = secrets.token_urlsafe(16)
            
            # Store answer
            await self.redis.setex(
                f"asr:challenge:{challenge_id}",
                self.challenge_ttl,
                json.dumps({"answer": str(answer), "type": "math"})
            )
            
            return {
                "type": "math",
                "challenge_id": challenge_id,
                "question": f"What is {a} + {b}?",
                "difficulty": threat["difficulty"]
            }
        
        if threat["action"] == "proof_of_work":
            # Proof of Work challenge
            challenge = secrets.token_urlsafe(32)
            difficulty = threat["difficulty"]
            challenge_id = secrets.token_urlsafe(16)
            
            # Store challenge
            await self.redis.setex(
                f"asr:challenge:{challenge_id}",
                self.challenge_ttl,
                json.dumps({
                    "challenge": challenge,
                    "difficulty": difficulty,
                    "type": "pow",
                    "created": time.time()
                })
            )
            
            return {
                "type": "proof_of_work",
                "challenge_id": challenge_id,
                "challenge": challenge,
                "difficulty": difficulty,  # Number of leading zeros required
                "algorithm": "sha256"
            }
        
        if threat["action"] == "temp_block":
            return {
                "type": "temp_block",
                "retry_after": threat["difficulty"],
                "message": f"Too many failed attempts. Try again in {threat['difficulty']} seconds."
            }
        
        return None
    
    async def verify_challenge(self, challenge_id: str, solution: str) -> bool:
        """Verify a challenge solution"""
        if not challenge_id or not solution:
            return False
        
        # Get challenge from Redis
        challenge_data = await self.redis.get(f"asr:challenge:{challenge_id}")
        if not challenge_data:
            return False
        
        try:
            data = json.loads(challenge_data)
            
            # Prevent replay attacks
            await self.redis.delete(f"asr:challenge:{challenge_id}")
            
            if data["type"] == "math":
                return solution == data["answer"]
            
            elif data["type"] == "pow":
                # Verify proof of work
                challenge = data["challenge"]
                difficulty = data["difficulty"]
                
                # Check if solution produces required hash
                hash_input = f"{challenge}{solution}"
                hash_output = hashlib.sha256(hash_input.encode()).hexdigest()
                
                # Check if hash has required leading zeros
                required_prefix = "0" * difficulty
                return hash_output.startswith(required_prefix)
            
        except Exception:
            return False
        
        return False
    
    async def get_client_challenge_script(self, challenge: Dict) -> Optional[str]:
        """Generate client-side JavaScript for solving challenges"""
        if challenge["type"] == "proof_of_work":
            return f"""
            async function solveChallenge() {{
                const challenge = "{challenge['challenge']}";
                const difficulty = {challenge['difficulty']};
                const requiredPrefix = "0".repeat(difficulty);
                
                let nonce = 0;
                const startTime = Date.now();
                
                // Update UI
                const statusEl = document.getElementById('challenge-status');
                if (statusEl) statusEl.textContent = 'Solving security challenge...';
                
                while (true) {{
                    const hash = await crypto.subtle.digest(
                        'SHA-256',
                        new TextEncoder().encode(challenge + nonce)
                    );
                    const hashHex = Array.from(new Uint8Array(hash))
                        .map(b => b.toString(16).padStart(2, '0'))
                        .join('');
                    
                    if (hashHex.startsWith(requiredPrefix)) {{
                        const timeSpent = (Date.now() - startTime) / 1000;
                        console.log(`Challenge solved in ${{timeSpent}}s with nonce: ${{nonce}}`);
                        return nonce.toString();
                    }}
                    
                    nonce++;
                    
                    // Update progress every 1000 iterations
                    if (nonce % 1000 === 0 && statusEl) {{
                        statusEl.textContent = `Solving challenge... (${{(nonce/1000).toFixed(0)}}k attempts)`;
                    }}
                }}
            }}
            """
        return None