import os

# Tests need a SECRET_KEY but must never depend on a real .env file.
os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-production")
