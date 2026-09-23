"""
Loads the trained email phishing model (models/email_model.joblib +
models/email_vectorizer.joblib, produced by models/train_email_model.py)
and exposes predict_email() for the /predict/email router.

Model files live outside the backend/ package (in the repo-root models/
folder) so training and serving stay decoupled - retraining never
requires touching backend code.
"""

import re
from functools import lru_cache
from pathlib import Path

import joblib

# backend/app/services/email_classifier.py -> parents[3] is the repo root
# (services -> app -> backend -> repo root)
MODELS_DIR = Path(__file__).resolve().parents[3] / "models"
MODEL_PATH = MODELS_DIR / "email_model.joblib"
VECTORIZER_PATH = MODELS_DIR / "email_vectorizer.joblib"


def clean_text(text: str) -> str:
    """Must exactly match the preprocessing used in models/train_email_model.py,
    or predictions will be inconsistent with training."""
    text = str(text).lower()
    text = re.sub(r"http\S+|www\.\S+", " URLTOKEN ", text)
    text = re.sub(r"\S+@\S+", " EMAILTOKEN ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


@lru_cache(maxsize=1)
def _load():
    """Loaded once per process and cached - joblib.load() is not free."""
    if not MODEL_PATH.exists() or not VECTORIZER_PATH.exists():
        raise FileNotFoundError(
            f"Email model files not found at {MODELS_DIR}. "
            "Run `python models/train_email_model.py` from the repo root first."
        )
    vectorizer = joblib.load(VECTORIZER_PATH)
    model = joblib.load(MODEL_PATH)
    return vectorizer, model


def predict_email(subject: str | None, body: str) -> dict:
    """
    Returns:
        {
            "risk_score": int (0-100),
            "confidence": float (0-1),
            "reason_codes": [{"label": str, "weight": float}, ...],
            "extracted_text": str,  # the cleaned text actually scored
        }
    """
    vectorizer, model = _load()

    combined = f"{subject or ''} {body}".strip()
    cleaned = clean_text(combined)

    vec = vectorizer.transform([cleaned])
    proba = model.predict_proba(vec)[0]  # [P(safe), P(phishing)]
    phishing_proba = float(proba[1])

    risk_score = int(round(phishing_proba * 100))
    confidence = float(max(proba))

    reason_codes = _top_contributing_words(vectorizer, model, vec, phishing_proba)

    return {
        "risk_score": risk_score,
        "confidence": confidence,
        "reason_codes": reason_codes,
        "extracted_text": cleaned[:500],  # cap length stored in DB
    }


# Internal preprocessing placeholders (see clean_text) mapped to human-readable labels
_TOKEN_LABELS = {
    "urltoken": "contains a link",
    "emailtoken": "contains an email address",
}


def _readable(word: str) -> str:
    return _TOKEN_LABELS.get(word, f"'{word}'")


def _top_contributing_words(vectorizer, model, vec, phishing_proba: float, top_n: int = 3) -> list[dict]:
    """
    Explainability: for the words actually present in this email, rank them
    by (tfidf_value * logistic_regression_coefficient) - the words that
    pushed this specific prediction toward phishing (or safe) the most.

    Only words pointing in the SAME direction as the overall verdict are
    shown - a word that leans safe should never appear as a reason inside
    a result that says "this looks like phishing", and vice versa.
    """
    feature_names = vectorizer.get_feature_names_out()
    coefs = model.coef_[0]  # phishing-direction coefficient per feature

    verdict_is_phishing = phishing_proba >= 0.5

    row = vec.tocoo()
    contributions = [(feature_names[col], row_data * coefs[col]) for col, row_data in zip(row.col, row.data)]

    # Keep only contributions that agree with the overall verdict's direction
    if verdict_is_phishing:
        contributions = [c for c in contributions if c[1] > 0]
    else:
        contributions = [c for c in contributions if c[1] < 0]

    if not contributions:
        fallback_direction = "phishing" if verdict_is_phishing else "safe"
        return [{"label": f"No individual standout words, but the overall pattern signals {fallback_direction}", "weight": 0.5}]

    contributions.sort(key=lambda x: abs(x[1]), reverse=True)
    top = contributions[:top_n]

    max_abs = max(abs(w) for _, w in top) or 1.0
    direction = "phishing" if verdict_is_phishing else "safe"
    reason_codes = []
    for word, weight in top:
        reason_codes.append(
            {
                "label": f"{_readable(word)} — signals {direction}",
                "weight": round(min(abs(weight) / max_abs, 1.0), 3),
            }
        )
    return reason_codes
