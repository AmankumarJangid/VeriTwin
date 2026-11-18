@echo off
cd /d "%~dp0"
if not exist venv (
    echo [INFO] Creating Python virtual environment...
    python -m venv venv
    call venv\Scripts\activate.bat
    echo [INFO] Installing dependencies from requirements.txt...
    pip install -r requirements.txt
) else (
    call venv\Scripts\activate.bat
)
echo [INFO] Starting VeriTwin Python Watermark Service on port 8000...
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
