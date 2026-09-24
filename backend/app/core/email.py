"""
Minimal SMTP email sending — used for password-reset emails.

Uses only the Python standard library (smtplib + email.mime), so no new
package needs to be added to requirements.txt.

Configure via .env: SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD,
SMTP_FROM_EMAIL, SMTP_FROM_NAME. For Gmail, see the comment in config.py
next to SMTP_HOST for how to generate an App Password.
"""

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import (
    SMTP_FROM_EMAIL,
    SMTP_FROM_NAME,
    SMTP_HOST,
    SMTP_PASSWORD,
    SMTP_PORT,
    SMTP_USERNAME,
)


def send_email(to_email: str, subject: str, html_body: str, text_body: str) -> None:
    if not SMTP_HOST or not SMTP_USERNAME or not SMTP_PASSWORD:
        raise RuntimeError(
            "SMTP is not configured. Set SMTP_HOST, SMTP_USERNAME, and "
            "SMTP_PASSWORD in .env before password-reset emails can be sent."
        )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
    msg["To"] = to_email
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.sendmail(SMTP_FROM_EMAIL, [to_email], msg.as_string())


def send_password_reset_email(to_email: str, reset_url: str) -> None:
    subject = "Reset your AI Guardian password"
    text_body = (
        f"We received a request to reset your AI Guardian password.\n\n"
        f"Reset it here (valid for 30 minutes):\n{reset_url}\n\n"
        f"If you didn't request this, you can safely ignore this email."
    )
    html_body = f"""
    <div style="font-family: Inter, Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color:#0F1720;">Reset your password</h2>
      <p style="color:#333;">We received a request to reset your AI Guardian password.
      This link is valid for 30 minutes.</p>
      <p style="margin: 24px 0;">
        <a href="{reset_url}"
           style="background:#3DDC97;color:#0F1720;padding:10px 20px;
                  border-radius:6px;text-decoration:none;font-weight:600;">
          Reset password
        </a>
      </p>
      <p style="color:#888;font-size:13px;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
    """
    send_email(to_email, subject, html_body, text_body)
