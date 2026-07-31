# Phase-start baseline — Spec 166 Consolidation

Recorded before any change on this branch (T001). Every later task's measurements
are checked against this reference point (SC-005, SC-006).

## Reference commit

```text
git rev-parse HEAD
07a422a55fb1d541a913ae77192619f444817cb0
```

## Determinism metric (SC-005)

```text
grep -ro waitForTimeout tests/ | wc -l
244
```

Matches `hygiene-baseline.json`'s `waitForTimeoutOccurrences` exactly, so the
ratchet and the spec's target (≤ 20) are measured on the same number.

## Ratchet baselines (`hygiene-baseline.json`)

| Counter | Baseline at phase start |
|---|---|
| `circularDependencies` | 11 |
| `unusedExportModules` | 5 |
| `waitForTimeoutOccurrences` | 244 |

`yarn hygiene` output at that commit:

```text
✔ Circular dependencies (madge, src/): 11 (baseline 11)
✔ Modules with unused exports (ts-unused-exports): 5 (baseline 5)
✔ waitForTimeout occurrences (tests/): 244 (baseline 244)

Hygiene check passed.
```

## Gate commands (T002)

`yarn typecheck && yarn lint && yarn test:unit && yarn hygiene && yarn build` all
pass on the clean tree. `yarn lint` reports 0 errors and 64 warnings — warnings
do not fail the lane, and the count is recorded here so the phase can be checked
for not raising it.

## Line-count reference (SC-006)

`git diff --shortstat main...HEAD` must be net-negative in lines at the end of
the phase, measured against this commit's `main`.

---

# Phase-end verification (T075, T076)

Measured at the end of the phase, against the reference commit above.

## SC-001 — determinism ✅

Five consecutive full-suite runs at `retries: 0`:

```text
run 1: 240 passed (1.6m)
run 2: 240 passed (1.6m)
run 3: 240 passed (1.6m)
run 4: 240 passed (1.7m)
run 5: 240 passed (1.7m)
```

`playwright.config.ts` now sets `retries: 0` unconditionally, so CI no longer
masks a race as a pass.

## SC-002 — one coordinate module ✅

`src/utils/coordinateTransformations.js`, the private `dataToSVGCoordinates` /
`svgToDataCoordinates` pair in `keyboardControl.js`, and the inline
`screenToDataWithZoom` in `events.js` were all deleted in one commit, with
**zero Playwright spec diffs** — the only test file touched was the Vitest grid,
which T033 requires to be repointed.

## SC-003 — every input agrees ✅

`tests/coordinate-agreement.spec.js`: for the same physical point, mouse
readout, rendered position, keyboard movement and wheel-zoom report the same
data coordinates, across zoom ∈ {1, 1.5, 2, 4} and expand on/off.

## SC-004 — one gesture, one notification ✅

`tests/state-listener.spec.js`: a mode switch delivers exactly 1 notification;
a 60-event mousemove burst and a 60-event wheel burst are each bounded by
elapsed frames rather than event count, and the settled state a listener saw
matches the live state exactly.

## SC-005 — waitForTimeout residue ✅

```text
grep -ro waitForTimeout tests/ | wc -l
1
```

Target was ≤ 20. The single survivor, in `analysis-mode.spec.js`, carries the
inline justification FR-007 requires: `Control+=` is a browser-level shortcut
the component does not handle, so no state or DOM condition marks the end of a
zoom that may not happen at all.

## SC-006 — net lines ⚠️ not met as written

```text
git diff --shortstat 07a422a..HEAD -- src/ tests/
56 files changed, 3904 insertions(+), 3327 deletions(-)     → +577
```

The phase is **net +577 lines** across `src/` and `tests/`, so SC-006 as
literally written is not met. The reason is that the spec asks for two things
that pull against each other: FR-001 mandates a pin test before every deletion,
and those pins are large.

Excluding only the four test files the tasks explicitly require, and which did
not exist before:

| New file | Lines | Required by |
|---|---:|---|
| `tests/unit/coordinate-equivalence.test.js` | 689 | T024–T026, T033 |
| `tests/keyboard-movement.spec.js` | 250 | T017 |
| `tests/coordinate-agreement.spec.js` | 220 | T037 |
| `tests/unit/notification-batching.test.js` | 205 | T050 |
| **Total** | **1364** | |

```text
git diff --shortstat 07a422a..HEAD -- src/ tests/ \
  ':!tests/unit/coordinate-equivalence.test.js' \
  ':!tests/unit/notification-batching.test.js' \
  ':!tests/keyboard-movement.spec.js' \
  ':!tests/coordinate-agreement.spec.js'
52 files changed, 2540 insertions(+), 3327 deletions(-)     → −787
```

So the consolidation itself removed **787 more lines than it added**, which is
what SC-006's parenthetical ("duplication removed exceeds infrastructure
added") is actually asking about. The headline number is positive only because
of the mandated new coverage. Recorded here rather than presented as a pass.

Within `src/` alone the change is +346, concentrated in the three modules that
absorbed the duplication (`coordinates.js`, `BaseDragHandler.js`, the new
`DiffingTable.js`) and in the JSDoc this codebase expects; four modules and two
private implementations were deleted outright.

## Ratchets (FR-011) — never raised at any point

| Counter | Phase start | Phase end |
|---|---:|---:|
| `circularDependencies` | 11 | 11 |
| `unusedExportModules` | 5 | 5 |
| `waitForTimeoutOccurrences` | 244 | **1** |

The cycle count is unchanged by design: the drag engine notifies through an
instance method rather than importing `core/state.js`, specifically to avoid
closing a twelfth cycle (AS-2.3).

## Gate commands

`yarn typecheck && yarn lint && yarn test:unit && yarn hygiene && yarn build`
all green, plus the full Playwright suite at 240 passed.
