# Contract — `src/rendering/axes.js`

**Story 3 · FR-004 · SC-004 · ADR-018**

The axis engine, extracted from `components/table.js` into the `rendering/`
family beside `cursors.js` and `symbols.js` — where CLAUDE.md has documented it
living for some time, and where GF-38 recorded it as a phantom module.

## Public interface

```js
/**
 * Render both axes into the instance's axes group.
 *
 * Clears the group and redraws the time (vertical) and frequency (horizontal)
 * axes for the currently visible data range. Safe to call repeatedly; the sole
 * entry point into the axis engine.
 * @param {GramFrame} instance - GramFrame instance
 */
export function renderAxes(instance)
```

One export. Everything else in the module is private.

## Private helpers (moved verbatim from `table.js:412-687`)

| Helper | Role |
|---|---|
| `renderTimeAxis` | Vertical axis: ticks, labels, line |
| `renderFrequencyAxis` | Horizontal axis: ticks, labels, line |
| `calculateAxisTicks` | Nice-number tick selection for a range and pixel span |
| `formatFrequencyLabels` | Frequency label formatting |
| `renderAxisLine` | Draws one axis line |
| `renderAxisTicks` | Draws a tick set |
| `renderAxisLabels` | Draws a label set |

Time labels use `utils/timeFormatter.js` (`formatTime`), as today.

Projected size ≈ 310 lines — under the SC-004 guideline.

## Dependencies

| Imports | From |
|---|---|
| `formatTime` | `utils/timeFormatter.js` |
| visible-range math | `core/viewport.js` (`calculateVisibleDataRange`, moved there in PR 8) |

`rendering/axes.js` must **not** import `components/table.js` — the point of the
split. It must not import `core/state.js`: rendering draws, it does not
dispatch.

## Consumers after the split

| Consumer | Was | Now |
|---|---|---|
| `core/viewport.js` (`updateAxes`) | `table.js` | `rendering/axes.js` |
| `components/ExpandToggle.js` | `table.js` | `rendering/axes.js` (+ `svgLayout.js`) |

`ExpandToggle` importing `axes.js` and `svgLayout.js` instead of `table.js` is
what dissolves madge cycle #1 (`ExpandToggle.js > table.js`).

## Sibling modules created by the same split

| Module | Exports | ≈ lines |
|---|---|---|
| `components/spectrogramImage.js` | `setupSpectrogramImage`, `getRenderDimensions` | 90 |
| `components/svgLayout.js` | `updateSVGLayout` | 60 |
| `core/viewport.js` (absorbs) | `applyZoomTransform`, `calculateVisibleDataRange` | 192 → 305 |
| `components/table.js` (remains) | `setupComponentTable`, and private `createComponentStructure` / `replaceConfigTable` | 135 |

After the split, `components/table.js` is imported by exactly one module —
`core/initialization/DOMSetup.js` — which is what a scaffold should look like.

## Move discipline

PRs 6–8 are **pure moves**. The diff is relocation plus import rewiring; `git
diff -M` should show the rename. Any behaviour change is a separate PR. AS-3.1
requires zero behavioural diff, enforced by the existing suite passing unchanged
and by reviewing each PR as a move.

## Verification

| Assertion | Where |
|---|---|
| Zero behavioural diff | full suite unchanged (AS-3.1) |
| Axes live in `rendering/` with a documented interface | this file; ADR-018 (AS-3.2) |
| ExpandToggle ⇄ table cycle gone, no new cycle | `yarn hygiene`, baseline lowered (AS-3.3) |
| Zoom math has one home shared by wheel, keyboard and API | `tests/pan-zoom.spec.js` unchanged (AS-3.4, FR-007) |
| CLAUDE.md's `src/rendering/axes.js` claim is finally true | file exists; GF-38 partially closed |
