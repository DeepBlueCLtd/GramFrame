# ADR-018: Splitting `components/table.js`

## Status

**Accepted** (spec 167, Story 3).

## Context

`src/components/table.js` was 713 lines doing six unrelated jobs (GF-09):

| Lines | Responsibility |
|---|---|
| 22–34 | base render dimensions |
| 35–139 | component DOM scaffold |
| 140–205 | spectrogram image load and scaling |
| 206–265 | SVG layout and viewBox |
| 266–325 | zoom transform application |
| 326–358, 412–687 | the axis engine — `renderAxes` plus 8 private helpers |
| 359–411 | visible-data-range math |
| 688–713 | replacing the config table |

Six importers reached into it for six different things, and it held the last
remaining circular dependency: `ExpandToggle.js ⇄ table.js`. It also carried 65
of the 540 strict-mode type errors — the second-largest concentration in the
codebase.

Separately, CLAUDE.md's file listing had claimed `src/rendering/axes.js` existed
for some time. It did not (GF-38); the axis engine was buried here.

## Decision

One responsibility per module. `table.js` keeps its name and the scaffold, which
is the job the name describes.

| Module | Lines | Holds |
|---|---|---|
| `components/table.js` | 151 | `setupComponentTable`, private `createComponentStructure` / `replaceConfigTable` |
| `rendering/axes.js` | 330 | `renderAxes` + 8 private helpers |
| `components/svgLayout.js` | 140 | `updateSVGLayout`, `applyZoomTransform` |
| `components/spectrogramImage.js` | 85 | `setupSpectrogramImage` |
| `utils/coordinates.js` | +73 | `getRenderDimensions`, `calculateVisibleDataRange` |

`components/table.js` is now imported by exactly one module,
`core/initialization/DOMSetup.js`, which is what a scaffold should look like.

### Why the axis engine belongs in `rendering/`

`rendering/` already holds `cursors.js` and `symbols.js`: the modules that draw
into the SVG and do nothing else. The axis engine is the third of them. It reads
state and emits SVG elements; it dispatches nothing, mutates nothing, and is safe
to call repeatedly. `renderAxes` is its only export — the eight helpers that
compute nice-number tick intervals and format labels are implementation.

The rule the module header states: **rendering draws, it does not dispatch.**
`rendering/axes.js` must not import `components/table.js` (the point of the
split) or `core/state.js`.

### Why two helpers went to `utils/coordinates.js`

The plan for this phase put `getRenderDimensions` in `spectrogramImage.js` and
`calculateVisibleDataRange` in `core/viewport.js`. Both placements create *new*
cycles:

- `spectrogramImage → svgLayout → spectrogramImage`, because `setupSpectrogramImage`
  triggers the layout and the layout needs render dimensions.
- `viewport → axes → viewport`, because `renderAxes` needs the visible range and
  `viewport` needs `renderAxes`.

Trading one cycle for two is not a split. Both helpers are pure functions of the
viewport, and `utils/coordinates.js` imports nothing — it is the one module every
other can depend on freely. It is also where `getRenderDimensions` already lived
in duplicate: a private `renderSize(imageDetails)` computing the same
natural-size fallback. There is now one implementation.

CLAUDE.md already describes `utils/coordinates.js` as "the canonical coordinate
module: every screen/SVG/image/data conversion, zoom-, expand-, render-size- and
margin-aware". Render size and visible range are exactly that.

Both took the module's house signature — `(viewport, spectrogramImage)` rather
than `(instance)` — so `coordinates.js` stays free of any dependency on the
GramFrame instance. That is the only signature change in the split; every body
moved verbatim.

### Why `applyZoomTransform` sits beside `updateSVGLayout`

The plan put it in `core/viewport.js`. `updateSVGLayout` ends by applying the
zoom transform, so that placement makes `viewport` and `svgLayout` mutually
dependent.

The distinction that resolves it: `core/viewport.js` owns zoom **math** —
`zoomIn`, `zoomOut`, `zoomReset`, `setZoom`, `zoomAtImagePoint`,
`panByNormalized` — and remains the single seam every caller goes through
(wheel, keyboard, Pan mode's buttons, the public API). `applyZoomTransform`
*applies* a decided transform to the DOM. That is layout work, and it belongs
with the layout.

FR-007 and AS-3.4 are about the seam, and the seam is unmoved.

## Consequences

- madge circular dependencies: **1 → 0**. `ExpandToggle` imports `svgLayout.js`
  and `rendering/axes.js` directly, and the last cycle is gone.
- No module in the split exceeds 330 lines.
- The full Playwright suite passed **with no spec file edited**. That was the
  gate: these were pure moves, and a spec that needed changing would have meant
  the move was not a move.
- `src/rendering/axes.js` exists, so CLAUDE.md's long-standing claim about it is
  finally true (part of GF-38).

## Alternatives considered

**Split by file size alone** — cheaper, and produces modules with no describable
job. The six responsibilities were already visible in the line ranges above; the
split follows them.

**Leave the axis engine in `components/`** — it would keep the `rendering/`
family incomplete and leave CLAUDE.md's claim false. `renderAxes` is called by
`viewport`, `svgLayout` and `ExpandToggle`, none of which is a component.

**Extract the axis engine but keep a re-exporting `table.js`** — preserves every
import line at the cost of leaving the hub in the graph, which is what the cycle
ran through.
