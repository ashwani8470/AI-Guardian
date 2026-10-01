"""
Tests for: full-URL storage, CSV export, delete-history, delete-account.

Runs against a throwaway SQLite file, never the real Postgres database.
DATABASE_URL is overridden BEFORE the app is imported; if the app was already
imported with another database (e.g. by a different test module) the whole
module is skipped instead of risking real data.
"""
import os
import sys

os.environ["DATABASE_URL"] = "sqlite:///./test_account_data.db"
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest

from app.db.database import engine

if not str(engine.url).startswith("sqlite"):
    pytest.skip("app already bound to a non-SQLite database; skipping to protect real data", allow_module_level=True)

from fastapi.testclient import TestClient

from app.db.database import Base
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


def signup(email="a@example.com", password="password123"):
    r = client.post("/auth/signup", json={"name": "Test", "email": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_url_scan_stores_full_url_in_history():
    h = signup()
    url = "http://paytm-kyc-verify.top/update?id=1"
    r = client.post("/predict/url", json={"url": url}, headers=h)
    assert r.status_code == 200
    assert r.json()["extracted_text"] == url
    hist = client.get("/scans", headers=h).json()
    assert hist[0]["extracted_text"] == url
    assert hist[0]["modality"] == "url"


def test_export_csv_contains_scans_and_neutralises_formulas():
    h = signup()
    client.post("/predict/text", json={"content": "=HYPERLINK(\"http://evil.top\",\"click\") win a prize now"}, headers=h)
    r = client.get("/scans/export", headers=h)
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/csv")
    assert "attachment" in r.headers["content-disposition"]
    body = r.text
    assert body.startswith("\ufeff")
    assert "scan_id,date_utc,type" in body
    # parse the CSV and check the scanned-content cell: it must not start with '='
    import csv, io
    rows = list(csv.reader(io.StringIO(body.lstrip("\ufeff"))))
    cell = rows[1][rows[0].index("scanned_content")]
    assert cell.startswith("'=HYPERLINK")


def test_export_requires_login():
    assert client.get("/scans/export").status_code in (401, 403)


def test_delete_history_only_removes_own_scans():
    h1 = signup("one@example.com")
    h2 = signup("two@example.com")
    client.post("/predict/url", json={"url": "https://github.com/"}, headers=h1)
    client.post("/predict/url", json={"url": "https://github.com/"}, headers=h2)
    r = client.delete("/scans", headers=h1)
    assert r.status_code == 200
    assert client.get("/scans", headers=h1).json() == []
    assert len(client.get("/scans", headers=h2).json()) == 1


def test_delete_account_needs_correct_password_then_removes_everything():
    h = signup("gone@example.com", "password123")
    client.post("/predict/url", json={"url": "https://github.com/"}, headers=h)

    bad = client.post("/auth/delete-account", json={"password": "wrong-password"}, headers=h)
    assert bad.status_code == 400
    assert client.get("/auth/me", headers=h).status_code == 200  # still exists

    ok = client.post("/auth/delete-account", json={"password": "password123"}, headers=h)
    assert ok.status_code == 200
    assert client.get("/auth/me", headers=h).status_code == 401  # account gone
    login = client.post("/auth/login", json={"email": "gone@example.com", "password": "password123"})
    assert login.status_code == 401
