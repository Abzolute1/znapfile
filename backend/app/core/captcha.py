"""Simple CAPTCHA implementation for security"""
import random
import string
import hashlib
import time
from typing import Tuple, Optional
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import io
import base64

class SimpleCaptcha:
    def __init__(self, secret_key: str):
        self.secret_key = secret_key
        self.captcha_store = {}  # In production, use Redis
        self.captcha_expiry = 300  # 5 minutes
        
    def generate_captcha_text(self, length: int = 6) -> str:
        """Generate random alphanumeric text"""
        # Exclude confusing characters like 0, O, I, l
        chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
        return ''.join(random.choice(chars) for _ in range(length))
    
    def create_captcha_image(self, text: str) -> str:
        """Create a CAPTCHA image and return as base64"""
        # Image settings
        width, height = 200, 60
        background_color = (255, 255, 255)
        text_color = (0, 0, 0)
        
        # Create image
        image = Image.new('RGB', (width, height), background_color)
        draw = ImageDraw.Draw(image)
        
        # Add noise
        for _ in range(random.randint(500, 1000)):
            x = random.randint(0, width)
            y = random.randint(0, height)
            draw.point((x, y), fill=(
                random.randint(0, 255),
                random.randint(0, 255),
                random.randint(0, 255)
            ))
        
        # Add lines
        for _ in range(random.randint(3, 5)):
            x1 = random.randint(0, width)
            y1 = random.randint(0, height)
            x2 = random.randint(0, width)
            y2 = random.randint(0, height)
            draw.line([(x1, y1), (x2, y2)], fill=(
                random.randint(100, 200),
                random.randint(100, 200),
                random.randint(100, 200)
            ), width=2)
        
        # Draw text (simple version without font)
        # In production, use a proper font file
        char_width = width // len(text)
        for i, char in enumerate(text):
            x = i * char_width + random.randint(5, 15)
            y = random.randint(10, 30)
            # Randomly vary size and angle
            draw.text((x, y), char, fill=text_color)
        
        # Apply slight blur
        image = image.filter(ImageFilter.SMOOTH)
        
        # Convert to base64
        buffer = io.BytesIO()
        image.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return f"data:image/png;base64,{img_str}"
    
    def generate_captcha(self) -> Tuple[str, str]:
        """Generate CAPTCHA and return (captcha_id, image_base64)"""
        text = self.generate_captcha_text()
        captcha_id = hashlib.sha256(f"{text}{time.time()}{self.secret_key}".encode()).hexdigest()[:16]
        
        # Store with expiry
        self.captcha_store[captcha_id] = {
            'text': text,
            'created_at': time.time()
        }
        
        # Clean old captchas
        self._cleanup_expired()
        
        image = self.create_captcha_image(text)
        return captcha_id, image
    
    def verify_captcha(self, captcha_id: str, user_input: str) -> bool:
        """Verify CAPTCHA input"""
        if not captcha_id or not user_input:
            return False
        
        captcha_data = self.captcha_store.get(captcha_id)
        if not captcha_data:
            return False
        
        # Check expiry
        if time.time() - captcha_data['created_at'] > self.captcha_expiry:
            del self.captcha_store[captcha_id]
            return False
        
        # Verify (case insensitive)
        is_valid = captcha_data['text'].upper() == user_input.upper()
        
        # Remove after use
        del self.captcha_store[captcha_id]
        
        return is_valid
    
    def _cleanup_expired(self):
        """Remove expired CAPTCHAs"""
        current_time = time.time()
        expired_keys = [
            k for k, v in self.captcha_store.items()
            if current_time - v['created_at'] > self.captcha_expiry
        ]
        for key in expired_keys:
            del self.captcha_store[key]

# Math-based CAPTCHA as fallback (no image dependencies)
class MathCaptcha:
    def __init__(self, secret_key: str):
        self.secret_key = secret_key
        self.captcha_store = {}
        self.captcha_expiry = 300
    
    def generate_captcha(self) -> Tuple[str, str]:
        """Generate math problem"""
        a = random.randint(1, 20)
        b = random.randint(1, 20)
        operations = [
            ('+', lambda x, y: x + y),
            ('-', lambda x, y: x - y),
            ('×', lambda x, y: x * y)
        ]
        
        op_symbol, op_func = random.choice(operations)
        
        # For subtraction, ensure positive result
        if op_symbol == '-' and a < b:
            a, b = b, a
        
        result = op_func(a, b)
        question = f"What is {a} {op_symbol} {b}?"
        
        captcha_id = hashlib.sha256(f"{result}{time.time()}{self.secret_key}".encode()).hexdigest()[:16]
        
        self.captcha_store[captcha_id] = {
            'answer': str(result),
            'created_at': time.time()
        }
        
        self._cleanup_expired()
        
        return captcha_id, question
    
    def verify_captcha(self, captcha_id: str, user_input: str) -> bool:
        """Verify math answer"""
        if not captcha_id or not user_input:
            return False
        
        captcha_data = self.captcha_store.get(captcha_id)
        if not captcha_data:
            return False
        
        # Check expiry
        if time.time() - captcha_data['created_at'] > self.captcha_expiry:
            del self.captcha_store[captcha_id]
            return False
        
        is_valid = captcha_data['answer'] == user_input.strip()
        
        # Remove after use
        del self.captcha_store[captcha_id]
        
        return is_valid
    
    def _cleanup_expired(self):
        """Remove expired CAPTCHAs"""
        current_time = time.time()
        expired_keys = [
            k for k, v in self.captcha_store.items()
            if current_time - v['created_at'] > self.captcha_expiry
        ]
        for key in expired_keys:
            del self.captcha_store[key]