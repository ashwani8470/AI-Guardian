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

# Human-readable labels for reason codes. Only features with a label here
# can ever surface as a reason - purely numeric/derived features without an
# intuitive story are left out rather than shown as raw column names.
FEATURE_LABELS = {
    "has_ip_address": "URL uses a raw IP address instead of a domain name",
    "has_at_symbol": "URL contains an '@' symbol (can hide the real destination)",
    "is_shortener": "URL uses a known link-shortening service",
    "has_suspicious_word": "URL contains wording commonly used in phishing (login/verify/secure/etc.)",
    "uses_https": "URL does not use HTTPS",
    "subdomain_count": "URL has an unusually high number of subdomains",
    "entropy": "URL has unusually random-looking characters",
    "num_special_chars": "URL contains an unusual number of special characters",
    "digit_ratio": "URL contains an unusually high proportion of digits",
    "url_length": "URL is unusually long",
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
        "path_length": len(path),
        "query_length": len(query),
        "num_dots": url.count("."),
        "num_hyphens": url.count("-"),
        "num_underscores": url.count("_"),
        "num_slashes": url.count("/"),
        "num_digits": digits,
        "digit_ratio": digits / len(url) if url else 0.0,
        "num_special_chars": len(re.findall(r"[^a-zA-Z0-9./:-]", url)),
        "has_ip_address": int(bool(re.match(r"^(\d{1,3}\.){3}\d{1,3}", domain))),
        "has_at_symbol": int("@" in url),
        "uses_https": int(url.lower().startswith("https")),
        "is_shortener": int(any(s in domain.lower() for s in SHORTENERS)),
        "subdomain_count": max(domain.count(".") - 1, 0),
        "entropy": shannon_entropy(url),
        "has_suspicious_word": int(any(w in url.lower() for w in SUSPICIOUS_WORDS)),
    }
    return features, domain


@lru_cache(maxsize=1)
def _load_model():
    """Loaded once per process, same pattern as email/text classifiers."""
    model = joblib.load(MODEL_PATH)
    feature_columns = joblib.load(FEATURES_PATH)
    return model, feature_columns


def _is_trusted_domain(domain: str, url: str) -> bool:
    domain_lower = domain.lower()
    if any(domain_lower.endswith(tld) for tld in TRUSTED_TLDS):
        if not any(w in url.lower() for w in HIGH_RISK_WORDS):
            return True
    if domain_lower in TRUSTED_DOMAINS:
        return True
    return False


def _build_reason_codes(model, feature_columns, feature_dict: dict, prediction: int) -> list[ReasonCode]:
    """
    Rank features by the model's global feature_importances_, then only
    surface ones whose value on THIS url actually points toward the
    predicted class - avoids citing e.g. "uses_https" on a URL that IS
    https just because the feature is globally important overall.
    """
    importances = model.feature_importances_
    ranked = sorted(zip(feature_columns, importances), key=lambda x: x[1], reverse=True)

    reasons: list[ReasonCode] = []
    for feature_name, importance in ranked:
        if len(reasons) >= 3:
            break
        label = FEATURE_LABELS.get(feature_name)
        if not label:
            continue

        value = feature_dict.get(feature_name)
        if feature_name == "uses_https":
            triggered = (value == 0) if prediction == 1 else (value == 1)
        elif feature_name in ("entropy", "num_special_chars", "digit_ratio", "url_length", "subdomain_count"):
            # Descriptive/continuous stats - only meaningful as context when
            # the url was actually flagged.
            triggered = prediction == 1
        else:
            triggered = bool(value) if prediction == 1 else not bool(value)

        if triggered:
            reasons.append(
                ReasonCode(label=label, weight=round(float(importance), 3), detail=f"{feature_name}={value}")
            )

    if not reasons:
        reasons.append(
            ReasonCode(
                label="Flagged by URL pattern model" if prediction == 1 else "No suspicious URL patterns detected",
                weight=round(float(max(importances)), 3),
                detail=None,
            )
        )
    return reasons


def predict_url(url: str) -> ScanResponse:
    model, feature_columns = _load_model()
    feature_dict, domain = extract_features(url)

    if _is_trusted_domain(domain, url):
        return ScanResponse(
            scan_id=str(uuid.uuid4()),
            modality="url",
            risk_score=2,
            risk_tier=RiskTier.SAFE,
            reason_codes=[
                ReasonCode(
                    label="Trusted institutional domain",
                    weight=1.0,
                    detail=f"{domain} matches a trusted domain/TLD override",
                )
            ],
            extracted_text=url,
            confidence=0.95,
        )

    # Single-row DataFrame with the exact training column order - avoids a
    # sklearn "X does not have valid feature names" warning that a bare
    # list/array input would trigger, and guarantees correct column order
    # regardless of dict insertion order.
    feature_df = pd.DataFrame([feature_dict], columns=feature_columns)

    proba = model.predict_proba(feature_df)[0]
    prediction = int(model.predict(feature_df)[0])  # 0 = safe, 1 = phishing

    risk_score = int(round(proba[1] * 100))
    confidence = float(proba[prediction])

    if risk_score <= 30:
        risk_tier = RiskTier.SAFE
    elif risk_score <= 70:
        risk_tier = RiskTier.SUSPICIOUS
    else:
        risk_tier = RiskTier.DANGEROUS

    reason_codes = _build_reason_codes(model, feature_columns, feature_dict, prediction)

    return ScanResponse(
        scan_id=str(uuid.uuid4()),
        modality="url",
        risk_score=risk_score,
        risk_tier=risk_tier,
        reason_codes=reason_codes,
        extracted_text=url,
        confidence=confidence,
    )
