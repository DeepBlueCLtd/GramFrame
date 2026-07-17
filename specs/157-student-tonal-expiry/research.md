# Phase 0 Research: Student Tonal Expiry (24-Hour Persistence Limit)

**Feature**: 157-student-tonal-expiry
**Date**: 2026-07-17

This feature extends the existing browser-storage persistence layer (feature
155-browser-storage) rather than introducing new technology. Research therefore
focuses on how the current mechanism behaves and where a 24-hour age check
fits cleanly, resolving the open decisions from the spec.

## Existing mechanism (as-built)

- `src/core/storage.js` persists a per-page `StoredAnnotations` object.
- Trainer pages use `localStorage` (permanent); student pages use
  `sessionStorage` (cleared on browser/tab close). Context is chosen by
  `detectUserContext()`.
- Every stored record **already carries** `savedAt`, an ISO-8601 timestamp
  written on each save (`saveAnnotations()` sets `savedAt: new Date().toISOString()`).
- `loadAnnotations()` reads the record, validates `version === SCHEMA_VERSION`,
  and returns it; `main.js#_restoreAnnotations()` merges it into state on init.
- Saves are triggered by a state listener (`_setupStorageSaveListener`) that
  re-saves whenever the annotation snapshot changes, so `savedAt` reflects the
  **most recent** annotation change.

**Implication**: No schema change and no data migration are required. The
`savedAt` field needed for an age check is already present in existing records.

## Decision 1 — Where to enforce expiry

**Decision**: Enforce the age check inside `loadAnnotations()` in
`src/core/storage.js`, for the student context only.

**Rationale**: `loadAnnotations()` is the single read path and already discards
records on version mismatch (removing the key). Adding an age gate there means
every consumer (`_restoreAnnotations`) automatically benefits, and the "discard
+ remove key" pattern already exists to copy. Keeping it in the storage module
honors separation of concerns (Constitution: state/rendering/UI separation).

**Alternatives considered**:
- *Check in `main.js#_restoreAnnotations`* — would leak storage-policy logic
  into the component and duplicate the discard/remove behavior. Rejected.
- *Background timer that clears at 24h* — adds lifecycle complexity, does not
  match the assessment scenario (which is a page revisit = load), and risks
  clearing data while a student is mid-view. Rejected (see spec assumptions).

## Decision 2 — Expiry basis and window

**Decision**: Expire when `now - savedAt > 24 hours`, measured from the record's
`savedAt` (last-save time). Apply to student context only; trainer context is
never aged out.

**Rationale**: `savedAt` is refreshed on every annotation change, so a
sliding "last activity" window keeps actively-worked grams alive and lets idle
ones age out — exactly the assessment scenario. Matches the issue wording
("persistent for 24 hours") and the spec's documented assumption.

**Alternatives considered**:
- *Measure from first creation* — would need a new `createdAt` field (schema
  change + migration) and could delete a gram a student is still actively
  editing. Rejected.
- *Make the duration configurable via HTML config* — the issue specifies a
  fixed 24h policy; configurability is unnecessary scope. Rejected. The value
  will live as a named constant so it is easy to locate and adjust in code.

## Decision 3 — Handling malformed / skewed timestamps

**Decision**: Treat a student record whose `savedAt` is missing, unparseable,
or in the future as expired → discard and remove the key.

**Rationale**: Fail safe toward clearing (FR-009). A clock set backwards or a
hand-edited record must not grant indefinite persistence. `Date.parse()`
returning `NaN` covers missing/unparseable; a negative age covers future
timestamps.

**Alternatives considered**:
- *Keep records with bad timestamps* — could be exploited to bypass expiry and
  contradicts the integrity goal. Rejected.

## Decision 4 — Trainer path unchanged

**Decision**: The age check is gated on `context === 'student'`. Trainer
(`localStorage`) records skip it entirely.

**Rationale**: FR-006 requires trainer permanence. Gating by context is a
one-line guard and keeps the trainer workflow a strict no-op (guarded by a
dedicated test per SC-003).

## Decision 5 — Testing approach

**Decision**: Add Playwright e2e coverage that manipulates the record's
`savedAt` via `page.evaluate` against `sessionStorage`, then reloads and asserts
restored/absent annotations. Also add unit-level coverage of the pure age
predicate if a unit harness is convenient; otherwise rely on e2e.

**Rationale**: Constitution mandates Playwright e2e for user-facing behavior.
Directly writing a backdated `savedAt` into storage is deterministic and avoids
waiting real time. The existing storage tests (feature 155) provide a pattern to
follow.

**Open risk**: Tests must set the storage key using the same key-derivation as
`buildStorageKey()` (path-based). The test helper will read the key the app
wrote rather than reconstruct it, to stay robust.

## Unresolved clarifications

None. All spec `[NEEDS CLARIFICATION]` markers were already resolved during
`/speckit.specify`; the one design choice (last-save vs creation basis) is
settled in Decision 2.
