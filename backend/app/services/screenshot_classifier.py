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
import os
import re
import uuid
from io import BytesIO
from pathlib import Path

import numpy as np
import pytesseract
from PIL import Image, ImageOps

from app.schemas import ReasonCode, RiskTier, ScanResponse
from app.services.text_classifier import predict_text

# Tesseract location: TESSERACT_CMD env var wins; otherwise the usual Windows
# install path if it exists; otherwise rely on PATH (Linux/macOS/Docker).
_WINDOWS_TESSERACT = Path(r"C:\Program Files\Tesseract-OCR\tesseract.exe")
if os.getenv("TESSERACT_CMD"):
    pytesseract.pytesseract.tesseract_cmd = os.environ["TESSERACT_CMD"]
elif _WINDOWS_TESSERACT.exists():
    pytesseract.pytesseract.tesseract_cmd = str(_WINDOWS_TESSERACT)

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


# Words that are app chrome, not message content. The text model was trained on
# spam SMS, so words like "send"/"amount"/"paid" on a genuine payment screen
# pushed real payment chats to ~52 (Suspicious). Dates, times and these labels
# are removed before scoring; the raw OCR text is still what gets stored/shown.
_UI_NOISE_WORDS = {"paid", "received", "send", "again", "enter", "amount", "chat", "pm", "am"}
_MONTHS = {
    "january", "february", "march", "april", "may", "june", "july",
    "august", "september", "october", "november", "december",
}
_MIN_MESSAGE_WORDS = 2


def _preprocess_for_ocr(image: Image.Image) -> Image.Image:
    """Dark-theme screenshots (light text on dark bg) OCR badly: invert them,
    then upscale 2x and stretch contrast."""
    gray = ImageOps.grayscale(image)
    if np.asarray(gray).mean() < 110:
        gray = ImageOps.invert(gray)
    gray = gray.resize((gray.width * 2, gray.height * 2), Image.LANCZOS)
    return ImageOps.autocontrast(gray)


def _clean_ocr_text(text: str) -> str:
    text = re.sub(r"\b\d{1,2}:\d{2}\s?(am|pm)?\b", " ", text, flags=re.IGNORECASE)
    words = re.findall(r"[A-Za-z]{3,}", text)
    return " ".join(
        w for w in words if w.lower() not in _UI_NOISE_WORDS and w.lower() not in _MONTHS
    )


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


def _no_message_text_response(ocr_text: str) -> ScanResponse:
    return ScanResponse(
        scan_id=str(uuid.uuid4()),
        modality="screenshot",
        risk_score=5,
        risk_tier=RiskTier.SAFE,
        reason_codes=[
            ReasonCode(
                label="No scam-style message text found (looks like an app or payment screen)",
                weight=1.0,
                detail="This check reads text only - it cannot tell whether a payment screenshot was edited",
            )
        ],
        extracted_text=ocr_text[:MAX_STORED_TEXT_LENGTH],
        confidence=0.5,
    )


def predict_screenshot(image_base64: str) -> ScanResponse:
    image = _decode_base64_image(image_base64)

    ocr_text = pytesseract.image_to_string(
        _preprocess_for_ocr(image), config="--psm 6"
    ).strip()

    if len(ocr_text) < MIN_MEANINGFUL_TEXT_LENGTH:
        return _no_text_found_response()

    cleaned = _clean_ocr_text(ocr_text)
    if len(cleaned.split()) < _MIN_MESSAGE_WORDS:
        return _no_message_text_response(ocr_text)

    prediction = predict_text(content=cleaned)

    reason_codes = [ReasonCode(**rc) for rc in prediction["reason_codes"]]
    if not reason_codes:
        # The text model returns no reason codes when nothing stands out; never
        # leave the "Why was this flagged?" panel empty.
        is_risky = prediction["risk_tier"] != RiskTier.SAFE.value
        reason_codes.append(
            ReasonCode(
                label=(
                    "No single standout word, but the overall wording looks scam-like"
                    if is_risky
                    else "No scam-style wording found in the text of this screenshot"
                ),
                weight=0.5,
            )
        )

    return ScanResponse(
        scan_id=str(uuid.uuid4()),
        modality="screenshot",
        risk_score=prediction["risk_score"],
        risk_tier=RiskTier(prediction["risk_tier"]),
        reason_codes=reason_codes,
        extracted_text=ocr_text[:MAX_STORED_TEXT_LENGTH],
        confidence=prediction["confidence"],
    )
