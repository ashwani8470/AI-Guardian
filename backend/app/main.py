from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.database import Base, engine
from app.routers import auth, email, history, qr, screenshot, text, url

app = FastAPI(
    title="AI Guardian API",
    description="Multi-modal scam detection backend",
    version="0.1.0",
)

# Creates tables on startup if they don't exist yet. Fine for a college
# project; a real deployment would use Alembic migrations instead.
Base.metadata.create_all(bind=engine)

# TODO: restrict allow_origins to the actual dashboard/app origin before deploying
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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


@app.get("/")
def root():
    return {"status": "ok", "service": "AI Guardian API"}


@app.get("/health")
def health():
    return {"status": "healthy"}
