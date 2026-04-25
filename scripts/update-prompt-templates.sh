#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="$ROOT_DIR/frontend/src/data/prompt-templates"
UPSTREAM_DIR="$ROOT_DIR/third_party/awesome-gpt-image-2-prompts"
UPSTREAM_REPO="https://github.com/EvoLinkAI/awesome-gpt-image-2-prompts.git"
UPSTREAM_BRANCH="main"

mkdir -p "$TARGET_DIR"

if [[ "${1:-}" != "--sync-only" ]]; then
  if ! git -C "$ROOT_DIR" diff --quiet || ! git -C "$ROOT_DIR" diff --cached --quiet; then
    echo "Working tree must be clean before git subtree pull." >&2
    echo "Use: bash scripts/update-prompt-templates.sh --sync-only" >&2
    echo "to copy the currently imported subtree snapshot without pulling upstream." >&2
    exit 1
  fi

  git -C "$ROOT_DIR" subtree pull \
    --prefix=third_party/awesome-gpt-image-2-prompts \
    "$UPSTREAM_REPO" \
    "$UPSTREAM_BRANCH" \
    --squash
fi

cp "$UPSTREAM_DIR/gpt_image2_prompts.json" "$TARGET_DIR/awesome-gpt-image-2-prompts.json"
cp "$UPSTREAM_DIR/LICENSE" "$TARGET_DIR/awesome-gpt-image-2-prompts.LICENSE"

echo "Updated prompt templates from EvoLinkAI/awesome-gpt-image-2-prompts"
