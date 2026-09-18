#!/usr/bin/env bash
#
# Assemble the GitHub Pages tree.
#
# One script, called by both jobs in .github/workflows/pr-preview.yml, so the
# PR preview is the same site as production rather than a second arrangement of
# the same files. It used to be two hand-written copy blocks with a landing page
# generated inline in each; they drifted, and the trial harness ended up
# published by both and linked by neither.
#
# The rules this script keeps:
#
#   * It copies. It never renames a file on the way and never generates a page.
#     Every published path therefore exists in the repository at the same path,
#     so a link that resolves under `yarn dev` resolves on the deployed site.
#     (trial/index.html is the one exception, and says why below.)
#   * It lists no demos. The list of what the site contains lives in index.html
#     and nowhere else, so adding a page here cannot leave the list stale.
#
# Usage: scripts/build-site.sh <output-dir>
#
# Expects `yarn build:standalone` to have run: dist/gramframe.bundle.js is the
# component the demo/ pages load.

set -euo pipefail

OUT=${1:?usage: build-site.sh <output-dir>}
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$ROOT"

if [ ! -f dist/gramframe.bundle.js ]; then
  echo "build-site: dist/gramframe.bundle.js not found -- run 'yarn build:standalone' first" >&2
  exit 1
fi

rm -rf "$OUT"
mkdir -p "$OUT"

# --- The site root: the landing page and the developer pages -----------------
#
# debug*.html load the component from source and set window.GRAMFRAME_DEBUG, so
# src/ is served raw beside them. index.html groups them separately from the
# demos and says what that flag means; they are developer pages, not a sample of
# what published training material looks like.
cp index.html "$OUT/"
cp debug.html debug-trainer.html debug-multiple.html "$OUT/"
cp -r src "$OUT/"
cp -r sample "$OUT/"

# test-release.html is the page shipped inside the release archive. It loads
# ./gramframe.bundle.js and ./demo-gram.png relative to itself, so both have to
# sit beside it at the site root.
cp test-release.html "$OUT/"
cp dist/gramframe.bundle.js "$OUT/"
cp sample/demo-gram.png "$OUT/"

# --- demo/: the pages that load the shipped bundle ---------------------------
#
# Tracked pages first, then the artefacts they reference as siblings. The pages
# are committed at demo/*.html and published at demo/*.html.
cp -r demo "$OUT/"
cp dist/gramframe.bundle.js "$OUT/demo/"
cp sample/mock-gram.png sample/demo-gram.png "$OUT/demo/"

mkdir -p "$OUT/demo/audio"
cp sample/audio/*.wav "$OUT/demo/audio/"
cp sample/audio/ATTRIBUTION.md "$OUT/demo/audio/"

# The trial harness is a self-contained folder handed to stakeholders, with its
# own README describing `index.html`; it keeps that name in the repository and
# is published as demo/trial.html beside the bundle and recordings it loads.
# This is the only renaming copy in the script, and the only one worth making:
# the alternative is a second tracked copy of the page.
cp trial/index.html "$OUT/demo/trial.html"

echo "build-site: assembled $OUT"
find "$OUT" -maxdepth 2 -name '*.html' | sort | sed 's/^/  /'
