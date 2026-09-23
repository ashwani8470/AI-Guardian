"""
Train the text/SMS scam classifier for AI Guardian (solo prototype).

Approach: TF-IDF + Logistic Regression — same approach used for the
mini-project's text classifier (98% accuracy) and this repo's email
classifier (96.83% accuracy).

Dataset: UCI SMS Spam Collection (Kaggle mirror commonly has columns
v1 (label: ham/spam) and v2 (message text)). This script auto-detects
common column-name variants so it works with slightly different CSV
exports without editing.

Expected input: data/sms.csv
Output: models/text_model.joblib, models/text_vectorizer.joblib
"""

import re
import pandas as pd
import joblib
from pathlib import Path
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

DATA_PATH = Path("data/sms.csv")
MODEL_OUT = Path("models/text_model.joblib")
VECTORIZER_OUT = Path("models/text_vectorizer.joblib")

# --- 1. Load data, handling common column-name variants ---
df = pd.read_csv(DATA_PATH, encoding="latin-1")

# UCI SMS Spam Collection commonly ships as v1/v2 with extra unnamed cols
col_map_candidates = [
    ("v1", "v2"),
    ("label", "message"),
    ("Category", "Message"),
    ("label", "text"),
]
label_col, text_col = None, None
for lc, tc in col_map_candidates:
    if lc in df.columns and tc in df.columns:
        label_col, text_col = lc, tc
        break

if label_col is None:
    raise ValueError(
        f"Couldn't find expected label/text columns. Found columns: {list(df.columns)}. "
        "Edit col_map_candidates in this script to match your CSV."
    )

df = df[[label_col, text_col]].rename(columns={label_col: "label", text_col: "text"})
df = df.dropna(subset=["text"])
df["label"] = df["label"].str.strip().str.lower().map({"ham": 0, "spam": 1, "safe": 0, "scam": 1})
df = df.dropna(subset=["label"])
df["label"] = df["label"].astype(int)

print(f"Loaded {len(df)} rows ({(df['label']==0).sum()} safe / {(df['label']==1).sum()} scam)")


# --- 2. Clean text (same style as the email classifier: normalize URLs/numbers) ---
def clean_text(text: str) -> str:
    text = str(text).lower()
    text = re.sub(r"http\S+|www\.\S+", " URLTOKEN ", text)
    text = re.sub(r"\b\d{10,}\b", " PHONETOKEN ", text)  # long digit runs -> phone numbers
    text = re.sub(r"[^a-z\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


df["clean_text"] = df["text"].apply(clean_text)

# --- 3. Train/test split ---
X_train, X_test, y_train, y_test = train_test_split(
    df["clean_text"], df["label"], test_size=0.2, random_state=42, stratify=df["label"]
)

# --- 4. Vectorize + train ---
vectorizer = TfidfVectorizer(max_features=5000, ngram_range=(1, 2))
X_train_vec = vectorizer.fit_transform(X_train)
X_test_vec = vectorizer.transform(X_test)

model = LogisticRegression(max_iter=1000, class_weight="balanced")
model.fit(X_train_vec, y_train)

# --- 5. Evaluate ---
y_pred = model.predict(X_test_vec)
acc = accuracy_score(y_test, y_pred)
print(f"\nTest accuracy: {acc:.4f}\n")
print(classification_report(y_test, y_pred, target_names=["safe", "scam"]))

# --- 6. Save ---
MODEL_OUT.parent.mkdir(parents=True, exist_ok=True)
joblib.dump(model, MODEL_OUT)
joblib.dump(vectorizer, VECTORIZER_OUT)
print(f"\nSaved model -> {MODEL_OUT}")
print(f"Saved vectorizer -> {VECTORIZER_OUT}")
