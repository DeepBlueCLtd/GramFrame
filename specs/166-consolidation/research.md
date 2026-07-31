# Phase 0 Research — Spec 166 Consolidation

All decisions below were taken against the live code on branch
`claude/speckit-plan-166-vnulhx` (2026-07-31), not against the register's
recorded line numbers. Counts were re-measured; where they differ from the
spec's prose the measured value is used and the difference noted.

## Measured baseline (2026-07-31)

| Metric | Spec says | Measured | Source |
|---|---|---|---|
| `waitForTimeout` in `tests/` | 249 | **244** | `grep -ro waitForTimeout tests/ \| wc -l`, matches `hygiene-baseline.json` |
| `notifyStateListeners` references in `src/` | ~29 sites | **41 references** across 12 files (call sites + imports) | `grep -rn notifyStateListeners src/` |
| Coordinate implementations | 4 | **4** — `utils/coordinates.js` (75 L), `utils/coordinateTransformations.js` (122 L), private pair in `keyboardControl.js:308-360`, inline `screenToDataWithZoom` in `events.js:27-86` | read directly |
| Drag machines | 5 | **5** — `BaseDragHandler`, `PanMode.isDragging`, Harmonics creation, Doppler placement, `instance._wheelPan` in `events.js` | `grep -rn isDragging src/` |
| CI retries | 2 | **2** (`playwright.config.ts:15`) | read directly |
| Disabled keyboard specs | 2 | **2** (`keyboard-focus.spec.js.disabled`, `keyboard-focus-simple.spec.js.disabled`) | `ls tests/*.disabled` |

The 249→244 difference is immaterial: spec 165's dead-code sweep removed a few
between the register's re-verification and today. FR-007's target (≤ 20) and
SC-005 are unaffected.

---

## R1 — Which module becomes the canonical coordinate pipeline?

**Decision**: `src/utils/coordinates.js` is the canonical module. It absorbs the
implementations currently in `coordinateTransformations.js`, which is then
deleted. The private functions in `keyboardControl.js` and the inline
`screenToDataWithZoom` in `events.js` are deleted and their callers rewired.

**Rationale**: Constitution Principle I states coordinate transforms "MUST flow
through the established coordinate system in `src/utils/coordinates.js`". The
spec assumed `coordinateTransformations.js` as the target because it is the more
complete implementation — which is true of the *code*, not the *path*. Taking
the better implementation into the constitutionally-named file satisfies both:
no amendment, no exception, and the diff is a move rather than a rename storm.
`coordinates.js` is also the name every reader will look for.

**Alternatives considered**:
- *Keep `coordinateTransformations.js`, amend the constitution* — a MINOR bump to
  rename a file is a poor trade, and leaves two plausible names in the history.
- *New third module, delete both* — churns every import for no gain; `coordinates.js`
  already holds `screenToSVGCoordinates` and `imageToDataCoordinates`, which the
  canonical API needs verbatim.

**What the canonical module must be aware of** (FR-003): zoom, expand, render
size (`imageDetails.renderWidth/renderHeight`), and axes margins. The current
divergence is precisely here — `keyboardControl.js`'s private pair positions
against `margins.left + normalizedX * renderWidth`, ignoring the image element's
live `x`/`width` attributes, and compensates externally by dividing the keypress
increment by the zoom level. The other three read the element attributes. The
canonical module reads the element attributes; the external compensation in
`keyboardControl.js` is removed in the same PR.

---

## R2 — How is coordinate equivalence pinned before deletion?

**Decision**: a Vitest table-driven grid in `tests/unit/coordinate-equivalence.test.js`
that imports **all four live implementations** and asserts they agree, run and
green *before* any consolidation commit (AS-2.1).

Grid dimensions:

| Axis | Values |
|---|---|
| zoom level | 1.0, 1.5, 2.0, 4.0 |
| expand | off, on (render size ≠ natural size) |
| render size | natural; 2× natural; non-uniform (w≠h scaling) |
| margins | default (left 60, bottom 50); zero; asymmetric |
| rate | 1, 2 |
| sample points | image corners, centre, and off-image points either side of each edge |

Assertions: `screen→data` and `data→SVG` round-trips agree within `1e-9`
relative tolerance, and out-of-bounds handling agrees (`null` vs. clamped —
today `events.js` returns `null` outside bounds while `svgToDataCoordinates`
clamps; the grid records this as a *documented* difference in the bounds
predicate, not in the transform, and the canonical API keeps them as two
separate functions so neither caller changes semantics).

**Rationale**: the pure-JS lane can host this because the transforms take
plain objects plus an element-like `{getAttribute}` stub — no browser needed.
Vitest gives a fast, deterministic grid that a Playwright spec could not
practically enumerate. Constitution II's "unit tests alone cannot catch
coordinate regressions" still holds: the grid is the *pin*, and the Playwright
arrow-key spec plus the full suite remain the merge gate.

**Alternatives considered**: recording golden outputs from a running browser and
replaying — more faithful but far slower to author and brittle to font/DPI; the
Playwright arrow-key spec (R3) covers the real-browser dimension instead.

---

## R3 — What replaces the two disabled keyboard specs?

**Decision**: delete both `.disabled` files; add `tests/keyboard-movement.spec.js`
asserting **data-coordinate deltas**, not visibility.

