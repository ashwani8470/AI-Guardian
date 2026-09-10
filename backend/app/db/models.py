import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.database import Base


def gen_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    scans = relationship("Scan", back_populates="user")


class Scan(Base):
    __tablename__ = "scans"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    modality = Column(String, nullable=False)          # text | url | email | qr | screenshot
    risk_score = Column(Integer, nullable=False)
    risk_tier = Column(String, nullable=False)          # safe | suspicious | dangerous
    confidence = Column(Float, nullable=False)
    extracted_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

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
