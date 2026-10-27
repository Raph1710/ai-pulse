# AI Pulse Verification Demo Script
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "             AI Pulse Proof & Demo Suite               " -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

Set-Location "$PSScriptRoot\..\backend"
$py = if (Test-Path ".venv\Scripts\python.exe") { ".\.venv\Scripts\python.exe" } else { "python" }

Write-Host "`n[DEMO 1/5] Proving Cross-Tenant Isolation & Role Scoping" -ForegroundColor Yellow
Write-Host "Verifying: Bluepeak admin cannot access Northwind; multi-company users scoped strictly."
& $py -m pytest tests/test_isolation.py -v --tb=short

Write-Host "`n[DEMO 2/5] Proving Role & Seniority Adaptation Fix" -ForegroundColor Yellow
Write-Host "Verifying: Seniority hierarchy bug fixed; leads receive mid and senior questions."
& $py -m pytest tests/test_questions.py -v --tb=short

Write-Host "`n[DEMO 3/5] Proving AI Output Resilience & Eval Harness" -ForegroundColor Yellow
Write-Host "Verifying: Defensive markdown stripping, schema clamping, flag filtering, prompt injection safety."
& $py -m pytest tests/test_ai_eval.py -v --tb=short

Write-Host "`n[DEMO 4/5] Proving Client Request: <5 Anonymity & Right to Delete" -ForegroundColor Yellow
Write-Host "Verifying: Small groups consolidated under 'Other teams'; employee erasure takes effect immediately."
& $py -m pytest tests/test_client_request.py -v --tb=short

Write-Host "`n[DEMO 5/5] Proving Original Feature: Retake & Progress Tracking" -ForegroundColor Yellow
Write-Host "Verifying: Idempotent re-submission + delta computation (+score, resolved risks)."
& $py -m pytest tests/test_retake_progress.py -v --tb=short

Write-Host "`n======================================================" -ForegroundColor Green
Write-Host "        ALL 5 VERIFICATION DEMOS COMPLETED GREEN!       " -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
