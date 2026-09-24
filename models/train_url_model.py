"""
Train the URL phishing classifier for AI Guardian (solo prototype).

Approach: Random Forest on 16 hand-crafted URL features (length, entropy,
digit ratio, shortener detection, etc.) — same approach used for the
mini-project's URL classifier (89% accuracy).

Dataset: harisudhan411/phishing-and-legitimate-urls (Kaggle).
Label convention in the raw file: status=1 -> legitimate, status=0 -> phishing
(verified against sample URLs: status=1 rows are real sites like rgipt.ac.in,
iracing.com; status=0 rows are disposable-hosting phishing patterns like
*.godaddysites.com, *.wcomhost.com). This script flips that to match our
convention: label 0 = safe, label 1 = scam/phishing.

Expected input: data/urls.csv (columns: url, status)
Output: models/url_model.joblib, models/url_vectorizer.joblib
        (vectorizer here is actually a fitted feature-scaler/column-order
        holder, kept for naming consistency with the text/email pipeline)
"""

import math
import re
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

DATA_PATH = Path("data/urls.csv")
MODEL_OUT = Path("models/url_model.joblib")
FEATURES_OUT = Path("models/url_feature_columns.joblib")

RANDOM_STATE = 42

SHORTENERS = {
    "bit.ly", "tinyurl.com", "goo.gl", "t.co", "ow.ly", "is.gd",
    "buff.ly", "adf.ly", "bit.do", "rb.gy", "cutt.ly",
}

SUSPICIOUS_WORDS = [
    "login", "verify", "secure", "account", "update", "confirm",
    "bank", "signin", "webscr", "password", "suspend",
]


def shannon_entropy(s: str) -> float:
    if not s:
        return 0.0
    counts = Counter(s)
    probs = [c / len(s) for c in counts.values()]
    return -sum(p * math.log2(p) for p in probs)


def extract_features(url: str) -> dict:
    url = str(url).strip()
    # Ensure a scheme so urlparse extracts netloc/path correctly
    parse_target = url if re.match(r"^https?://", url) else "http://" + url
    try:
        parsed = urlparse(parse_target)
        domain = parsed.netloc
        path = parsed.path or ""
        query = parsed.query or ""
    except ValueError:
        # Malformed URL (e.g. broken IPv6-looking brackets) - fall back to
        # treating the whole string as an opaque domain so training/inference
        # doesn't crash on a handful of garbage rows.
        domain = url
        path = ""
        query = ""

    digits = sum(c.isdigit() for c in url)
    letters = sum(c.isalpha() for c in url)

    return {
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


# --- 1. Load data ---
df = pd.read_csv(DATA_PATH)
df = df.dropna(subset=["url", "status"])
df = df.drop_duplicates(subset=["url"])

# Flip label convention: raw status=1 (legit) -> our label 0 (safe)
#                         raw status=0 (phishing) -> our label 1 (scam)
df["label"] = 1 - df["status"].astype(int)

print(f"Loaded {len(df)} unique rows ({(df['label']==0).sum()} safe / {(df['label']==1).sum()} phishing)")

# --- 2. Extract features on the full dataset ---
feature_rows = [extract_features(u) for u in df["url"]]
X = pd.DataFrame(feature_rows)
y = df["label"]

feature_columns = list(X.columns)

# --- 3. Train/test split ---
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
)
# --- 4. Train ---
model = RandomForestClassifier(
    n_estimators=100,
    max_depth=15,
    min_samples_leaf=10,
    min_samples_split=20,
    random_state=RANDOM_STATE,
    class_weight="balanced",
    n_jobs=-1,
)
model.fit(X_train, y_train)

# --- 5. Evaluate ---
y_pred = model.predict(X_test)
acc = accuracy_score(y_test, y_pred)
print(f"\nTest accuracy: {acc:.4f}\n")
print(classification_report(y_test, y_pred, target_names=["safe", "phishing"]))

# --- 6. Save model + feature column order (needed at inference time) ---
MODEL_OUT.parent.mkdir(parents=True, exist_ok=True)
joblib.dump(model, MODEL_OUT)
joblib.dump(feature_columns, FEATURES_OUT)
print(f"\nSaved model -> {MODEL_OUT}")
print(f"Saved feature column order -> {FEATURES_OUT}")
