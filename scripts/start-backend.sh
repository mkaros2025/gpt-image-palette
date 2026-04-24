#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_PORT="${BACKEND_PORT:-43175}"

cd "$ROOT_DIR"

exec env PORT="$BACKEND_PORT" npm run dev -w backend
