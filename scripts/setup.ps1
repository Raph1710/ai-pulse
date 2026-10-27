# AI Pulse One-Command Setup Script (PowerShell)
Write-Host "=== Setting up AI Pulse ===" -ForegroundColor Cyan

# 1. Backend environment
Write-Host "`n1. Configuring Backend..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\..\backend"

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created backend/.env from .env.example" -ForegroundColor Green
}

if (-not (Test-Path ".venv")) {
    Write-Host "Creating Python virtual environment (.venv)..."
    # Prefer Python 3.13 or 3.12 if available through launcher
    if (Get-Command py -ErrorAction SilentlyContinue) {
        py -3.13 -m venv .venv
    } else {
        python -m venv .venv
    }
}

Write-Host "Installing backend dependencies..."
.\.venv\Scripts\pip install -r requirements.txt

Write-Host "Seeding database..."
.\.venv\Scripts\python -m app.seed

# 2. Frontend environment
Write-Host "`n2. Configuring Frontend..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\..\frontend"
npm install

Set-Location "$PSScriptRoot\.."
Write-Host "`n=== Setup Complete! ===" -ForegroundColor Green
Write-Host "To run backend: cd backend; .\.venv\Scripts\python -m uvicorn app.main:app --reload"
Write-Host "To run frontend: cd frontend; npm run dev"
Write-Host "To run tests:    .\scripts\test.ps1"
