"""
Security-related endpoints
"""

from fastapi import APIRouter, Request
from pydantic import BaseModel
from app.core.csp_nonce import get_csp_nonce_from_request

router = APIRouter()


class CSPNonceResponse(BaseModel):
    nonce: str


@router.get("/csp-nonce", response_model=CSPNonceResponse)
async def get_csp_nonce(request: Request):
    """
    Get the CSP nonce for the current request
    Frontend can use this to add nonce to inline scripts/styles
    """
    nonce = get_csp_nonce_from_request(request)
    return CSPNonceResponse(nonce=nonce)