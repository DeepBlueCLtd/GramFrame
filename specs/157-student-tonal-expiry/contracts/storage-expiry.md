# Contract: Annotation Load Expiry Behavior

**Feature**: 157-student-tonal-expiry
**Module**: `src/core/storage.js`
**Date**: 2026-07-17

This is the behavioral contract for the persistence read path after adding the
student 24-hour expiry gate. GramFrame is a browser component, so the "contract"
is the observable behavior of the storage module's public functions, verified by
Playwright e2e tests. No network or CLI surface is involved.

## Affected surface

- `loadAnnotations(instanceIndex?) -> StoredAnnotations | null` — **behavior changed**
- `isAnnotationExpired(savedAt, nowMs) -> boolean` — **new, exported** (pure predicate)
- `STUDENT_TTL_MS: number` — **new** exported constant (`86_400_000`)
- `saveAnnotations`, `clearAnnotations`, `detectUserContext`, `buildStorageKey`,
  `getStorage`, `TRAINER_FLAG_SELECTOR` — **unchanged**

## `isAnnotationExpired(savedAt, nowMs)`

| Input `savedAt` | Input `nowMs` relation | Returns |
|-----------------|------------------------|---------|
| valid ISO, age `> 24h` | `nowMs - t > 86_400_000` | `true` |
| valid ISO, age `≤ 24h` | `0 ≤ nowMs - t ≤ 86_400_000` | `false` |
| valid ISO, future | `nowMs - t < 0` | `true` |
| `undefined` / `null` / `""` | any | `true` |
| non-date string | `Date.parse` → `NaN` | `true` |

Pure and side-effect-free; identical output for identical inputs.

## `loadAnnotations()` behavior matrix

Assumes a record exists under the derived key and passes the version check
unless noted.

| Context | Record `savedAt` | Result | Side effect |
|---------|------------------|--------|-------------|
| student | age `≤ 24h` | returns the record | none |
| student | age `> 24h` | returns `null` | `removeItem(key)`; info log |
| student | missing / unparseable | returns `null` | `removeItem(key)`; info log |
| student | future | returns `null` | `removeItem(key)`; info log |
| trainer | age `> 24h` | returns the record | none (permanence preserved) |
| trainer | missing `savedAt` | returns the record | none (expiry gate skipped) |
| any | version mismatch | returns `null` | `removeItem(key)` (pre-existing) |
| any | no record / storage unavailable | returns `null` | none |

## Invariants

1. **Trainer permanence**: with `context === 'trainer'`, `loadAnnotations()`
   never discards on age. (FR-006, SC-003)
2. **Fail safe**: any student record that cannot be proven fresh (`savedAt`
   missing/invalid/future) is discarded. (FR-009)
3. **Single read path**: all restoration flows through `loadAnnotations()`, so
   the gate cannot be bypassed by another consumer. (research Decision 1)
4. **No silent errors**: discards are logged at info/warn level; no error is
   surfaced to the student UI. (SC-005)
5. **Idempotent load**: after an expired load, the key is gone, so a subsequent
   load returns `null` with no side effect.

## Test obligations (Playwright)

- **T-A (expiry)**: seed a student record, backdate its `savedAt` to >24h ago,
  reload → no annotations restored AND storage key removed. (US1, SC-001)
- **T-B (within window)**: seed a student record with recent `savedAt`, reload →
  annotations restored. (US1 scenario 2, SC-002)
- **T-C (trainer permanence)**: on a trainer page, backdate `savedAt` to >24h,
  reload → annotations still restored. (US3, SC-003)
- **T-D (malformed)**: student record with removed/garbage `savedAt`, reload →
  discarded. (FR-009)
- **T-E (fresh session)**: existing session-scope behavior still yields no
  restore in a new session. (US2, FR-008) — may be covered by existing 155 tests.

Tests MUST read the storage key the app actually wrote (enumerate
`sessionStorage`/`localStorage` for the `gramframe::` prefix) rather than
reconstructing it, to remain robust to key-derivation details.
