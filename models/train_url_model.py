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

import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

DATA_PATH = Path("data/urls.csv")
# Augmentation set: real top-10k-domain homepage URLs (https://domain,
# https://www.domain, http://domain), all labeled legitimate (status=1).
# Added because the base dataset's "legitimate" class is almost entirely
# deep content-page links (articles, blog posts) with long paths, while its
# "phishing" class is mostly bare/shallow paths - path_length and
# num_slashes ended up being >50% of the model's decision weight, so it
# learned "short path = phishing" and flagged plain homepage visits like
# https://www.google.com. This file has none of the base dataset's own
# rows, so it's optional - training still works if it's absent.
AUGMENT_PATH = Path("data/urls_augment.csv")
MODEL_OUT = Path("models/url_model.joblib")
FEATURES_OUT = Path("models/url_feature_columns.joblib")

RANDOM_STATE = 42


# Single source of truth for feature extraction: training imports the exact
# function used at inference time, so the two can never drift apart again.
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from app.services.url_classifier import extract_features as _extract  # noqa: E402


def extract_features(url: str) -> dict:
    return _extract(url)[0]


# --- 1. Load data ---
df = pd.read_csv(DATA_PATH)
if AUGMENT_PATH.exists():
    augment_df = pd.read_csv(AUGMENT_PATH)
    df = pd.concat([df, augment_df], ignore_index=True)
    print(f"Added {len(augment_df)} homepage-URL augmentation rows from {AUGMENT_PATH}")
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
