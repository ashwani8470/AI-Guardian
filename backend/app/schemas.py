"""
Unified request/response schemas for AI Guardian.

This is the single source of truth for the API contract. Share this file
(or its shape) with Sparsh and the NLP/XAI teammate so every modality
returns data in the same shape — that's what makes the Android app and
dashboard simple to build.
"""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class RiskTier(str, Enum):
    SAFE = "safe"            # 0-30
    SUSPICIOUS = "suspicious"  # 31-70
    DANGEROUS = "dangerous"    # 71-100


class ReasonCode(BaseModel):
    """One human-readable explanation for the score (from the XAI engine)."""
    label: str          # e.g. "Urgent language detected"
    weight: float        # contribution to the score, 0-1
    detail: Optional[str] = None


# ---- Request models (one per modality) ----

class TextScanRequest(BaseModel):
    content: str = Field(..., description="Raw SMS/chat text to analyze")
    user_id: Optional[str] = None


class UrlScanRequest(BaseModel):
    url: str
    user_id: Optional[str] = None


class EmailScanRequest(BaseModel):
    subject: Optional[str] = None
    body: str
    sender: Optional[str] = None
    user_id: Optional[str] = None


class QrScanRequest(BaseModel):
    image_base64: str = Field(..., description="Base64-encoded QR code image")
    user_id: Optional[str] = None


class ScreenshotScanRequest(BaseModel):
    image_base64: str = Field(..., description="Base64-encoded screenshot")
    user_id: Optional[str] = None


# ---- Unified response (every endpoint returns this shape) ----

class UserSignup(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    email: str
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)


class MessageResponse(BaseModel):
    message: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ScanHistoryItem(BaseModel):
    scan_id: str
    modality: str
    risk_score: int
    risk_tier: RiskTier
    reason_codes: list[ReasonCode] = []
    extracted_text: Optional[str] = None
    confidence: float
    created_at: datetime

    class Config:
        from_attributes = True


class ScanResponse(BaseModel):
    scan_id: str
    modality: str                 # "text" | "url" | "email" | "qr" | "screenshot"
    risk_score: int = Field(..., ge=0, le=100)
    risk_tier: RiskTier
    reason_codes: list[ReasonCode] = []
    extracted_text: Optional[str] = None   # e.g. OCR/decoded output, if applicable
    confidence: float = Field(..., ge=0, le=1)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
