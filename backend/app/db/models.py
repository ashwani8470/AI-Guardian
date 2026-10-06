import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.database import Base


def utc_now():
    """Naive UTC timestamp (matches the plain DateTime columns below)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def gen_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    phone_number = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    address = Column(String, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    scans = relationship("Scan", back_populates="user")


class PasswordResetToken(Base):
    """
    A password-reset request. We never store the raw token — only its
    SHA-256 hash — so a leaked DB row can't be used to reset the account
    (same principle as password hashing). The raw token only ever exists
    in the emailed link and briefly in memory on the server.
    """
    __tablename__ = "password_reset_tokens"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    token_hash = Column(String(64), unique=True, index=True, nullable=False)  # sha256 hex digest
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    user = relationship("User")


class Scan(Base):
    __tablename__ = "scans"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    modality = Column(String, nullable=False)          # text | url | email | qr | screenshot
    risk_score = Column(Integer, nullable=False)
    risk_tier = Column(String, nullable=False)          # safe | suspicious | dangerous
    confidence = Column(Float, nullable=False)
    extracted_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, index=True)

    user = relationship("User", back_populates="scans")
    reports = relationship("ThreatReport", back_populates="scan")


class ThreatReport(Base):
    """One row per reason-code returned by the XAI engine for a given scan."""
    __tablename__ = "threat_reports"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    scan_id = Column(String(36), ForeignKey("scans.id"), nullable=False, index=True)
    label = Column(String, nullable=False)
    weight = Column(Float, nullable=False)
    detail = Column(Text, nullable=True)

    scan = relationship("Scan", back_populates="reports")


class GuestUsage(Base):
    """
    How many sample-mode scans a not-logged-in visitor has used. The browser
    makes up a random guest id and sends it in the X-Guest-Id header; the
    server counts there, so clearing the page's JS state doesn't reset it.
    """
    __tablename__ = "guest_usage"

    guest_id = Column(String(64), primary_key=True)
    used = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
