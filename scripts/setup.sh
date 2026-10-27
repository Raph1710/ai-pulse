#!/usr/bin/env bash
set -e

echo "=== Setting up AI Pulse ==="

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# 1. Backend environment
echo "1. Configuring Backend..."
cd "$ROOT_DIR/backend"

if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "Created backend/.env from .env.example"
fi

if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi

source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
python -m app.seed

# 2. Frontend environment
echo "2. Configuring Frontend..."
cd "$ROOT_DIR/frontend"
npm install

echo "=== Setup Complete! ==="
echo "To run backend: cd backend && source .venv/bin/activate && uvicorn app.main:app --reload"
echo "To run frontend: cd frontend && npm run dev"
echo "To run tests:    ./scripts/test.sh"
