# Quickstart: Verifying Student Tonal Expiry

**Feature**: 157-student-tonal-expiry
**Date**: 2026-07-17

A short manual walkthrough to confirm the 24-hour student expiry works and that
trainer permanence is preserved. Assumes `yarn dev` is running.

## Prerequisites

```bash
yarn dev        # start the dev server with a sample gram page
```

Open a **student** sample page (one WITHOUT the trainer flag — no
`#gf-persistent` / `.gf-persistent` / `[data-gf-persistent]` element and no
`ANALYSIS` anchor).

## 1. Recent annotations survive a reload (within 24h)

1. Add an analysis marker (or harmonic set / doppler curve) to the gram.
2. Reload the page.
3. **Expect**: the annotation is restored and visible. (SC-002)

## 2. Old annotations are discarded (>24h)

Simulate the passage of >24 hours by backdating the stored `savedAt`, then
reload. In the browser devtools console:

```js
// Find the GramFrame record in sessionStorage (student context) and backdate it
for (const k of Object.keys(sessionStorage)) {
  if (k.startsWith('gramframe::')) {
    const rec = JSON.parse(sessionStorage.getItem(k))
    rec.savedAt = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() // 25h ago
    sessionStorage.setItem(k, JSON.stringify(rec))
    console.log('backdated', k)
  }
}
```

Then reload the page.

- **Expect**: no annotations are restored; the gram opens clean. (SC-001)
- **Expect**: the `gramframe::…` key has been removed from `sessionStorage`
  (re-run `Object.keys(sessionStorage)` to confirm). (FR-003)
- **Expect**: no error dialog or console error surfaced to the student. (SC-005)

## 3. Malformed timestamp is treated as expired

```js
for (const k of Object.keys(sessionStorage)) {
  if (k.startsWith('gramframe::')) {
    const rec = JSON.parse(sessionStorage.getItem(k))
    delete rec.savedAt                // or: rec.savedAt = 'not-a-date'
    sessionStorage.setItem(k, JSON.stringify(rec))
  }
}
```

Reload → **expect** the record is discarded. (FR-009)

## 4. Trainer annotations are permanent

Open a **trainer** sample page (WITH a `.gf-persistent` flag or an `ANALYSIS`
anchor). Add an annotation, then backdate its `savedAt` in `localStorage`:

```js
for (const k of Object.keys(localStorage)) {
  if (k.startsWith('gramframe::')) {
    const rec = JSON.parse(localStorage.getItem(k))
    rec.savedAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() // 10 days ago
    localStorage.setItem(k, JSON.stringify(rec))
  }
}
```

Reload → **expect** the annotation is STILL restored. (SC-003, FR-006)

## 5. Instructor override via fresh session

With student annotations present, start a fresh browser session (close all tabs
for the origin / new private window) and reopen the gram.

- **Expect**: no annotations restored (session storage started empty). (US2, FR-008)

## Automated equivalent

```bash
yarn typecheck
yarn test        # includes the new expiry / permanence Playwright specs
```

All three quality gates (`yarn typecheck`, `yarn test`, `yarn build`) must pass
before merge (Constitution: Quality Gates).
