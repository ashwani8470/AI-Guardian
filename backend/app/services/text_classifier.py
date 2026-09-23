"""
Text/SMS scam classifier service.

Loads the trained TF-IDF + Logistic Regression model once (cached),
cleans incoming text the same way it was cleaned at training time,
and returns a risk_score, confidence, and top contributing words as
explainability — same response shape as the email classifier so the
frontend's RiskResult.jsx can render both without changes.
"""

import re
from functools import lru_cache

from pathlib import Path
import joblib
import numpy as np


MODELS_DIR = Path(__file__).resolve().parents[3] / "models"
MODEL_PATH = MODELS_DIR / "text_model.joblib"
VECTORIZER_PATH = MODELS_DIR / "text_vectorizer.joblib"

@lru_cache(maxsize=1)
def _load_model():
    model = joblib.load(MODEL_PATH)
    vectorizer = joblib.load(VECTORIZER_PATH)
    return model, vectorizer


def clean_text(text: str) -> str:
    text = str(text).lower()
    text = re.sub(r"http\S+|www\.\S+", " URLTOKEN ", text)
    text = re.sub(r"\b\d{10,}\b", " PHONETOKEN ", text)
    text = re.sub(r"[^a-z\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


TOKEN_LABELS = {
    "urltoken": "contains a link",
    "phonetoken": "contains a phone number",
}


def predict_text(content: str) -> dict:
    model, vectorizer = _load_model()

    cleaned = clean_text(content)
    vec = vectorizer.transform([cleaned])

    proba = model.predict_proba(vec)[0]  # [P(safe), P(scam)]
    scam_prob = proba[1]
    predicted_class = int(scam_prob >= 0.5)

    risk_score = round(float(scam_prob) * 100)
    confidence = round(float(max(proba)), 4)

    # Explainability: top contributing words in the winning direction only
    feature_names = np.array(vectorizer.get_feature_names_out())
    coefs = model.coef_[0]
    word_indices = vec.nonzero()[1]

    contributions = []
    for idx in word_indices:
        weight = coefs[idx] * vec[0, idx]
        contributions.append((feature_names[idx], weight))

    # Only keep words pushing in the same direction as the verdict
    if predicted_class == 1:
        contributions = [c for c in contributions if c[1] > 0]
        contributions.sort(key=lambda x: -x[1])
    else:
        contributions = [c for c in contributions if c[1] < 0]
        contributions.sort(key=lambda x: x[1])

    top_words = [w for w, wt in contributions[:3]]
    top_weights = [wt for _, wt in contributions[:3]]

    reason_codes = []
    for word, weight in zip(top_words, top_weights):
        label = TOKEN_LABELS.get(word, word)
        reason_codes.append({
            "label": label,
            "weight": round(abs(float(weight)), 4),
            "detail": f"'{label}' contributed to this result",
        })

    return {
        "risk_score": risk_score,
        "risk_tier": "dangerous" if risk_score >= 71 else "suspicious" if risk_score >= 31 else "safe",
        "confidence": confidence,
        "reason_codes": reason_codes,
    }
