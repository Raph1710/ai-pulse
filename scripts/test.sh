#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR/backend"

if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
fi

python -m pytest -v
