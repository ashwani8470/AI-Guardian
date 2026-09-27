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


# Reserved for any future boolean feature where a raw value of 1 is the SAFE
# signal rather than the risky one (uses_https used to live here until it
# was dropped entirely - see the note in extract_features above). Every
# boolean feature currently in FEATURE_LABELS has 1 = risky, so this is
# empty, but _build_reason_codes still checks it for whichever feature
# needs it next.
INVERTED_BOOL_FEATURES = set()


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
        # uses_https deliberately dropped from features/labels below: in the
        # training dataset phishing URLs use HTTPS ~10x more often than the
        # "legit" sample (free-hosting phishing pages default to HTTPS,
        # while the legit sample skews toward an older HTTP-heavy crawl),
        # so this feature taught the model an inverted, dataset-specific
        # artifact - it was scoring plain https://google.com as phishing.
        # Must stay dropped here in lockstep with train_url_model.py.
        "is_shortener": int(any(s in domain.lower() for s in SHORTENERS)),
        "subdomain_count": max(domain.count(".") - 1, 0),
        "entropy": shannon_entropy(url),
        "has_suspicious_word": int(any(w in url.lower() for w in SUSPICIOUS_WORDS)),
    }

    return features, domain


@lru_cache(maxsize=1)
def _load_model():
    if not MODEL_PATH.exists() or not FEATURES_PATH.exists():
        raise FileNotFoundError(
            f"URL model files not found at {MODELS_DIR}. "
            "Run `python models/train_url_model.py` from the repo root first."
        )
    model = joblib.load(MODEL_PATH)
    feature_columns = joblib.load(FEATURES_PATH)
    return model, feature_columns


def _is_trusted(domain: str, url: str) -> bool:
    """Trusted-domain override, gated against acutely dangerous wording
    (e.g. a compromised .edu subdomain hosting a credential harvester)."""
    domain_lower = domain.lower()
    is_trusted_tld = any(domain_lower.endswith(tld) for tld in TRUSTED_TLDS)
    is_trusted_domain = domain_lower in TRUSTED_DOMAINS or any(
        domain_lower.endswith("." + d) for d in TRUSTED_DOMAINS
    )
    if not (is_trusted_tld or is_trusted_domain):
        return False
    return not any(w in url.lower() for w in HIGH_RISK_WORDS)


def _build_reason_codes(features: dict, verdict: int, top_n: int = 3) -> list[ReasonCode]:
    """Only cite features whose actual value supports the direction of the
    overall verdict - see FEATURE_LABELS / CONTINUOUS_PHISHING_THRESHOLDS
    docstrings above for why this check exists."""
    candidates = []
    for feat_name, labels in FEATURE_LABELS.items():
        value = features.get(feat_name)
        if value is None:
            continue

        if feat_name in CONTINUOUS_PHISHING_THRESHOLDS:
            supports_phishing = value >= CONTINUOUS_PHISHING_THRESHOLDS[feat_name]
        elif feat_name in INVERTED_BOOL_FEATURES:
            supports_phishing = not bool(value)
        else:
            supports_phishing = bool(value)

        cited_direction = 1 if supports_phishing else 0
        if cited_direction != verdict:
            continue

        candidates.append((feat_name, labels[cited_direction], value))

    reason_codes = []
    for feat_name, label, value in candidates[:top_n]:
        reason_codes.append(
            ReasonCode(label=label, weight=1.0, detail=f"{feat_name} = {value}")
        )

    if not reason_codes:
        direction = "phishing" if verdict == 1 else "safe"
        reason_codes.append(
            ReasonCode(
                label=f"No single standout feature, but the overall pattern signals {direction}",
                weight=0.5,
            )
        )
    return reason_codes


def predict_url(url: str) -> ScanResponse:
    model, feature_columns = _load_model()

    features, domain = extract_features(url)
    X = pd.DataFrame([features])[feature_columns]

    proba = model.predict_proba(X)[0]  # [P(safe), P(phishing)]
    phishing_prob = float(proba[1])
    risk_score = int(round(phishing_prob * 100))

    if _is_trusted(domain, url):
        risk_score = min(risk_score, 10)

    if risk_score >= 71:
        risk_tier = RiskTier.DANGEROUS
    elif risk_score >= 31:
        risk_tier = RiskTier.SUSPICIOUS
    else:
        risk_tier = RiskTier.SAFE

    verdict = 1 if risk_score >= 50 else 0
    reason_codes = _build_reason_codes(features, verdict)

    return ScanResponse(
        scan_id=str(uuid.uuid4()),
        modality="url",
        risk_score=risk_score,
        risk_tier=risk_tier,
        reason_codes=reason_codes,
        extracted_text=domain,
        confidence=round(float(max(proba)), 4),
    )