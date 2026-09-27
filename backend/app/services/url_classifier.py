"""
URL phishing classifier service for AI Guardian (solo prototype).

Loads the trained Random Forest model + feature column order and produces
a ScanResponse for a given URL.

Feature extraction mirrors models/train_url_model.py EXACTLY (18 hand-crafted
features). Any drift between training and inference feature code will
silently corrupt predictions, since RandomForest has no way to detect that
column N means something different at inference time than it did at
training time - keep this function in sync with train_url_model.py if either
ever changes.
"""

import math
import re
import uuid
from collections import Counter
from functools import lru_cache
from pathlib import Path
from urllib.parse import urlparse

import joblib
import pandas as pd

from app.schemas import ReasonCode, RiskTier, ScanResponse

# Same Path(__file__).resolve().parents[N] pattern as email_classifier.py /
# text_classifier.py - never a bare relative string (known gotcha).
MODELS_DIR = Path(__file__).resolve().parents[3] / "models"
MODEL_PATH = MODELS_DIR / "url_model.joblib"
FEATURES_PATH = MODELS_DIR / "url_feature_columns.joblib"

SHORTENERS = {
    "bit.ly", "tinyurl.com", "goo.gl", "t.co", "ow.ly", "is.gd",
    "buff.ly", "adf.ly", "bit.do", "rb.gy", "cutt.ly",
}

SUSPICIOUS_WORDS = [
    "login", "verify", "secure", "account", "update", "confirm",
    "bank", "signin", "webscr", "password", "suspend",
]

# Gate for the trusted-domain override: an institutional domain is only
# treated as trusted if the URL doesn't ALSO contain acutely dangerous
# wording (e.g. a compromised .edu subdomain hosting a credential harvester).
# Mirrors the mini-project's override logic.
HIGH_RISK_WORDS = ["verify", "suspend", "password", "webscr", "confirm"]

TRUSTED_TLDS = (".ac.in", ".edu", ".gov", ".edu.in", ".gov.in", ".nic.in")
TRUSTED_DOMAINS = {"examly.io"}

# Direction-aware labels: each feature has a sentence for when it's cited as
# evidence toward a PHISHING verdict (key 1) and one for when it's cited
# toward a SAFE verdict (key 0). This avoids printing e.g. "does not use
# HTTPS" next to a value showing it DOES use HTTPS - the old single-label
# version assumed every citation was phishing-framed, which broke the moment
# a feature got cited in support of a safe prediction.
FEATURE_LABELS = {
    "has_ip_address": {
        1: "URL uses a raw IP address instead of a domain name",
        0: "URL uses a proper domain name, not a raw IP",
    },
    "has_at_symbol": {
        1: "URL contains an '@' symbol (can hide the real destination)",
        0: "URL does not contain a suspicious '@' symbol",
    },
    "is_shortener": {
        1: "URL uses a known link-shortening service",
        0: "URL does not use a link-shortening service",
    },
    "has_suspicious_word": {
        1: "URL contains wording commonly used in phishing (login/verify/secure/etc.)",
        0: "URL does not contain common phishing-related wording",
    },
    "uses_https": {
        1: "URL does not use HTTPS",
        0: "URL uses HTTPS",
    },
    "subdomain_count": {
        1: "URL has an unusually high number of subdomains",
        0: "URL has a typical number of subdomains",
    },
    "entropy": {
        1: "URL has unusually random-looking characters",
        0: "URL's characters don't look unusually random",
    },
    "num_special_chars": {
        1: "URL contains an unusual number of special characters",
        0: "URL doesn't contain an unusual number of special characters",
    },
    "digit_ratio": {
        1: "URL contains an unusually high proportion of digits",
        0: "URL doesn't contain an unusually high proportion of digits",
    },
    "url_length": {
        1: "URL is unusually long",
        0: "URL length looks typical",
    },
}

# Rough, literature-informed thresholds used ONLY to decide whether a
# continuous feature's actual value supports citing it as evidence toward a
# PHISHING verdict. Being globally important to the model isn't the same as
# this url's value looking unusual - without this check, a phishing
# prediction would cite e.g. digit_ratio=0.0 as "unusually high", which is
# false on its face regardless of what the model's overall decision was.
CONTINUOUS_PHISHING_THRESHOLDS = {
    "url_length": 54,
    "subdomain_count": 3,
    "entropy": 4.0,
    "num_special_chars": 5,
    "digit_ratio": 0.15,
}


def shannon_entropy(s: str) -> float:
    if not s:
        return 0.0
    counts = Counter(s)
    probs = [c / len(s) for c in counts.values()]
    return -sum(p * math.log2(p) for p in probs)


def extract_features(url: str) -> tuple[dict, str]:
    """Returns (feature_dict, domain). Identical logic to train_url_model.py."""
    url = str(url).strip()
    parse_target = url if re.match(r"^https?://", url) else "http://" + url
    try:
        parsed = urlparse(parse_target)
        domain = parsed.netloc
        path = parsed.path or ""
        query = parsed.query or ""
    except ValueError:
        # Malformed URL (e.g. broken IPv6-looking brackets) - same fallback
        # used in training so a live scan never crashes on garbage input.
        domain = url
        path = ""
        query = ""

    digits = sum(c.isdigit() for c in url)

    features = {
        "url_length": len(url),
        "domain_length": len(domain),