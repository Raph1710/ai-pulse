#!/usr/bin/env bash
set -e

echo "======================================================"
echo "             AI Pulse Proof & Demo Suite               "
echo "======================================================"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR/backend"

if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
fi

echo -e "\n[DEMO 1/5] Proving Cross-Tenant Isolation & Role Scoping"
python -m pytest tests/test_isolation.py -v --tb=short

echo -e "\n[DEMO 2/5] Proving Role & Seniority Adaptation Fix"
python -m pytest tests/test_questions.py -v --tb=short

echo -e "\n[DEMO 3/5] Proving AI Output Resilience & Eval Harness"
python -m pytest tests/test_ai_eval.py -v --tb=short

echo -e "\n[DEMO 4/5] Proving Client Request: <5 Anonymity & Right to Delete"
python -m pytest tests/test_client_request.py -v --tb=short

echo -e "\n[DEMO 5/5] Proving Original Feature: Retake & Progress Tracking"
python -m pytest tests/test_retake_progress.py -v --tb=short

echo -e "\n======================================================"
echo "        ALL 5 VERIFICATION DEMOS COMPLETED GREEN!       "
echo "======================================================"
