# Quick-start script for the backend
Write-Host "=== MockingBird — Backend ===" -ForegroundColor Cyan

$envPath = "backend\.env"
if (!(Test-Path $envPath)) {
    Write-Host "ERROR: $envPath not found. Copy .env.example to .env and add your GROQ_API_KEY." -ForegroundColor Red
    exit 1
}

$groqKey = Select-String -Path $envPath -Pattern "^GROQ_API_KEY=(.+)$" | ForEach-Object { $_.Matches.Groups[1].Value }
if (-not $groqKey -or $groqKey -eq "your_groq_api_key_here") {
    Write-Host "ERROR: Please set a valid GROQ_API_KEY in backend\.env" -ForegroundColor Red
    Write-Host "Get one at: https://console.groq.com/keys" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ GROQ_API_KEY found" -ForegroundColor Green

cd backend
.\venv\Scripts\Activate.ps1

Write-Host "`nStarting FastAPI server on http://localhost:8000 …" -ForegroundColor Cyan
Write-Host "Docs:  http://localhost:8000/docs`n" -ForegroundColor Gray

uvicorn app.main:app --reload --port 8000
