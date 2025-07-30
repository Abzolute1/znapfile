"""
Content Security Policy nonce generator for secure inline scripts/styles
"""

import secrets
import base64
from fastapi import Request
from typing import Dict


class CSPNonce:
    """Generate and manage CSP nonces for inline scripts and styles"""
    
    @staticmethod
    def generate_nonce() -> str:
        """Generate a cryptographically secure nonce"""
        # Generate 16 random bytes (128 bits)
        random_bytes = secrets.token_bytes(16)
        # Base64 encode for use in CSP header
        return base64.b64encode(random_bytes).decode('ascii')
    
    @staticmethod
    def get_csp_header(nonce: str, extra_directives: Dict[str, str] = None) -> str:
        """
        Generate CSP header with nonce support
        
        Args:
            nonce: The nonce value for this request
            extra_directives: Additional CSP directives to include
            
        Returns:
            Complete CSP header value
        """
        # Base CSP directives
        directives = {
            "default-src": "'self'",
            "script-src": f"'self' 'nonce-{nonce}'",
            "style-src": f"'self' 'nonce-{nonce}'",
            "img-src": "'self' data: https:",
            "font-src": "'self'",
            "connect-src": "'self' https://*.cloudflarestorage.com",
            "frame-ancestors": "'none'",  # Prevent clickjacking
            "base-uri": "'self'",
            "form-action": "'self'",
            "object-src": "'none'",
            "upgrade-insecure-requests": ""
        }
        
        # Add any extra directives
        if extra_directives:
            directives.update(extra_directives)
        
        # Build CSP string
        csp_parts = []
        for directive, value in directives.items():
            if value:
                csp_parts.append(f"{directive} {value}")
            else:
                csp_parts.append(directive)
        
        return "; ".join(csp_parts)


def add_csp_nonce_to_request(request: Request) -> str:
    """
    Add a CSP nonce to the request state
    
    Args:
        request: FastAPI request object
        
    Returns:
        The generated nonce
    """
    nonce = CSPNonce.generate_nonce()
    request.state.csp_nonce = nonce
    return nonce


def get_csp_nonce_from_request(request: Request) -> str:
    """
    Get the CSP nonce from request state
    
    Args:
        request: FastAPI request object
        
    Returns:
        The nonce value or empty string if not set
    """
    return getattr(request.state, 'csp_nonce', '')