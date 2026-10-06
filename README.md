# AI Guardian

A web platform that checks whether a **message, email, link, QR code or payment screenshot** is a scam, and explains why.

Built solo by Ashwani Kumar Singh (B.Tech CS-AI, PSIT Kanpur).

| Scan type | How it works | Test accuracy |
|---|---|---|
| Text / SMS | TF-IDF + Logistic Regression (UCI SMS Spam Collection) | 98.2% |
| Email | TF-IDF + Logistic Regression (Kaggle phishing emails, 18.6K rows) | 96.8% |
| Link / URL | Random Forest on 17 URL features (838K rows) + trusted-domain allowlist | ~83.6% |
| QR code | OpenCV decodes the QR, the payload goes through the URL model | – |
| Screenshot | Tesseract OCR reads the text, the text model scores it | – |

Every result has a 0–100 risk score, a tier (Safe / Suspicious / Dangerous) and "Why was this flagged?" reasons.

## Tech stack
- **Backend:** FastAPI, Uvicorn, PostgreSQL, SQLAlchemy, JWT auth
- **ML:** scikit-learn, OpenCV, pytesseract
- **Frontend:** React 19, Vite, Tailwind CSS

## Project layout
```
backend/   FastAPI app (app/routers, app/services, app/db), tests/
Frontend/  React + Vite dashboard
models/    trained .joblib models, training scripts, trusted_domains.txt
data/      training datasets (see data/README.md)
```

## Setup

### 1. Requirements
Python 3.10+, Node.js 18+, PostgreSQL, and [Tesseract OCR](https://github.com/UB-Mannheim/tesseract/wiki) (needed only for screenshot scans).

### 2. Database
Create an empty PostgreSQL database (e.g. `ai_guardian_ind`). Tables are created automatically on first start.

### 3. Backend
```bash
cd backend
python -m venv venv
source venv/Scripts/activate        # Git Bash on Windows (PowerShell: venv\Scripts\Activate.ps1)
pip install -r requirements.txt
cp .env.example .env                # then edit .env: DATABASE_URL, SECRET_KEY, SMTP_*
uvicorn app.main:app --reload
```
API docs: http://127.0.0.1:8000/docs

If Tesseract is not in `C:\Program Files\Tesseract-OCR\`, set `TESSERACT_CMD` in `.env`.

### 4. Frontend
```bash
cd Frontend
npm install
npm run dev
```
Open http://localhost:5173. If Vite uses a different port, add it to `CORS_ORIGINS` in `backend/.env`.

### 5. Tests
```bash
cd backend
pip install pytest
python -m pytest tests -q
```

## Models
Trained models are committed in `models/`, so you do **not** need to train anything to run the app. To retrain, download the datasets listed in `data/README.md`, then run from the repo root with the backend venv active:
```bash
python models/train_email_model.py
python models/train_text_model.py
python models/train_url_model.py
```
After retraining the URL model, run the tests again.

## Design notes and limitations
- **URLs are normalized** (scheme, `www.` and trailing `/` removed) before feature extraction. Without this the model treated a trailing slash as a phishing signal and flagged google.com.
- **Trusted-domain allowlist** (`models/trusted_domains.txt`) matches exact hostnames only, never subdomains, and never link shorteners. Institutional domains (`.ac.in`, `.edu`, `.gov`, `.gov.in`, `.nic.in`) are also trusted unless the URL has high-risk wording.
- The URL model alone is weaker on short homepages of small, unknown sites, so treat the score as a risk indicator, not a verdict.
- **Screenshot scans read text only.** They find scam messages inside screenshots but cannot tell whether a payment screenshot was edited or faked.
- Predictions are statistical. Do not rely on them as the only check before sending money or credentials.

## Sample mode (try without an account)

The home page has a **Try sample mode** button next to *Log in* / *Create an account*. It opens the
normal app without a login. On every scan page the visitor gets three examples - **Safe**,
**In the middle** and **Risky** - that fill the input box; pressing the check button runs the real
model on them. The examples live in `backend/app/services/demo_examples.py` (served by
`GET /demo/examples`).

* Limit: **3 scans in total across all features** (change with `DEMO_SCAN_LIMIT` in `backend/.env`).
  The count is kept on the server per browser (`X-Guest-Id`), so reloading doesn't reset it.
* After the last free scan the result stays readable; the next click shows a login / sign-up wall.
* Sample scans are never saved; History, My account and Check-many-links need a real account.
