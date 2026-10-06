"""
Sample (guest) mode.

Lets someone try AI Guardian without an account: they pick one of the preset
examples (safe / in the middle / risky) for a feature and we run the real
classifier on it. Results are not saved to any history.

After DEMO_SCAN_LIMIT scans (counted across ALL features) the visitor has to
log in or sign up. The count is kept on the server per guest id so it can't be
reset just by reloading the page.
"""

import re
import uuid
from typing import Literal

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import DEMO_SCAN_LIMIT
from app.db.database import get_db
from app.db.models import GuestUsage
from app.utils import tier_from_score
from app.schemas import ReasonCode, ScanResponse
from app.services.demo_examples import all_examples, get_example
from app.services.email_classifier import predict_email
from app.services.qr_classifier import predict_qr
from app.services.screenshot_classifier import predict_screenshot
from app.services.text_classifier import predict_text
from app.services.url_classifier import predict_url

router = APIRouter(prefix="/demo", tags=["demo"])

_GUEST_ID_RE = re.compile(r"^[A-Za-z0-9-]{8,64}$")


class DemoScanRequest(BaseModel):
    modality: Literal["text", "url", "email", "qr", "screenshot"]
    example_id: str


class DemoScanResponse(ScanResponse):
    tries_used: int
    tries_limit: int


class DemoStatus(BaseModel):
    tries_used: int
    tries_limit: int


def _guest_id(x_guest_id: str | None) -> str:
    if not x_guest_id or not _GUEST_ID_RE.match(x_guest_id):
        raise HTTPException(status_code=400, detail="Missing or invalid guest id")
    return x_guest_id


def _used(db: Session, guest_id: str) -> int:
    row = db.get(GuestUsage, guest_id)
    return row.used if row else 0


@router.get("/examples")
def list_examples():
    """The preset examples, grouped by feature, plus the try limit."""
    grouped: dict[str, list[dict]] = {}
    for ex in all_examples():
        grouped.setdefault(ex["modality"], []).append(ex)
    return {"limit": DEMO_SCAN_LIMIT, "examples": grouped}


@router.get("/status", response_model=DemoStatus)
def demo_status(x_guest_id: str | None = Header(default=None), db: Session = Depends(get_db)):
    guest_id = _guest_id(x_guest_id)
    return DemoStatus(tries_used=_used(db, guest_id), tries_limit=DEMO_SCAN_LIMIT)


def _from_prediction(modality: str, prediction: dict, extracted_text: str) -> ScanResponse:
    return ScanResponse(
        scan_id=str(uuid.uuid4()),
        modality=modality,
        risk_score=prediction["risk_score"],
        risk_tier=tier_from_score(prediction["risk_score"]),
        reason_codes=[ReasonCode(**rc) for rc in prediction["reason_codes"]],
        extracted_text=extracted_text,
        confidence=prediction["confidence"],
    )


def _run(modality: str, ex: dict) -> ScanResponse:
    if modality == "text":
        return _from_prediction("text", predict_text(content=ex["text"]), ex["text"])
    if modality == "email":
        prediction = predict_email(subject=ex["subject"], body=ex["body"])
        return _from_prediction("email", prediction, prediction["extracted_text"])
    if modality == "url":
        result = predict_url(ex["url"])
        result.extracted_text = ex["url"]
        return result
    if modality == "qr":
        return predict_qr(ex["image_base64"])
    return predict_screenshot(ex["image_base64"])


@router.post("/scan", response_model=DemoScanResponse)
def demo_scan(
    payload: DemoScanRequest,
    x_guest_id: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    guest_id = _guest_id(x_guest_id)

    ex = get_example(payload.example_id, payload.modality)
    if ex is None:
        raise HTTPException(status_code=404, detail="Unknown example")

    row = db.get(GuestUsage, guest_id)
    used = row.used if row else 0
    if used >= DEMO_SCAN_LIMIT:
        raise HTTPException(
            status_code=403,
            detail="You've used all your free sample scans. Please log in or create an account to continue.",
        )

    result = _run(payload.modality, ex)

    if row is None:
        row = GuestUsage(guest_id=guest_id, used=0)
        db.add(row)
    row.used = used + 1
    db.commit()

    return DemoScanResponse(**result.model_dump(), tries_used=row.used, tries_limit=DEMO_SCAN_LIMIT)
