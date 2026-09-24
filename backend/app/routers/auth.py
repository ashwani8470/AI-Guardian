from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import FRONTEND_BASE_URL, PASSWORD_RESET_TOKEN_EXPIRE_MINUTES
from app.core.email import send_password_reset_email
from app.core.security import (
    create_access_token,
    decode_access_token,
    generate_password_reset_token,
    hash_password,
    hash_reset_token,
    verify_password,
)
from app.db.database import get_db
from app.db.models import PasswordResetToken, User
from app.schemas import (
    ForgotPasswordRequest,
    MessageResponse,
    ResetPasswordRequest,
    Token,
    UserLogin,
    UserSignup,
)

router = APIRouter(prefix="/auth", tags=["auth"])

# HTTPBearer gives a simple "paste your token" box in /docs Authorize,
# instead of OAuth2PasswordBearer's username/password login form.
security_scheme = HTTPBearer()


@router.post("/signup", response_model=Token)
def signup(payload: UserSignup, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(name=payload.name, email=payload.email, hashed_password=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(subject=user.id)
    return Token(access_token=token)


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    token = create_access_token(subject=user.id)
    return Token(access_token=token)


_GENERIC_FORGOT_PASSWORD_MESSAGE = (
    "If an account exists for that email, a reset link has been sent."
)


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Always returns the same generic message, whether or not the email is
    registered — this stops the endpoint being used to check which emails
    have an account (a common security requirement for this kind of route).
    """
    user = db.query(User).filter(User.email == payload.email).first()

    if user:
        raw_token, token_hash = generate_password_reset_token()
        expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=PASSWORD_RESET_TOKEN_EXPIRE_MINUTES
        )
        db.add(
            PasswordResetToken(
                user_id=user.id,
                token_hash=token_hash,
                expires_at=expires_at,
            )
        )
        db.commit()

        reset_url = f"{FRONTEND_BASE_URL}/reset-password?token={raw_token}"
        try:
            send_password_reset_email(user.email, reset_url)
        except Exception as e:
            # Don't leak SMTP/config failures to the client (same reason we
            # don't reveal whether the email was registered) — but do log
            # it server-side so it's obvious during local testing/demo why
            # an email never arrived.
            print(f"[forgot-password] failed to send reset email to {user.email}: {e}")

    return MessageResponse(message=_GENERIC_FORGOT_PASSWORD_MESSAGE)


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    token_hash = hash_reset_token(payload.token)
    reset_token = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token_hash == token_hash)
        .first()
    )

    now = datetime.now(timezone.utc)
    if (
        reset_token is None
        or reset_token.used_at is not None
        or reset_token.expires_at.replace(tzinfo=timezone.utc) < now
    ):
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    user = db.query(User).filter(User.id == reset_token.user_id).first()
    if user is None:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    user.hashed_password = hash_password(payload.new_password)
    reset_token.used_at = now

    # Invalidate any other outstanding reset requests for this user too,
    # so an old, unused link can't still be used after a successful reset.
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used_at.is_(None),
    ).update({"used_at": now})

    db.commit()
    return MessageResponse(message="Your password has been reset. You can now log in.")


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Dependency to protect any route: add `current_user: User = Depends(get_current_user)`
    to a route's arguments and FastAPI will require a Bearer token automatically.
    In /docs, click "Authorize" and paste just the raw token (no "Bearer " prefix needed).
    """
    token = credentials.credentials
    user_id = decode_access_token(token)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user
