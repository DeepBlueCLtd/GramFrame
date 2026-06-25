# Quickstart: Expand Image Toggle

How to build, run, and verify the feature locally.

## Prerequisites

- `yarn install`
- Mirrored Pub-10 demonstrator assets (CSS/JS + `gram-1.png`) imported into the repo
  under `sample/` (see Decision 7 in `research.md`).

## Build & run

```bash
yarn dev          # dev server with HMR
yarn typecheck    # JSDoc type checking — must be clean
yarn build        # production build (unminified)
yarn test         # full Playwright suite
```

Run just this feature's tests:

```bash
npx playwright test tests/expand-image.spec.ts
```

## Manual verification (landscape gram)

1. Open the demonstrator (`sample/pub10-gram1.html`, landscape `gram-1.png` 902×237).
2. Confirm an expand toggle (⤢) is floating at the **top-left of the image**, clear of the
   time-axis labels.
3. Click it:
   - The image fills the GramFrame component width (black area to the right is consumed).
   - The frame grows downward into the white space; nav bar, title, and control panel stay
     visible without scrolling up.
   - Axis tick **labels stay the same size** — only the image grew.
4. Before expanding, place an Analysis marker at a known point (e.g. ~180 Hz / 00:20) and
   note the LED readout. Expand, then collapse: the marker is back on the same feature and
   reports the same data values.
5. Hover the same image feature while expanded: the TIME/FREQ LEDs report the correct
   values (coordinate fidelity).
6. Zoom in/out and pan while expanded: they operate on the expanded image; coordinates stay
   correct.
7. Click the toggle again: the image returns to its exact original size.

## Manual verification (portrait vernier)

1. Open a page whose gram image is taller than wide.
2. Confirm **no** expand toggle is present.

## Acceptance criteria → tests

| Criterion | Check |
|-----------|-------|
| SC-001 | Expanded width == component inner image-region width ±2px |
| SC-002 | Expanded height == computed available height ±2px |
| SC-003 | Axis label font size unchanged before/after expand |
| SC-004 | Known data point reports same freq/time before/after expand (and with zoom) |
| SC-005 | No toggle for portrait; toggle present for landscape |
| SC-006 | Collapse restores exact natural dimensions |
| SC-007 | Pre-placed feature returns to original position/data after expand→collapse |

All run at a fixed Playwright viewport against `sample/pub10-gram1.html`.
