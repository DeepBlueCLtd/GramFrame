# Quickstart — Spec 166 Consolidation

How to run, verify and gate each story. Every command is run from the repo root.

## Gates (every PR in this phase)

```bash
yarn typecheck   # zero errors — constitution Quality Gate 1
yarn test        # full Playwright suite — Quality Gate 2
yarn build       # clean production build — Quality Gate 3
yarn lint        # ESLint, incl. the dispatcher no-bypass rule from Story 4
yarn hygiene     # debt ratchets; fails on any regression
yarn test:unit   # Vitest lane (pin tests live here)
```

`yarn hygiene` reads `hygiene-baseline.json`. Today's baselines:

```json
{ "circularDependencies": 11, "unusedExportModules": 5, "waitForTimeoutOccurrences": 244 }
```

FR-011: these only ever go **down**. When a PR lowers a count, lower the
baseline in the same PR.

---

## Story 1 — Deterministic tests

**Measure the current residue**

```bash
grep -ro waitForTimeout tests/ | wc -l          # 244 today
grep -rc waitForTimeout tests/ | grep -v ':0' | sort -t: -k2 -rn | head
```

**The replacement patterns**

```js
// ❌ before
await page.waitForTimeout(200)
const state = await gramFramePage.getState()

// ✅ after — poll the broadcast state
await expect.poll(async () => (await gramFramePage.getState()).analysis.markers.length).toBe(2)

// ✅ after — wait on a DOM condition
await expect(page.locator('.gram-frame-markers-table tbody tr')).toHaveCount(2)
```

**Prove determinism (SC-001)**

```bash
for i in 1 2 3 4 5; do npx playwright test --retries=0 || break; done
```

Five consecutive green runs. Then set `retries: 0` in `playwright.config.ts:15`
(currently `process.env.CI ? 2 : 0`).

**New keyboard coverage**

```bash
rm tests/keyboard-focus.spec.js.disabled tests/keyboard-focus-simple.spec.js.disabled
npx playwright test tests/keyboard-movement.spec.js
```

The new spec must assert *data-coordinate deltas* per keypress (AS-1.2), at
zoom 1.0 and at a zoomed level — not element visibility.

---

## Story 2 — One coordinate pipeline

**Step 1: write the pin, run it against the four live paths — no source change yet**

```bash
yarn test:unit tests/unit/coordinate-equivalence.test.js
```

Green here means the pin is faithful (AS-2.1). Red means the four paths already
diverge: stop, triage the divergence as its own bug, do not proceed to deletion.

**Step 2: consolidate, then re-run everything**

```bash
yarn test:unit && npx playwright test tests/keyboard-movement.spec.js && yarn test
yarn hygiene    # cycles must not increase (AS-2.3)
git diff --stat tests/   # SC-002: should show zero spec diffs
```

**Confirm the deletions**

```bash
test ! -f src/utils/coordinateTransformations.js
grep -rn 'renderWidth' src/ | grep -v 'utils/coordinates.js'   # expect no transform maths outside the canonical module
```

---

## Story 3 — One drag engine

Port one machine per PR (harmonics create → doppler place → PanMode → wheel-pan).
Each PR's gate is the corresponding spec passing **unchanged**:

```bash
npx playwright test tests/harmonics-mode.spec.js
npx playwright test tests/doppler-mode.spec.js
npx playwright test tests/pan-mode.spec.js tests/mouse-wheel-navigation.spec.js
```

**Confirm the single owner (FR-004)**

```bash
grep -rn 'isDragging' src/ | grep -v 'shared/BaseDragHandler.js'   # expect only reads of state.drag
grep -rn '_wheelPan' src/                                          # expect nothing
grep -rn 'state.dragState' src/                                    # expect nothing
```

Migrate the four in-repo readers listed in data-model.md §2, and update
`types.js` plus the data/state guide in the same PR (FR-010).

---

## Story 4 — Batched notifications

> Do not start before Story 1 is merged. `GramFramePage.getState()` reads the
> debug page's state display, which a state listener writes — asynchronous
> dispatch makes every `waitForTimeout`-based read of it racy.

**Counting-listener check**

```js
await page.evaluate(() => {
  window.__notifyCount = 0
  window.GramFrame.addStateListener(() => { window.__notifyCount++ })
})
// ... perform one mode switch ...
expect(await page.evaluate(() => window.__notifyCount)).toBe(1)   // AS-4.1
```

**Burst check (AS-4.2)** — drive 60 mousemove/wheel events, then assert the
count is bounded by elapsed frames rather than event count, and that the final
state equals the pre-change value.

**Storage gate (AS-4.3)** — move the cursor 20× with no annotation change and
assert zero storage writes.

**No-bypass check (AS-4.4)**

```bash
yarn lint   # fails if any module under src/modes/ imports notifyStateListeners
```

---

## Story 5 — One diffing table

```bash
npx playwright test tests/analysis-mode.spec.js tests/harmonics-mode.spec.js \
                    tests/reformat-markers-harmonics.spec.js
```

Existing specs must pass **unchanged** (AS-5.1). Demonstrate AS-5.2 by making
one mechanism change (selected-row styling) in `DiffingTable.js` and observing
it in both tables.

---

## Phase exit criteria

| Criterion | Check |
|---|---|
| SC-001 | 5 consecutive green full runs, `retries: 0`, locally and in CI |
| SC-002 | Consolidation PR deletes three coordinate implementations with zero spec diffs |
| SC-003 | Mouse, keyboard and wheel agree at every tested zoom/expand combination |
| SC-004 | One gesture ⇒ one notification; frame-bounded under continuous input |
| SC-005 | `grep -ro waitForTimeout tests/ \| wc -l` ≤ 20, each justified inline |
| SC-006 | `git diff --shortstat main...HEAD` net-negative across the phase |
