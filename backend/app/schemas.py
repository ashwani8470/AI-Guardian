"""
Unified request/response schemas for AI Guardian.

This is the single source of truth for the API contract. Share this file
(or its shape) with Sparsh and the NLP/XAI teammate so every modality
returns data in the same shape — that's what makes the Android app and
dashboard simple to build.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


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

class _ScanRequest(BaseModel):
    """Base for scan requests: whitespace is trimmed so '   ' counts as empty."""
    model_config = ConfigDict(str_strip_whitespace=True)


class TextScanRequest(_ScanRequest):
    content: str = Field(..., min_length=1, max_length=10000, description="Raw SMS/chat text to analyze")


class UrlScanRequest(_ScanRequest):
    url: str = Field(..., min_length=1, max_length=2000)


class EmailScanRequest(_ScanRequest):
    subject: Optional[str] = Field(None, max_length=500)
    body: str = Field(..., min_length=1, max_length=20000)
    sender: Optional[str] = None


class QrScanRequest(_ScanRequest):
    image_base64: str = Field(..., min_length=1, description="Base64-encoded QR code image")


class ScreenshotScanRequest(_ScanRequest):
    image_base64: str = Field(..., min_length=1, description="Base64-encoded screenshot")


# ---- Unified response (every endpoint returns this shape) ----

class UserSignup(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    email: str
    password: str


class UserProfile(BaseModel):
    id: str
    name: str
    email: EmailStr
    phone_number: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class UserProfileUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    phone_number: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)


class DeleteAccountRequest(BaseModel):
    password: str


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

    model_config = ConfigDict(from_attributes=True)


class ScanResponse(BaseModel):
    scan_id: str
    modality: str                 # "text" | "url" | "email" | "qr" | "screenshot"
    risk_score: int = Field(..., ge=0, le=100)
    risk_tier: RiskTier
    reason_codes: list[ReasonCode] = []
    extracted_text: Optional[str] = None   # e.g. OCR/decoded output, if applicable
    confidence: float = Field(..., ge=0, le=1)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
