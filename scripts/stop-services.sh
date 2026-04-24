#!/bin/bash
set -euo pipefail

pkill -f "tsx watch src/server.ts" >/dev/null 2>&1 || true
pkill -f "vite --host 127.0.0.1 --port 43174" >/dev/null 2>&1 || true
