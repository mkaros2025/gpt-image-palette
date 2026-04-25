#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="$ROOT_DIR/frontend/src/data/prompt-templates"
SUBMODULE_PATH="third_party/awesome-gpt-image-2-prompts"
SUBMODULE_DIR="$ROOT_DIR/$SUBMODULE_PATH"

mkdir -p "$TARGET_DIR"

if [[ "${1:-}" != "--sync-only" ]]; then
  git -C "$ROOT_DIR" submodule update --init --remote "$SUBMODULE_PATH"
elif [[ ! -f "$SUBMODULE_DIR/gpt_image2_prompts.json" ]]; then
  git -C "$ROOT_DIR" submodule update --init "$SUBMODULE_PATH"
fi

cp "$SUBMODULE_DIR/gpt_image2_prompts.json" "$TARGET_DIR/awesome-gpt-image-2-prompts.json"
cp "$SUBMODULE_DIR/LICENSE" "$TARGET_DIR/awesome-gpt-image-2-prompts.LICENSE"

echo "Updated prompt templates from $SUBMODULE_PATH"