Per FR-008 / AS-1.2, for a selected marker at a known data position, an arrow
keypress must change `state.analysis.markers[i].freq`/`.time` by the expected
increment, checked at zoom 1.0 and at a zoomed level (where the increment is
divided by zoom so the *rendered* movement stays constant). Same for a selected
harmonic set's spacing/anchor. This is exactly the assertion whose absence
GF-26ᴺ records, and it is the coverage that protects R1's rewiring of
`keyboardControl.js`.

**Rationale**: the disabled specs tested FocusManager isolation, which
`focus-simple.spec.js` and `tab-navigation.spec.js` already cover actively.
Restoring them would re-add duplicate coverage while leaving the real gap open.

---

## R4 — Drag-state mirrors: remove, or deprecate for one release?

**Decision**: **remove** them. Replace `state.analysis.isDragging`,
`state.harmonics.dragState.*`, and `state.doppler.isDragging` with a single
read-only projection `state.drag` (shape in [data-model.md](./data-model.md)).
No deprecation window.

**Rationale**: the spec left this open pending evidence of a downstream reader.
The evidence is now in: every reader in the repository is a test —
`tests/doppler-mode.spec.js:674,702`, `tests/mode-integration.spec.js:320,321`,
and `tests/state-hygiene.spec.js:63`'s key list. `debug.html` and `sample/`
reference none of them. A deprecation shim would mean keeping the double
bookkeeping GF-17 is about, for one release, to serve zero known consumers —
i.e. paying the finding's cost to avoid a hypothesis. FR-004's "at most one
read-only projection" is also literally unsatisfiable while three mirrors exist.

**Escape hatch preserved**: if a downstream training system is identified before
PR 7 lands, `state.drag` is already a projection — repopulating the three legacy
paths from it is a ten-line, single-site addition, versus the multi-site
bookkeeping being removed.

---

## R5 — Batching strategy for the notification dispatcher

**Decision**: two-tier. A single `dispatch(instance)` choke-point in
`src/core/state.js`:

1. **Default tier — microtask batching.** Repeated `dispatch()` calls within one
   task coalesce into a single notification via `queueMicrotask`, delivered with
   the settled state. This alone satisfies AS-4.1 (mode switch fires ≥2 notifies
   today: `keyboardControl.js` + `main.js`).
2. **High-frequency tier — frame cadence.** `dispatch(instance, {frame: true})`
   from mousemove, wheel and drag-move paths coalesces via
   `requestAnimationFrame`, satisfying FR-006 and AS-4.2.

A pending frame-tier dispatch is upgraded — never downgraded — by a subsequent
default-tier dispatch, so a mode switch during a drag is never delayed to the
next frame. Cloning happens once inside `dispatch`, and is skipped entirely when
`listeners.length === 0` (FR-005). A synchronous `flushDispatch(instance)` is
exported for teardown/destroy so no notification is lost on unmount.

**Rationale**: microtasks preserve today's "state is readable on the test's next
await" property for the vast majority of specs, which is what makes tier 1
low-risk; only the genuinely high-frequency paths take the observable frame
delay, and those are the ones the spec's compatibility bar (same-frame final
state) was written for.

**Alternatives considered**:
- *rAF for everything* — simpler, but makes every existing `getState()` read
  frame-racy, multiplying Story 1's migration cost for no benefit on paths that
  fire once per gesture.
- *Synchronous dedupe by dirty-flag, no async* — cannot batch across the two
  notify sites of a mode switch, which happen in separate functions.

**Enforcement of FR-005/AS-4.4**: `notifyStateListeners` stops being exported to
modes; the ESLint config gains a `no-restricted-imports` rule so a mode importing
it fails `yarn lint` rather than being caught in review.

---

## R6 — Storage listener re-serialization

**Decision**: gate `saveAnnotations` on an annotation-relevance check inside the
listener registered at `src/main.js:447` — compare a cheap signature (marker
count + harmonic-set count + doppler marker identity + last-mutation counter)
and return early when unchanged (AS-4.3).

**Rationale**: the listener currently re-serializes annotations on *every*
notification, including pure cursor moves; combined with the per-notch wheel
notify added by feature 160 this is the compounding cost GF-07 records. A
mutation counter bumped by the annotation-mutating paths is more robust than
deep comparison and costs one integer.

---

## R7 — Shared table engine boundary

**Decision**: extract `src/components/DiffingTable.js` exposing a
`createDiffingTable(container, spec)` factory plus an `update(rows)` method. The
component owns: fixed-height scroll wrapper, header construction,
update-in-place, rebuild-from-index, trailing-row removal, click-to-select, and
delete-button event propagation. It does **not** own: column definitions, cell
formatting, selection semantics, or delete behaviour — those arrive via `spec`.

**Rationale**: the two implementations (`AnalysisMode.js:577-717` and
`HarmonicPanel.js:62-232`) already agree on the mechanism and differ only in
columns and callbacks; the post-audit scroll wrapper was duplicated verbatim
(`AnalysisMode.js:373-377` / `HarmonicPanel.js:32-36`), which is the concrete
evidence that the mechanism is the shared part. Keeping formatting out of the
component avoids a config object that reimplements a template language.

**Alternatives considered**: a base class with overridable hooks — heavier for
two consumers and pulls `AnalysisMode` into an inheritance chain it does not
otherwise need.

---

## Open items carried to `/speckit.tasks`

None blocking. Two items are decisions for the implementer within an agreed
envelope:

- The exact `waitForTimeout` residue (≤ 20) and which sites keep a justification
  comment — determined per spec as the migration proceeds (AS-1.3).
- Whether `harmonicSampling` and other already-pure helpers gain unit coverage
  opportunistically alongside the new Vitest files — welcome, not required.
