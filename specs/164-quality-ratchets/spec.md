# Feature Specification: Phase 0 — Quality Ratchets & Safety Net

**Feature Branch**: `164-quality-ratchets`
**Created**: 2026-07-31
**Status**: Complete — implemented and merged
**Input**: [Findings Register](../../docs/analysis/Findings-Register.md) (re-verified 2026-07-31) — GF-25, GF-27 (containment), GF-31, GF-33, GF-34.

## Context

<!--
  The 2026-07-31 re-verification showed that between the audit and the re-check,
  no finding was fixed and three worsened — because feature work keeps landing on
  unguarded seams. Phase 0 therefore installs guardrails BEFORE any remediation:
  ratchets that freeze today's debt at its current level, a lint lane, a unit-test
  lane, and a CI path that exercises the shipped artifact. Every later phase
  depends on this one. No production code changes in this phase.
-->

Measured baselines at `edfc549` (the ratchet starting points): **11** circular
dependencies (madge), **17** modules with unused exports (ts-unused-exports),
**249** `waitForTimeout` occurrences in `tests/`, **0** ESLint findings (no lane
exists), unit-test lane absent.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Debt ratchet in CI (Priority: P1)

A maintainer merges a PR. CI runs a hygiene check that compares the current
counts of circular dependencies and unused-export modules against committed
baselines. A PR that *increases* either count fails with a message naming the
new cycle or export; a PR that decreases a count may lower the baseline. The
already-installed `madge` and `ts-unused-exports` devDependencies (GF-33) are
finally wired to something.

**Why this priority**: This is the mechanism that stops findings GF-03/GF-22
from growing while later phases are executed. Cheapest possible win — the tools
are already in `package.json`.

**Independent Test**: Run `yarn hygiene` locally: it passes at baseline. Add a
temporary import cycle; it fails naming the cycle. Remove it; it passes again.

**Acceptance Scenarios**:

1. **Given** the repo at baseline, **When** `yarn hygiene` runs, **Then** it
   exits 0 and reports the current counts.
2. **Given** a change introducing a 12th import cycle, **When** `yarn hygiene`
   runs, **Then** it exits non-zero and names the offending cycle.
3. **Given** a change adding a module with unused exports, **When** `yarn
   hygiene` runs, **Then** it exits non-zero and names the module.
4. **Given** any PR, **When** CI runs, **Then** the hygiene check runs as a
   required step alongside typecheck and tests.

---

### User Story 2 - Lint lane (Priority: P1)

A developer writes code that shadows a variable, leaves an unused import, or
uses an empty catch block. ESLint (flat config) flags it locally and in CI.
The initial rule set is chosen so the existing codebase passes on day one
(warnings allowed, errors ratcheted), so the lane can be merged without a
repo-wide cleanup. Addresses GF-31; `.eslintcache` finally has a reason to be
in `.gitignore`.

**Independent Test**: `yarn lint` passes at baseline; introducing an
`empty-block` violation makes it fail.

**Acceptance Scenarios**:

1. **Given** the repo at baseline, **When** `yarn lint` runs, **Then** it exits 0.
2. **Given** a new rule violation classed as an error, **When** `yarn lint`
   runs locally or in CI, **Then** the run fails and names file/line/rule.
3. **Given** the CI workflow, **When** a PR is opened, **Then** lint runs on it.

---

### User Story 3 - Unit-test lane (Priority: P1)

A developer writing pure logic (coordinate math, harmonic sampling, tolerance
helpers) runs `yarn test:unit` and gets sub-second Node-side feedback with no
browser, no Vite dev server, and no Playwright. The lane is dev-only tooling —
the zero-runtime-dependency stance (ADR) is unaffected. Addresses GF-25 and is
a hard prerequisite for the Phase 2 coordinate-pipeline consolidation, which
must pin transform equivalence with unit tests before any deletion.

**Independent Test**: Port `tests/harmonic-sampling-unit.spec.js` assertions to
the unit lane; `yarn test:unit` passes in under 5 seconds with no server boot.

**Acceptance Scenarios**:

1. **Given** the unit lane, **When** `yarn test:unit` runs, **Then** it executes
   without starting Vite or any browser.
