from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import CORS_ORIGINS
from app.db.database import Base, engine
from app.routers import auth, demo, email, history, qr, screenshot, text, url

app = FastAPI(
    title="AI Guardian API",
    description="Multi-modal scam detection backend",
    version="0.1.0",
)

# Creates tables on startup if they don't exist yet. Fine for a college
# project; a real deployment would use Alembic migrations instead.
Base.metadata.create_all(bind=engine)

# Only the configured frontend origins may call the API from a browser
# (see CORS_ORIGINS in app/core/config.py / .env).
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(text.router)
app.include_router(url.router)
app.include_router(email.router)
app.include_router(qr.router)
app.include_router(screenshot.router)
app.include_router(history.router)
app.include_router(demo.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "AI Guardian API"}


@app.get("/health")
def health():
    return {"status": "healthy"}
