# Run all backend tests
Set-Location "$PSScriptRoot\..\backend"
if (Test-Path ".venv\Scripts\python.exe") {
    .\.venv\Scripts\python.exe -m pytest -v
} else {
    python -m pytest -v
}
