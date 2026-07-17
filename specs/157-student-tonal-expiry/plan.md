# Implementation Plan: Student Tonal Expiry (24-Hour Persistence Limit)

**Branch**: `157-student-tonal-expiry` | **Date**: 2026-07-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/157-student-tonal-expiry/spec.md`

## Summary

Cap **student**-context annotation persistence at 24 hours to protect assessment
integrity, while leaving **trainer**-context annotations permanent. Technical
approach: add an age gate to the single storage read path
(`loadAnnotations()` in `src/core/storage.js`) that discards a student record
when `now - savedAt > 24h` (also discarding records with missing/unparseable/
future timestamps), removing the stale key. No schema change or data migration
is needed because the stored record already carries a `savedAt` timestamp.

## Technical Context

**Language/Version**: JavaScript (ES2020+), JSDoc-typed, no compilation step
**Primary Dependencies**: None at runtime (zero runtime dependencies); Vite for build
**Storage**: Browser Web Storage API — `sessionStorage` (student), `localStorage` (trainer)
**Testing**: Playwright end-to-end tests (`yarn test`); `yarn typecheck` for JSDoc types
**Target Platform**: Modern browsers (desktop) hosting sonar-training HTML pages
**Project Type**: Single-project browser component (SVG overlay library)
**Performance Goals**: No measurable impact — one timestamp comparison per page load
**Constraints**: Offline-capable; must not regress trainer permanence; fail safe toward clearing student data
**Scale/Scope**: One small module touched (`src/core/storage.js`); a handful of e2e tests added

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. SVG-First Rendering | ✅ N/A | No rendering/overlay changes; purely a storage-policy change. |
| II. Test-First (NON-NEGOTIABLE) | ✅ Pass | Playwright e2e added for expiry, retention-within-window, and trainer-permanence; `yarn typecheck` + `yarn test` must pass before merge. |
| III. Modular Mode Architecture | ✅ Pass | No mode coupling; change confined to `src/core/storage.js`. Modes are unaffected. |
| IV. Declarative HTML Configuration | ✅ Pass | No new configuration surface; 24h is a fixed policy constant, not HTML config. Trainer/student detection unchanged. |

**Technical Constraints check**: State management, HMR, Vite, and JSDoc
type-checking are all unaffected. No violations.

**Result**: PASS — no violations, Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/157-student-tonal-expiry/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── storage-expiry.md   # Phase 1 output — behavioral contract for loadAnnotations()
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit.specify)
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
└── core/
    └── storage.js        # MODIFIED: add student-context age gate to loadAnnotations();
                          #           add isAnnotationExpired() predicate + STUDENT_TTL_MS constant

tests/
├── browser-storage.spec.js   # EXTENDED (or new sibling): expiry, within-window, trainer-permanence
└── helpers/
    └── (existing helpers)     # reuse; read the app-written storage key rather than reconstruct it
```

**Structure Decision**: Single-project layout (Option 1). The change is a
localized edit to one core module plus e2e coverage. No new directories or
modules are introduced; existing `src/core/storage.js` already owns all
persistence logic and is the correct home for the expiry policy.

## Design Overview

1. **Constant**: `const STUDENT_TTL_MS = 24 * 60 * 60 * 1000` in `storage.js`.
2. **Predicate**: `isAnnotationExpired(savedAt, nowMs)` — pure function returning
   `true` when `savedAt` is missing/unparseable, in the future, or older than
   `STUDENT_TTL_MS`. Exported for unit-level testing.
3. **Gate in `loadAnnotations()`**: after the version check, if
   `context === 'student'` and `isAnnotationExpired(data.savedAt, Date.now())`,
   then `storage.removeItem(key)`, log an informational discard, and return
   `null`. Trainer context bypasses the gate entirely.
4. **No changes** to `saveAnnotations()` (it already stamps `savedAt` on every
   write, which provides the sliding window) or to `main.js`.

## Complexity Tracking

> No Constitution violations — section intentionally left empty.

## Phase Outputs

- **Phase 0** (`research.md`): decisions on where/how to enforce expiry, basis
  of the window, malformed-timestamp handling, trainer no-op, and test approach.
  All clarifications resolved.
- **Phase 1** (`data-model.md`, `contracts/storage-expiry.md`, `quickstart.md`):
  the (unchanged) stored entity annotated with the expiry rule, the behavioral
  contract for `loadAnnotations()` across contexts and timestamp conditions, and
  a manual verification walkthrough.
- **Phase 2** (`tasks.md`): produced by `/speckit.tasks` — not part of this plan.

## Post-Design Constitution Re-Check

After Phase 1 design, all gates still PASS: the design remains a single-module
storage-policy change with Playwright coverage, no rendering/mode/config impact,
and no new complexity to justify.
