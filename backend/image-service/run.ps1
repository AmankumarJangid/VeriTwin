# Run Python Image Service in Windows PowerShell
Set-Location $PSScriptRoot

if (-not (Test-Path "venv")) {
    Write-Host "[INFO] Creating Python virtual environment..." -ForegroundColor Cyan
    python -m venv venv
    & ".\venv\Scripts\Activate.ps1"
    Write-Host "[INFO] Installing dependencies..." -ForegroundColor Cyan
    pip install -r requirements.txt
} else {
    & ".\venv\Scripts\Activate.ps1"
}

Write-Host "[INFO] Starting VeriTwin Python Watermark Service on port 8000..." -ForegroundColor Green
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
