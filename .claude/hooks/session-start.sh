#!/bin/bash
#
# SessionStart hook for Claude Code on the web.
#
# Prepares a freshly-cloned container so that `yarn test` and `yarn typecheck`
# work straight away:
#
#   1. Installs node_modules (a fresh clone has none).
#   2. Downloads the Playwright browser build that the pinned @playwright/test
#      actually asks for.
#
# Step 2 is the important one. The web container pre-seeds
# PLAYWRIGHT_BROWSERS_PATH (/opt/pw-browsers) with whatever Chromium build was
# current when the image was baked. When that build number differs from the one
# the repo's pinned Playwright expects, every browser test dies at launch with
#
#   Error: browserType.launch: Executable doesn't exist at
#   /opt/pw-browsers/chromium_headless_shell-<N>/chrome-linux/headless_shell
#
# All 200+ tests fail identically, which reads like a broken main branch rather
# than a broken environment. `playwright install` is version-aware and idempotent:
# it fetches the expected build if missing and is a no-op once present.

set -euo pipefail

# Local checkouts manage their own toolchain; this is a web-container fix only.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"

echo "[session-start] Installing node modules..."
yarn install --frozen-lockfile

echo "[session-start] Ensuring the pinned Playwright Chromium build is present..."
if ! npx playwright install chromium; then
  echo "[session-start] ERROR: could not provision Chromium for Playwright." >&2
  echo "[session-start] Browser tests will fail at launch until this is resolved." >&2
  echo "[session-start] PLAYWRIGHT_BROWSERS_PATH=${PLAYWRIGHT_BROWSERS_PATH:-<unset>}" >&2
  exit 1
fi

echo "[session-start] Ready: yarn typecheck and yarn test should both run."
