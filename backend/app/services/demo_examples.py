"""
Preset examples for sample (guest) mode.

Every scan feature has three: one clearly safe, one "in the middle" (suspicious)
and one clearly risky. This file is the single source of truth - the frontend
fetches them from GET /demo/examples, and POST /demo/scan runs the real
classifiers on them by id, so guests only ever scan these presets.
"""

import base64
import io
from functools import lru_cache

import cv2
from PIL import Image, ImageDraw, ImageFont

_TEXTS = [
    ("text-safe", "safe", "Normal message",
     "Hey, are we still meeting at 6 pm? I'll be at the canteen near the library."),
    ("text-middle", "middle", "Delivery notice",
     "Your parcel is held at the depot. Confirm your address to reschedule delivery."),
    ("text-risky", "risky", "Fake bank alert",
     "URGENT: Your SBI account is blocked. Update your KYC now or your account will be closed. "
     "Click http://sbi-kyc-update.top/verify and share your OTP."),
]

_URLS = [
    ("url-safe", "safe", "Normal link", "https://github.com/"),
    ("url-middle", "middle", "Free-offer link", "http://free-recharge-offer.xyz/claim"),
    ("url-risky", "risky", "Phishing-style link", "http://paytm-kyc-verify.top/update"),
]

_EMAILS = [
    ("email-safe", "safe", "Normal email",
     "Assignment submission reminder",
     "Hi all, a reminder that the DBMS assignment is due on Friday. Please upload your PDF on the "
     "portal before 5 pm. Thanks."),
    ("email-middle", "middle", "Subscription renewal",
     "Your subscription is about to renew",
     "Your subscription will renew tomorrow. If you did not authorise this, click here to manage "
     "your payment details."),
    ("email-risky", "risky", "Account suspended",
     "Urgent: Your account has been suspended",
     "Dear user, we detected unusual activity. Your account will be closed within 24 hours unless "
     "you verify your password here: http://secure-login-verify.top/account. Failure to act will "
     "result in permanent suspension."),
]

# QR codes encode the same links as the URL examples.
_QRS = [
    ("qr-safe", "safe", "Normal QR code", "https://github.com/"),
    ("qr-middle", "middle", "Free-offer QR code", "http://free-recharge-offer.xyz/claim"),
    ("qr-risky", "risky", "Phishing-style QR code", "http://paytm-kyc-verify.top/update"),
]

_SCREENSHOTS = [
    ("shot-safe", "safe", "Normal chat message", [
        "Rahul",
        "Hey, are we still meeting at 6 pm?",
        "I'll be at the canteen near the library.",
    ]),
    ("shot-middle", "middle", "Courier message", [
        "Courier update",
        "Your parcel is held at the depot.",
        "Confirm your address to reschedule delivery.",
    ]),
    ("shot-risky", "risky", "Fake payment request", [
        "Collect request",
        "Congratulations! You have won a prize. Rs 4,999 is waiting to be credited.",
        "Enter your UPI PIN now to receive the money.",
        "Urgent: request expires in 10 minutes or your account will be blocked.",
    ]),
]


def _png_b64(image: Image.Image) -> str:
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


@lru_cache(maxsize=None)
def _qr_image_b64(payload: str) -> str:
    code = cv2.QRCodeEncoder.create().encode(payload)
    code = cv2.copyMakeBorder(code, 4, 4, 4, 4, cv2.BORDER_CONSTANT, value=255)  # quiet zone
    code = cv2.resize(code, None, fx=8, fy=8, interpolation=cv2.INTER_NEAREST)
    return _png_b64(Image.fromarray(code).convert("RGB"))


def _wrap(draw: ImageDraw.ImageDraw, text: str, font, max_width: int) -> list[str]:
    lines, current = [], ""
    for word in text.split():
        trial = f"{current} {word}".strip()
        if draw.textlength(trial, font=font) <= max_width:
            current = trial
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


@lru_cache(maxsize=None)
def _screenshot_image_b64(lines: tuple[str, ...]) -> str:
    width, margin = 760, 36
    title_font = ImageFont.load_default(size=40)
    body_font = ImageFont.load_default(size=30)
    probe = ImageDraw.Draw(Image.new("RGB", (width, 10)))
    wrapped = [_wrap(probe, ln, body_font if i else title_font, width - 2 * margin) for i, ln in enumerate(lines)]
    height = margin * 2 + sum(len(w) * (46 if i else 58) + 14 for i, w in enumerate(wrapped))
    image = Image.new("RGB", (width, max(height, 220)), "white")
    draw = ImageDraw.Draw(image)
    y = margin
    for i, group in enumerate(wrapped):
        font = body_font if i else title_font
        for line in group:
            draw.text((margin, y), line, fill="black", font=font)
            y += 46 if i else 58
        y += 14
    return _png_b64(image)


def _build() -> list[dict]:
    items: list[dict] = []
    for id_, tone, title, text in _TEXTS:
        items.append({"id": id_, "modality": "text", "tone": tone, "title": title, "text": text})
    for id_, tone, title, url in _URLS:
        items.append({"id": id_, "modality": "url", "tone": tone, "title": title, "url": url})
    for id_, tone, title, subject, body in _EMAILS:
        items.append({"id": id_, "modality": "email", "tone": tone, "title": title,
                      "subject": subject, "body": body})
    for id_, tone, title, payload in _QRS:
        items.append({"id": id_, "modality": "qr", "tone": tone, "title": title,
                      "image_base64": _qr_image_b64(payload)})
    for id_, tone, title, lines in _SCREENSHOTS:
        items.append({"id": id_, "modality": "screenshot", "tone": tone, "title": title,
                      "image_base64": _screenshot_image_b64(tuple(lines))})
    return items


@lru_cache(maxsize=1)
def all_examples() -> tuple[dict, ...]:
    return tuple(_build())


def get_example(example_id: str, modality: str) -> dict | None:
    for ex in all_examples():
        if ex["id"] == example_id and ex["modality"] == modality:
            return ex
    return None
