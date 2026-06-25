#!/bin/bash
#
# SessionStart hook for Claude Code on the web.
#
# A fresh remote session starts with no node_modules, so yarn typecheck,
# yarn test and yarn build all fail (e.g. "tsc: not found", "vite: not found")
# until dependencies are installed. This hook installs them, and fetches the
# Playwright browser build that the pinned @playwright/test version expects so
# the test suite can run.
#
# Runs synchronously so dependencies are guaranteed ready before the agent
# starts. Idempotent and non-interactive.
set -euo pipefail

cd "$CLAUDE_PROJECT_DIR"

# Install JS dependencies (uses yarn's cache; safe to re-run).
yarn install

# Install the Chromium build that the pinned Playwright version needs so
# `yarn test` works. Skipped automatically if already present.
yarn playwright install chromium

echo "session-start hook complete: dependencies and Playwright browser ready"
