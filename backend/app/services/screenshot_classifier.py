"""
Screenshot scam-detection service.

Pipeline: base64 image -> OCR via pytesseract -> extracted text -> run it
through the EXISTING text_classifier.predict_text() so screenshots inherit
the same TF-IDF + Logistic Regression scoring and reason-code logic as
direct text/SMS scans.

Deep CV forgery/tamper detection (Error Level Analysis etc.) is
deliberately skipped for now, per the project plan's first-thing-to-cut
list - OCR + text-model alone is a reasonable result for this modality
within the 1-month solo timeline.
"""

import base64
import binascii
import uuid
from io import BytesIO

import pytesseract
from PIL import Image

from app.schemas import ReasonCode, RiskTier, ScanResponse
from app.services.text_classifier import predict_text

# Windows doesn't put Tesseract on PATH by default, so point pytesseract at
# the installed binary directly rather than relying on PATH being picked up
# correctly in every terminal (Git Bash, PowerShell, the IDE's run config).
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

# extracted_text is capped before storage, matching email_classifier's
# cleaned[:500] pattern, so a huge screenshot doesn't bloat the DB row.
MAX_STORED_TEXT_LENGTH = 1000
MIN_MEANINGFUL_TEXT_LENGTH = 3


def _decode_base64_image(image_base64: str) -> Image.Image:
    if "," in image_base64 and image_base64.strip().startswith("data:"):
        image_base64 = image_base64.split(",", 1)[1]

    try:
        raw = base64.b64decode(image_base64, validate=False)
    except (binascii.Error, ValueError) as exc:
        raise ValueError("Could not decode base64 image data") from exc

    try:
        return Image.open(BytesIO(raw)).convert("RGB")
    except Exception as exc:
        raise ValueError("Decoded bytes are not a readable image") from exc


def _no_text_found_response() -> ScanResponse:
    return ScanResponse(
        scan_id=str(uuid.uuid4()),
        modality="screenshot",
        risk_score=0,
        risk_tier=RiskTier.SAFE,
        reason_codes=[
            ReasonCode(
                label="No readable text found in screenshot",
                weight=1.0,
                detail="OCR did not extract enough text to analyze",
            )
        ],
        extracted_text=None,
        confidence=0.5,
    )


def predict_screenshot(image_base64: str) -> ScanResponse:
    image = _decode_base64_image(image_base64)

    ocr_text = pytesseract.image_to_string(image).strip()

    if len(ocr_text) < MIN_MEANINGFUL_TEXT_LENGTH:
        return _no_text_found_response()

    prediction = predict_text(content=ocr_text)

    return ScanResponse(
        scan_id=str(uuid.uuid4()),
        modality="screenshot",
        risk_score=prediction["risk_score"],
        risk_tier=RiskTier(prediction["risk_tier"]),
        reason_codes=[ReasonCode(**rc) for rc in prediction["reason_codes"]],
        extracted_text=ocr_text[:MAX_STORED_TEXT_LENGTH],
        confidence=prediction["confidence"],
    )