2. **Given** the existing Node-side harmonic-sampling assertions, **When** they
   are ported, **Then** they pass in the unit lane and the Playwright copy is
   retired (single home per assertion).
3. **Given** CI, **When** a PR is opened, **Then** the unit lane runs before the
   Playwright lane (fail fast).
4. **Given** `package.json`, **Then** the unit runner appears only in
   devDependencies.

---

### User Story 4 - CI exercises what ships (Priority: P2)

The standalone bundle is the artifact users deploy, but the test workflow never
builds it, CI runs Node 18 (EOL) against `@types/node ^24`, and only Chromium
is exercised (GF-34). After this story: the test workflow builds
`build:standalone` on every PR, all workflows run a current LTS Node, and a
minimal WebKit smoke job loads a sample page and asserts the component
initializes.

**Acceptance Scenarios**:

1. **Given** a PR that breaks the standalone build, **When** CI runs, **Then**
   the test workflow fails (not just the release workflow days later).
2. **Given** all three workflows, **Then** they specify the same current LTS
   Node version, consistent with `@types/node`.
3. **Given** the smoke job, **When** it runs on WebKit, **Then** it asserts the
   component renders and reports state without error.

---

### User Story 5 - waitForTimeout containment (Priority: P2)

The `waitForTimeout` count grew 142 → 249 in one week of feature work (GF-27
re-verification). Full remediation is Phase 2; this story only stops the
growth: the hygiene check counts `waitForTimeout` occurrences in `tests/` and
fails any PR that raises the count above the committed baseline.

**Acceptance Scenarios**:

1. **Given** the baseline (249), **When** a PR adds a new `waitForTimeout`,
   **Then** the hygiene check fails and points at the added call.
2. **Given** a PR that replaces timeouts with state-based waits, **When** the
   count drops, **Then** the author may lower the baseline in the same PR.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A `yarn hygiene` script MUST run madge circular-dependency
  detection, ts-unused-exports, and the `waitForTimeout` count against
  committed baseline values, exiting non-zero on any regression.
- **FR-002**: Baselines MUST be stored in a committed, human-editable file so
  that lowering them is an ordinary reviewed diff.
- **FR-003**: The CI test workflow MUST run hygiene, lint, typecheck, unit
  tests, and Playwright tests on every PR.
- **FR-004**: ESLint MUST be configured (flat config) with a rule set that
  passes on the current codebase; rules MAY start as warnings and be promoted.
- **FR-005**: A unit-test lane MUST exist that runs pure-JS tests in Node with
  no browser or dev server, wired as `yarn test:unit`.
- **FR-006**: The unit-test runner and ESLint MUST be devDependencies only; no
  runtime dependency may be added.
- **FR-007**: The CI test workflow MUST build the standalone bundle on every PR.
- **FR-008**: All GitHub workflows MUST use a current (non-EOL) Node LTS.
- **FR-009**: A WebKit smoke test MUST verify component initialization on a
  sample page.
- **FR-010**: No production source file under `src/` may change in this phase
  (tooling, config, workflows, and tests only).

## Success Criteria *(mandatory)*

- **SC-001**: A PR introducing a new import cycle, unused export, or
  `waitForTimeout` call cannot merge with green CI.
- **SC-002**: `yarn test:unit` completes in under 10 seconds locally with no
  server or browser processes started.
- **SC-003**: A standalone-bundle build break is caught on the PR that causes
  it, not at release time.
- **SC-004**: All ratchet baselines are visible in one committed file, and the
  register's Phase 2/3 work can lower them without touching CI config.
- **SC-005**: Zero new runtime dependencies; `yarn build` output is unchanged
  byte-for-byte by this phase.

## Assumptions

- Vitest is the presumed unit runner (Vite is already the build tool), but any
  Node-native runner meeting FR-005/FR-006 satisfies this spec.
- The ratchet compares counts, not exact graphs — a PR that removes one cycle
  and adds another passes the count check; this is accepted as good-enough for
  a ratchet whose purpose is stopping net growth.
- Existing `retries: 2` in Playwright CI config is left as-is in this phase; it
  is revisited in Phase 2 when the timeout remediation lands (GF-27).
- The pre-push hook is not changed in this phase; slimming it (GF-35) is
  Phase 1, once the unit lane exists for it to call.
