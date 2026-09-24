import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/ai_guardian",
)

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-this-before-any-real-deploy")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day, fine for a college project demo

# --- Password reset ---
PASSWORD_RESET_TOKEN_EXPIRE_MINUTES = 30

# The frontend origin used to build the link inside the reset email,
# e.g. "http://localhost:5173". Set FRONTEND_BASE_URL in .env for your
# actual dev/deploy URL.
FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")

# --- SMTP (for sending the reset email) ---
# For Gmail: SMTP_HOST=smtp.gmail.com, SMTP_PORT=587, SMTP_USERNAME=you@gmail.com,
# SMTP_PASSWORD=<16-char App Password, NOT your normal Gmail password>.
# App Passwords require 2-Step Verification to be enabled on the Google account:
# https://myaccount.google.com/apppasswords
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", SMTP_USERNAME)
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "AI Guardian")
