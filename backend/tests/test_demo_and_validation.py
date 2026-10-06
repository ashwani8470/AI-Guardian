"""
Tests for: sample (guest) mode, empty-input validation, Hindi/Hinglish rules,
and the password-reset flow. Runs against a throwaway SQLite file.
"""
import os
import sys

os.environ["DATABASE_URL"] = "sqlite:///./test_demo.db"
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest

from app.db.database import engine

if not str(engine.url).startswith("sqlite"):
    pytest.skip("app already bound to a non-SQLite database; skipping to protect real data", allow_module_level=True)

from fastapi.testclient import TestClient

from app.db.database import Base
from app.main import app
from app.services.text_classifier import predict_text

client = TestClient(app)
GUEST = {"X-Guest-Id": "guest-test-0001"}


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


def auth_headers():
    r = client.post("/auth/signup", json={"name": "T", "email": "t@example.com", "password": "password123"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


# ---------------- sample (guest) mode ----------------

def test_examples_cover_every_feature_with_safe_middle_risky():
    data = client.get("/demo/examples").json()
    assert data["limit"] == 3
    assert set(data["examples"]) == {"text", "url", "email", "qr", "screenshot"}
    for modality, items in data["examples"].items():
        assert [e["tone"] for e in items] == ["safe", "middle", "risky"], modality


def test_example_scores_match_their_tone():
    ranges = {"safe": (0, 30), "middle": (31, 70), "risky": (71, 100)}
    # Use a fresh guest id per scan so the 3-try limit doesn't interfere.
    for i, ex in enumerate(e for items in client.get("/demo/examples").json()["examples"].values() for e in items):
        r = client.post("/demo/scan", json={"modality": ex["modality"], "example_id": ex["id"]},
                        headers={"X-Guest-Id": f"guest-range-{i:04d}"})
        assert r.status_code == 200, r.text
        lo, hi = ranges[ex["tone"]]
        assert lo <= r.json()["risk_score"] <= hi, (ex["id"], r.json()["risk_score"])


def test_guest_limit_is_three_scans_across_all_features():
    for modality, example_id, used in [("url", "url-risky", 1), ("email", "email-safe", 2), ("qr", "qr-middle", 3)]:
        r = client.post("/demo/scan", json={"modality": modality, "example_id": example_id}, headers=GUEST)
        assert r.status_code == 200, r.text
        assert r.json()["tries_used"] == used
    r = client.post("/demo/scan", json={"modality": "text", "example_id": "text-safe"}, headers=GUEST)
    assert r.status_code == 403
    assert client.get("/demo/status", headers=GUEST).json() == {"tries_used": 3, "tries_limit": 3}


def test_guest_scans_are_not_saved_and_other_guests_are_unaffected():
    client.post("/demo/scan", json={"modality": "text", "example_id": "text-risky"}, headers=GUEST)
    headers = auth_headers()
    assert client.get("/scans", headers=headers).json() == []
    assert client.get("/demo/status", headers={"X-Guest-Id": "someone-else-1234"}).json()["tries_used"] == 0


def test_demo_rejects_unknown_examples_and_bad_guest_ids():
    assert client.post("/demo/scan", json={"modality": "text", "example_id": "nope"}, headers=GUEST).status_code == 404
    assert client.post("/demo/scan", json={"modality": "text", "example_id": "url-safe"}, headers=GUEST).status_code == 404
    assert client.post("/demo/scan", json={"modality": "text", "example_id": "text-safe"}).status_code == 400
    bad = {"X-Guest-Id": "x"}
    assert client.get("/demo/status", headers=bad).status_code == 400


def test_real_scan_endpoints_still_require_login():
    for path, body in [("/predict/text", {"content": "hi"}), ("/predict/url", {"url": "https://a.com"}),
                       ("/predict/email", {"body": "hi"})]:
        assert client.post(path, json=body, headers=GUEST).status_code in (401, 403), path


# ---------------- empty-input validation ----------------

@pytest.mark.parametrize("path,body", [
    ("/predict/text", {"content": ""}),
    ("/predict/text", {"content": "   "}),
    ("/predict/url", {"url": ""}),
    ("/predict/email", {"subject": "x", "body": " "}),
    ("/predict/qr", {"image_base64": ""}),
    ("/predict/screenshot", {"image_base64": ""}),
])
def test_empty_input_is_rejected_and_not_saved(path, body):
    headers = auth_headers()
    assert client.post(path, json=body, headers=headers).status_code == 422
    assert client.get("/scans", headers=headers).json() == []


# ---------------- Hindi / Hinglish ----------------

def test_hindi_scam_is_flagged_not_safe():
    r = predict_text("आपका खाता बंद हो जाएगा, तुरंत KYC अपडेट करें और OTP भेजें")
    assert r["risk_tier"] == "dangerous"
    assert any("OTP" in rc["label"] for rc in r["reason_codes"])


def test_hinglish_scam_is_flagged():
    assert predict_text("Aapka khata band ho jayega, turant KYC update karein link par click karein")["risk_tier"] == "dangerous"


def test_unrecognised_hindi_is_never_called_safe():
    r = predict_text("कल शाम को मिलते हैं")
    assert r["risk_tier"] != "safe" and r["confidence"] <= 0.5


def test_plain_english_is_untouched_by_language_rules():
    assert predict_text("Hey, are we meeting at 6 pm?")["risk_tier"] == "safe"
    assert predict_text("Your OTP is 123456. Do not share it with anyone.")["risk_tier"] == "safe"


# ---------------- password reset (naive-UTC handling) ----------------

def test_password_reset_flow_and_expiry(monkeypatch):
    import app.routers.auth as auth_router
    from datetime import timedelta
    from app.db.database import SessionLocal
    from app.db.models import PasswordResetToken

    auth_headers()
    sent = {}
    monkeypatch.setattr(auth_router, "send_password_reset_email", lambda to, url: sent.update(url=url))
    assert client.post("/auth/forgot-password", json={"email": "t@example.com"}).status_code == 200
    token = sent["url"].split("token=")[1]

    # expire it -> rejected
    with SessionLocal() as db:
        row = db.query(PasswordResetToken).first()
        row.expires_at = row.expires_at - timedelta(hours=2)
        db.commit()
    assert client.post("/auth/reset-password", json={"token": token, "new_password": "newpass123"}).status_code == 400

    # fresh token -> works once
    client.post("/auth/forgot-password", json={"email": "t@example.com"})
    token = sent["url"].split("token=")[1]
    assert client.post("/auth/reset-password", json={"token": token, "new_password": "newpass123"}).status_code == 200
    assert client.post("/auth/reset-password", json={"token": token, "new_password": "other12345"}).status_code == 400
    assert client.post("/auth/login", json={"email": "t@example.com", "password": "newpass123"}).status_code == 200
