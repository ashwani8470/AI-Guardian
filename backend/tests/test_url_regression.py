r"""Regression tests for the URL classifier.

Run from D:\AI-Guardian\backend:   python -m pytest tests -q
Re-run after EVERY retrain of models/url_model.joblib.

These guard against the bug where the same site scored differently depending on
scheme / "www." / trailing slash (google.com/ = 86 but google.com = 35), and
where well-known sites were flagged as scams.
"""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.services.url_classifier import predict_url  # noqa: E402

SAFE_SITES = [
    "https://www.google.com/", "https://github.com/", "https://www.wikipedia.org/",
    "https://www.youtube.com/", "https://www.amazon.in/", "https://www.flipkart.com/",
    "https://en.wikipedia.org/wiki/India", "https://www.linkedin.com/in/someone",
    "https://github.com/torvalds/linux", "https://psit.ac.in/", "https://www.hdfcbank.com/",
    "https://stackoverflow.com/questions/12345/how-to-use-spring-boot",
]

PHISHING = [
    "http://secure-login-verify-paypal.tk/account/websvr?id=12",
    "http://paypal-secure-update.xyz/login",
    "http://192.168.1.5/verify/bank.php",
    "http://sbi-netbanking-kyc-update.000webhostapp.com/login.php",
    "http://amazon.account-verify.info/signin?id=99283",
    "http://paytm-kyc-verify.top/update",
    "http://hdfc-bank-kyc.online/",
]

SHORTENERS = ["http://bit.ly/3xYzAb", "https://tinyurl.com/abc123"]


@pytest.mark.parametrize("url", SAFE_SITES)
def test_popular_sites_are_safe(url):
    assert predict_url(url).risk_score <= 30, url


@pytest.mark.parametrize("url", PHISHING)
def test_phishing_is_dangerous(url):
    assert predict_url(url).risk_score >= 71, url


@pytest.mark.parametrize("url", SHORTENERS)
def test_shorteners_never_trusted(url):
    assert predict_url(url).risk_score >= 31, url


@pytest.mark.parametrize("variants", [
    ("https://www.google.com/", "https://www.google.com", "http://google.com", "google.com/", "google.com"),
    ("http://paypal-secure-update.xyz/login", "https://www.paypal-secure-update.xyz/login"),
])
def test_same_site_same_score_regardless_of_spelling(variants):
    scores = {predict_url(u).risk_score for u in variants}
    assert len(scores) == 1, f"spelling changed the score: {scores}"
