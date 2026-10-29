import os
from pathlib import Path
from dotenv import load_dotenv

# Tìm file .env.local ở thư mục gốc của project
ROOT_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT_DIR / ".env.local"

if ENV_FILE.exists():
    load_dotenv(ENV_FILE)
else:
    load_dotenv()

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or SUPABASE_ANON_KEY
JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "fprep-lms-jwt-secret-secure-2026")

SERVER_HOST = os.getenv("PYTHON_SERVER_HOST", "127.0.0.1")
SERVER_PORT = int(os.getenv("PYTHON_SERVER_PORT", "8000"))
