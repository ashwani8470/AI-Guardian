from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import DATABASE_URL

# Always use the psycopg2 driver we install. Hosts often hand out "postgres://"
# or plain "postgresql://"; the former is rejected by SQLAlchemy 2 and the
# latter picks a different default driver on newer SQLAlchemy versions.
_db_url = DATABASE_URL
for _prefix in ("postgres://", "postgresql://"):
    if _db_url.startswith(_prefix):
        _db_url = "postgresql+psycopg2://" + _db_url[len(_prefix):]
        break

# pool_pre_ping: hosted Postgres drops idle connections; test each one before use.
engine = create_engine(_db_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency - yields a DB session, closes it after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
