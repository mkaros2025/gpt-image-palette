#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_PORT="${BACKEND_PORT:-43175}"
RUN_DIR="$ROOT_DIR/.run"
BACKEND_PID_FILE="$RUN_DIR/backend.pid"

mkdir -p "$RUN_DIR"

kill_port() {
  local port="$1"
  local pids
  pids="$(lsof -ti tcp:"$port" 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    kill $pids >/dev/null 2>&1 || true
  fi
}

cleanup() {
  set +e
  if [ -f "$BACKEND_PID_FILE" ]; then
    kill "$(cat "$BACKEND_PID_FILE")" >/dev/null 2>&1 || true
    rm -f "$BACKEND_PID_FILE"
  fi
  kill_port "$BACKEND_PORT"
  wait >/dev/null 2>&1 || true
}

trap cleanup EXIT INT TERM

if [ -f "$BACKEND_PID_FILE" ] && kill -0 "$(cat "$BACKEND_PID_FILE")" >/dev/null 2>&1; then
  echo "backend already running with pid $(cat "$BACKEND_PID_FILE")" >&2
  exit 1
fi

kill_port "$BACKEND_PORT"

cd "$ROOT_DIR"

./scripts/start-backend.sh &
BACKEND_PID=$!
echo "$BACKEND_PID" > "$BACKEND_PID_FILE"

echo "backend: http://127.0.0.1:${BACKEND_PORT}"
echo "Press Ctrl+C to stop the service."

wait "$BACKEND_PID"
