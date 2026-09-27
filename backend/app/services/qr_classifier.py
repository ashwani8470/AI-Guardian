"""
QR code scam-detection service.

Pipeline: base64 image -> decode QR via OpenCV's built-in QRCodeDetector
(no external zbar shared library needed, unlike pyzbar - friendlier on
Windows) -> extract embedded text/URL -> run it through the EXISTING
url_classifier.predict_url() so QR scans automatically inherit the same
trusted-domain override and reason-code logic as direct URL scans.

If the decoded payload isn't a URL (e.g. plain text, wifi config, vCard),
it's still returned as extracted_text but scored as safe with a note,
since the URL model isn't applicable to non-URL QR content.
"""

import base64
import binascii
import re
import uuid
from io import BytesIO

import cv2
import numpy as np
from PIL import Image

from app.schemas import ReasonCode, RiskTier, ScanResponse
from app.services.url_classifier import predict_url

_URL_RE = re.compile(r"^https?://", re.IGNORECASE)
# Bare domains without a scheme (e.g. "bit.ly/abc") still look like a link.
_BARE_DOMAIN_RE = re.compile(r"^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(/.*)?$")


def _decode_base64_image(image_base64: str) -> np.ndarray:
    """Accepts a raw base64 string or a data: URI, returns a BGR OpenCV image."""
    if "," in image_base64 and image_base64.strip().startswith("data:"):
        image_base64 = image_base64.split(",", 1)[1]

    try:
        raw = base64.b64decode(image_base64, validate=False)
    except (binascii.Error, ValueError) as exc:
        raise ValueError("Could not decode base64 image data") from exc

    try:
        pil_image = Image.open(BytesIO(raw)).convert("RGB")
    except Exception as exc:
        raise ValueError("Decoded bytes are not a readable image") from exc

    rgb_array = np.array(pil_image)
    bgr_array = cv2.cvtColor(rgb_array, cv2.COLOR_RGB2BGR)
    return bgr_array


def _looks_like_url(text: str) -> bool:
    text = text.strip()
    return bool(_URL_RE.match(text) or _BARE_DOMAIN_RE.match(text))


def _no_qr_found_response() -> ScanResponse:
    return ScanResponse(
        scan_id=str(uuid.uuid4()),
        modality="qr",
        risk_score=0,
        risk_tier=RiskTier.SAFE,
        reason_codes=[
            ReasonCode(
                label="No QR code detected in image",
                weight=1.0,
                detail="The image was readable but no QR code pattern was found in it",
            )
        ],
        extracted_text=None,
        confidence=0.5,
    )


def _non_url_payload_response(decoded_text: str) -> ScanResponse:
    return ScanResponse(
        scan_id=str(uuid.uuid4()),
        modality="qr",
        risk_score=5,
        risk_tier=RiskTier.SAFE,
        reason_codes=[
            ReasonCode(
                label="QR content is not a URL",
                weight=1.0,
                detail="Decoded payload doesn't look like a link, so the URL risk model wasn't applied",
            )
        ],
        extracted_text=decoded_text,
        confidence=0.5,
    )


def predict_qr(image_base64: str) -> ScanResponse:
    image = _decode_base64_image(image_base64)

    detector = cv2.QRCodeDetector()
    decoded_text, points, _ = detector.detectAndDecode(image)

    if not decoded_text:
        return _no_qr_found_response()

    decoded_text = decoded_text.strip()

    if not _looks_like_url(decoded_text):
        return _non_url_payload_response(decoded_text)

    # Reuse the URL classifier end-to-end (trusted-domain override + reason codes),
    # just re-tag the modality and keep the decoded text visible to the user.
    url_result = predict_url(decoded_text)
    return ScanResponse(
        scan_id=url_result.scan_id,
        modality="qr",
        risk_score=url_result.risk_score,
        risk_tier=url_result.risk_tier,
        reason_codes=url_result.reason_codes,
        extracted_text=decoded_text,
        confidence=url_result.confidence,
    )
