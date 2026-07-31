# Quickstart — Phase 3 verification

How to run and verify each story. Every PR in the phase must pass the standing
gate before anything story-specific is checked.

## Standing gate (every PR, FR-011)

```bash
yarn typecheck     # zero errors
yarn test          # full Playwright suite green
yarn build         # clean production build
yarn hygiene       # no baseline raised
yarn lint
yarn test:unit
```

No PR in this phase may raise a hygiene baseline. When a PR lowers a count,
lower the baseline in `hygiene-baseline.json` **in the same PR**.

---

## Story 1 — Strict type gate

### Establish the ceiling (PR 1)

```bash
yarn hygiene
# ✔ Strict type errors (tsconfig.strict.json): 540 (baseline 540)
```

Prove the ratchet bites — introduce a deliberate regression and confirm it fails:

```bash
# add `const x = document.querySelector('.nope'); x.classList.add('a')` to any src/ file
yarn hygiene       # must exit non-zero, printing the new error
git checkout -- .
```

### Measure any flag combination by hand

```bash
node -e "
const fs=require('fs');const c=JSON.parse(fs.readFileSync('tsconfig.json','utf8'));
for (const f of process.argv.slice(1)) c.compilerOptions[f]=true;
fs.writeFileSync('tsconfig.probe.json',JSON.stringify(c,null,2));
" noImplicitAny strictNullChecks strictPropertyInitialization
npx tsc --noEmit -p tsconfig.probe.json 2>&1 | grep -c "error TS"   # 540
rm tsconfig.probe.json
```

The probe tsconfig **must be written to the repo root**. From anywhere else it
cannot resolve `node_modules/@types` and reports ~46 phantom errors.

`strictPropertyInitialization` on its own returns `TS5052` — it requires
`strictNullChecks`. That is a config error, not two type errors.

### Track the burn-down

```bash
# errors by file
npx tsc --noEmit -p tsconfig.strict.json 2>&1 | grep "error TS" | sed 's/(.*//' | sort | uniq -c | sort -rn
# errors by code
npx tsc --noEmit -p tsconfig.strict.json 2>&1 | grep -o "error TS[0-9]*" | sort | uniq -c | sort -rn
```

### Final acceptance (PR 14, SC-001)

```bash
grep -E "strictNullChecks|noImplicitAny|strictPropertyInitialization" tsconfig.json   # no matches
ls tsconfig.strict.json                                                               # not found
yarn typecheck                                                                        # passes
```

**Independent test** (spec US1): add `document.querySelector('.nope').classList`
to any `src/` file — `yarn typecheck` must now fail. Before the phase it passed.

---

## Story 2 — State and modes decoupled

```bash
# no cycle contains both state.js and a modes/ file (AS-2.1)
node -e "
import('madge').then(async ({default:m}) => {
  const g = await m('src/index.js', {fileExtensions:['js']});
  const bad = g.circular().filter(c =>
    c.some(f => f.endsWith('core/state.js')) && c.some(f => f.includes('modes/')));
  console.log('state<->modes cycles:', bad.length);
  console.log('total cycles:', g.circular().length);
})"
# expect: 0 and ≤ 1

# state.js imports no mode
grep -c "from '../modes/" src/core/state.js     # 0
```

```bash
yarn test:unit                    # mode-registration.test.js: mode loads without state.js
yarn test tests/state-listener.spec.js   # AS-2.3: one registry, no duplicate delivery, HMR
```

**Fifth-mode check (AS-2.2)**: on the spike branch, a new mode's initial state
appears in `GramFrame.__test__getInstances()[0].state` with no edit to
`src/core/state.js`.

---

## Story 3 — `table.js` split

```bash
wc -l src/components/table.js src/rendering/axes.js \
      src/components/spectrogramImage.js src/components/svgLayout.js src/core/viewport.js
# expect ≈ 135 / 310 / 90 / 60 / 305 — all under 350 (SC-004)

# table.js has exactly one importer left
grep -rn "components/table.js" src --include=*.js    # DOMSetup.js only

# the ExpandToggle cycle is gone (AS-3.3)
yarn hygiene
```

Review discipline: PRs 6–8 must read as moves.

```bash
git diff -M --stat    # renames, not rewrites
```

Behavioural gate (AS-3.1): the full suite passes **with no spec file edited**.
A spec that needed changing means the move was not a move.

---

## Story 4 — Narrow mode contract, capability seams

```bash
# deleted hooks have no callers (AS-4.1)
grep -rn "renderCursor\|getStateSnapshot" src --include=*.js     # no matches

# no mode-name reach-ins outside modes/ except the documented exception (AS-4.2)
grep -rn "modes\.\(analysis\|harmonics\|doppler\|pan\)\|modes\['" src --include=*.js
# expect: viewport.js:162 only (research §R6)

# no any-cast to a mode
grep -rn "@type {any} */ (instance.modes" src --include=*.js     # no matches

# zoom goes through one seam (AS-4.3, FR-007)
grep -rn "_zoomIn\|_zoomOut\|_zoomReset\|_setZoom" src --include=*.js
```

```bash
yarn test tests/pan-zoom.spec.js   # unchanged spec must still pass
```

---

## Story 5 — Instance surface & explicit initialization

```bash
# the two ratcheted counts
grep -rn "instance\.state" src --include=*.js | wc -l        # 243 → ≤ 185
awk '/^export class GramFrame/,/^  constructor/' src/main.js \
  | grep -cP "^  [a-zA-Z_]\w*\s*(;|=)"                       # 56 → ≤ 33

yarn hygiene    # both ratchets, monotonically down (AS-5.1)
```

**Initialization ordering (AS-5.2)**: swap two calls in the constructor and
confirm the failure is loud — a `tsc` error for a missing required argument, or
an immediate explicit throw. A silent `undefined` surfacing later is a fail.

```bash
yarn test tests/public-api.spec.js    # SC-006
```

The public-API spec runs against a fixture that does **not** set
`window.GRAMFRAME_DEBUG`, so it proves the API works without the `__test__`
hooks — and catches those hooks leaking onto a production page.

---

## Phase acceptance

| Criterion | Check |
|---|---|
| **SC-001** | `tsconfig.json` has `strict: true`, zero strict-family disables; `yarn typecheck` passes |
| **SC-002** | madge cycles ≤ 1; any residue documented in `hygiene-baseline.json` |
| **SC-003** | Fifth-mode spike touches only `modes/` + factory registration |
| **SC-004** | `table.js` is scaffold-only; the seven remaining >350-line modules are recorded as documented exceptions (see plan §Scope observations) |
| **SC-005** | Reach-ins ≤ 185; constructor fields ≤ 33 |
| **SC-006** | Every documented public API method has a behavioural (not `typeof`) assertion |

---

## Notes

- **Baselines only go down.** If a count rises, the fix is the diff, not the
  baseline.
- **Behaviour changes are never bundled into a refactor PR.** Stories 2–4 are
  move-and-rewire; Story 1's burn-down is annotations and behaviour-preserving
  guards. Anything else gets its own PR and its own test (research §R2).
- **No long-lived branch** (FR-011). Each PR lands on `main` green.
