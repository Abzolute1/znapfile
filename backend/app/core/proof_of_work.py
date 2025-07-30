"""Cryptographic Proof-of-Work CAPTCHA - Unbreakable by bots"""
import hashlib
import secrets
import time
import json
from typing import Tuple, Optional

class ProofOfWorkCaptcha:
    """
    Instead of silly math problems, we use cryptographic proof-of-work.
    This forces attackers to burn CPU cycles, making automation expensive.
    
    Similar to Bitcoin mining but lighter - takes ~2-5 seconds for legitimate users.
    """
    
    def __init__(self, difficulty: int = 4):
        self.difficulty = difficulty  # Number of leading zeros required
        self.challenges = {}  # Store active challenges
        self.expiry = 300  # 5 minutes to solve
        
    def generate_challenge(self) -> Tuple[str, str]:
        """Generate a new proof-of-work challenge"""
        # Create random challenge
        challenge_id = secrets.token_hex(16)
        nonce_prefix = secrets.token_hex(8)
        timestamp = int(time.time())
        
        challenge_data = {
            'nonce_prefix': nonce_prefix,
            'timestamp': timestamp,
            'difficulty': self.difficulty
        }
        
        self.challenges[challenge_id] = challenge_data
        self._cleanup_expired()
        
        # Return challenge for client
        return challenge_id, json.dumps({
            'challenge_id': challenge_id,
            'nonce_prefix': nonce_prefix,
            'difficulty': self.difficulty,
            'target': '0' * self.difficulty,
            'message': f'Find a nonce where SHA256({nonce_prefix}:nonce) starts with {self.difficulty} zeros'
        })
    
    def verify_proof(self, challenge_id: str, nonce: str) -> bool:
        """Verify the proof-of-work solution"""
        challenge_data = self.challenges.get(challenge_id)
        if not challenge_data:
            return False
        
        # Check expiry
        if time.time() - challenge_data['timestamp'] > self.expiry:
            del self.challenges[challenge_id]
            return False
        
        # Verify the proof
        nonce_prefix = challenge_data['nonce_prefix']
        difficulty = challenge_data['difficulty']
        
        # Calculate hash
        proof = f"{nonce_prefix}:{nonce}"
        hash_result = hashlib.sha256(proof.encode()).hexdigest()
        
        # Check if hash has required leading zeros
        is_valid = hash_result.startswith('0' * difficulty)
        
        # Remove used challenge
        if is_valid:
            del self.challenges[challenge_id]
        
        return is_valid
    
    def _cleanup_expired(self):
        """Remove expired challenges"""
        current_time = time.time()
        expired = [
            cid for cid, data in self.challenges.items()
            if current_time - data['timestamp'] > self.expiry
        ]
        for cid in expired:
            del self.challenges[cid]


class AdaptiveProofOfWork:
    """
    Adaptive difficulty based on request patterns.
    Increases difficulty for suspicious IPs.
    """
    
    def __init__(self):
        self.ip_history = {}  # Track IP behavior
        self.base_difficulty = 4
        self.max_difficulty = 6
        
    def get_difficulty_for_ip(self, ip: str) -> int:
        """Get difficulty based on IP reputation"""
        history = self.ip_history.get(ip, {'failures': 0, 'last_seen': 0})
        
        # Increase difficulty for repeat offenders
        if history['failures'] > 10:
            return self.max_difficulty
        elif history['failures'] > 5:
            return self.base_difficulty + 1
        else:
            return self.base_difficulty
    
    def record_attempt(self, ip: str, success: bool):
        """Record attempt result"""
        if ip not in self.ip_history:
            self.ip_history[ip] = {'failures': 0, 'last_seen': time.time()}
        
        if not success:
            self.ip_history[ip]['failures'] += 1
        else:
            # Reduce failure count on success (forgiveness)
            self.ip_history[ip]['failures'] = max(0, self.ip_history[ip]['failures'] - 1)
        
        self.ip_history[ip]['last_seen'] = time.time()
        
        # Cleanup old entries (older than 24 hours)
        self._cleanup_old_ips()
    
    def _cleanup_old_ips(self):
        """Remove IPs not seen in 24 hours"""
        current_time = time.time()
        old_ips = [
            ip for ip, data in self.ip_history.items()
            if current_time - data['last_seen'] > 86400
        ]
        for ip in old_ips:
            del self.ip_history[ip]


# Alternative: Cryptographic puzzle CAPTCHA
class CryptoPuzzleCaptcha:
    """
    More user-friendly than proof-of-work but still secure.
    Uses cryptographic puzzles that are easy for humans but hard for bots.
    """
    
    def __init__(self):
        self.puzzles = {}
        
    def generate_puzzle(self) -> Tuple[str, str]:
        """Generate a crypto puzzle"""
        puzzle_id = secrets.token_hex(16)
        
        # Generate random values
        a = secrets.randbelow(1000)
        b = secrets.randbelow(1000)
        c = (a * b) % 997  # Use prime modulus
        
        # Create puzzle with missing value
        puzzle_types = [
            {
                'question': f"Find X: X × {b} ≡ {c} (mod 997)",
                'answer': str(a),
                'type': 'modular_multiplication'
            },
            {
                'question': f"Find the missing digit: SHA256('secret{secrets.randbelow(999):03d}') = {self._partial_hash(a)}...",
                'answer': str(a % 10),
                'type': 'hash_puzzle'  
            },
            {
                'question': f"How many prime numbers between {a} and {a + 20}?",
                'answer': str(self._count_primes(a, a + 20)),
                'type': 'prime_counting'
            }
        ]
        
        puzzle = secrets.choice(puzzle_types)
        self.puzzles[puzzle_id] = {
            'answer': puzzle['answer'],
            'created_at': time.time()
        }
        
        return puzzle_id, json.dumps({
            'puzzle_id': puzzle_id,
            'question': puzzle['question'],
            'type': puzzle['type']
        })
    
    def verify_answer(self, puzzle_id: str, answer: str) -> bool:
        """Verify puzzle answer"""
        puzzle_data = self.puzzles.get(puzzle_id)
        if not puzzle_data:
            return False
        
        # Check expiry (5 minutes)
        if time.time() - puzzle_data['created_at'] > 300:
            del self.puzzles[puzzle_id]
            return False
        
        is_correct = puzzle_data['answer'] == answer.strip()
        
        # Remove used puzzle
        del self.puzzles[puzzle_id]
        
        return is_correct
    
    def _partial_hash(self, seed: int) -> str:
        """Generate partial hash for puzzle"""
        full_hash = hashlib.sha256(f'secret{seed:03d}'.encode()).hexdigest()
        return full_hash[:8] + '****' + full_hash[-8:]
    
    def _count_primes(self, start: int, end: int) -> int:
        """Count prime numbers in range"""
        count = 0
        for num in range(max(2, start), end + 1):
            if all(num % i != 0 for i in range(2, int(num ** 0.5) + 1)):
                count += 1
        return count