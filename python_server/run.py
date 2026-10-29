import uvicorn
import os
import sys

# Đảm bảo UTF-8 cho stdout trên Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from python_server.config import SERVER_HOST, SERVER_PORT

if __name__ == "__main__":
    print(f"[FPREP] Khoi dong Python Server tren http://{SERVER_HOST}:{SERVER_PORT}")
    uvicorn.run("python_server.main:app", host=SERVER_HOST, port=SERVER_PORT, log_level="info")
