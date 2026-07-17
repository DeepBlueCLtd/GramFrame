# Phase 1 Data Model: Student Tonal Expiry

**Feature**: 157-student-tonal-expiry
**Date**: 2026-07-17

No new persisted entity is introduced. This feature reinterprets an existing
field (`savedAt`) as an expiry basis for student-context records. The schema and
`SCHEMA_VERSION` are unchanged, so existing stored records remain readable.

## Entity: Stored Annotation Set (`StoredAnnotations`)

Existing record persisted per GramFrame instance (see `src/types.js`). Fields
relevant to this feature:

| Field | Type | Existing? | Role in this feature |
|-------|------|-----------|----------------------|
| `version` | number | Yes | Schema gate (unchanged). |
| `savedAt` | string (ISO-8601) | Yes | **Expiry basis.** Time of last save; compared against `now` for student records. |
| `analysis` | object | Yes | Payload (unchanged). |
| `harmonics` | object | Yes | Payload (unchanged). |
| `doppler` | object | Yes | Payload (unchanged). |

**No fields added, removed, or renamed.** No migration required.

## Derived concept: Persistence Context

Not stored — derived per page at load/save time by `detectUserContext()`:

| Context | Storage | Expiry applied? |
|---------|---------|-----------------|
| `trainer` | `localStorage` | No — permanent (FR-006). |
| `student` | `sessionStorage` | Yes — discarded when older than 24h (FR-002). |

## Expiry Rule (validation logic)

Evaluated on load for **student** records only:

```
STUDENT_TTL_MS = 24 * 60 * 60 * 1000   // 24 hours

isAnnotationExpired(savedAt, nowMs):
    t = Date.parse(savedAt)
    if t is NaN            -> expired   (missing / unparseable)   [FR-009]
    age = nowMs - t
    if age < 0            -> expired    (future timestamp)        [FR-009]
    if age > STUDENT_TTL_MS -> expired  (older than 24h)          [FR-002]
    otherwise             -> not expired                          [FR-004]
```

## State Transitions (per student record, on page load)

```
                         load student record
                                │
                 ┌──────────────┴───────────────┐
        version mismatch                    version ok
                │                                │
             discard                    isAnnotationExpired(savedAt, now)?
          (existing behavior)             │                    │
                                        true                 false
                                          │                    │
                                  removeItem(key)        restore into state
                                  return null            (FR-004)
                                  (FR-003)
```

Trainer records skip the expiry branch entirely and always restore (subject to
the pre-existing version check).

## Non-persisted timing note

Expiry is evaluated using wall-clock `Date.now()` at load. There is no stored
countdown and no background timer; a gram left open is not force-cleared
mid-view — the check re-runs on the next load (spec Assumptions, FR-007).
