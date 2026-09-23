"""
train_email_model.py
Trains a TF-IDF + Logistic Regression phishing-email classifier
on the subhajournal/phishingemails Kaggle dataset.

Dataset: https://www.kaggle.com/datasets/subhajournal/phishingemails
Columns: "Email Text", "Email Type" (values: "Phishing Email", "Safe Email")

Download the CSV from Kaggle first (e.g. via `kaggle datasets download -d
subhajournal/phishingemails` or the website), unzip it, and place it at
data/emails.csv relative to this script (adjust DATA_PATH below if different).

Run: python train_email_model.py
Output: models/email_model.joblib, models/email_vectorizer.joblib
"""

import os
import re

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split

DATA_PATH = "data/emails.csv"
MODEL_DIR = "models"
MODEL_PATH = os.path.join(MODEL_DIR, "email_model.joblib")
VECTORIZER_PATH = os.path.join(MODEL_DIR, "email_vectorizer.joblib")


def clean_text(text: str) -> str:
    """Light cleanup: lowercase, strip URLs/emails/extra whitespace.
    Kept light on purpose — TF-IDF + LogReg benefits from raw phrasing
    (urgency words, links-as-tokens) rather than heavy normalization."""
    text = str(text).lower()
    text = re.sub(r"http\S+|www\.\S+", " URLTOKEN ", text)
    text = re.sub(r"\S+@\S+", " EMAILTOKEN ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def load_data(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)

    # Normalize expected column names in case of casing/spacing differences
    df.columns = [c.strip() for c in df.columns]
    text_col = "Email Text" if "Email Text" in df.columns else df.columns[0]
    label_col = "Email Type" if "Email Type" in df.columns else df.columns[1]

    df = df[[text_col, label_col]].rename(
        columns={text_col: "text", label_col: "label"}
    )
    df = df.dropna(subset=["text", "label"])

    # Map to binary: 1 = phishing, 0 = safe
    df["target"] = df["label"].str.contains("phishing", case=False, na=False).astype(int)
    df["clean_text"] = df["text"].apply(clean_text)
    return df


def train():
    print(f"Loading data from {DATA_PATH} ...")
    df = load_data(DATA_PATH)
    print(f"Loaded {len(df)} rows. Class balance:\n{df['target'].value_counts()}")

    X_train, X_test, y_train, y_test = train_test_split(
        df["clean_text"], df["target"], test_size=0.2, random_state=42, stratify=df["target"]
    )

    vectorizer = TfidfVectorizer(
        max_features=10000,
        ngram_range=(1, 2),
        stop_words="english",
        sublinear_tf=True,
    )
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)

    model = LogisticRegression(max_iter=1000, C=1.0, class_weight="balanced")
    model.fit(X_train_vec, y_train)

    preds = model.predict(X_test_vec)
    acc = accuracy_score(y_test, preds)
    print(f"\nTest accuracy: {acc:.4f}\n")
    print(classification_report(y_test, preds, target_names=["Safe", "Phishing"]))

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    joblib.dump(vectorizer, VECTORIZER_PATH)
    print(f"\nSaved model to {MODEL_PATH}")
    print(f"Saved vectorizer to {VECTORIZER_PATH}")


if __name__ == "__main__":
    train()
