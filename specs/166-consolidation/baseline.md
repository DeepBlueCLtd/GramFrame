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
