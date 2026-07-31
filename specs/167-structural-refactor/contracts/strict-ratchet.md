# Contract — Strict type ceiling

**Story 1 · FR-001 · SC-001**

A temporary, committed overlay tsconfig plus one hygiene ratchet, both deleted
when the count reaches zero.

## `tsconfig.strict.json` (repo root, temporary)

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictPropertyInitialization": true
  }
}
```

**Why the repo root and not a temp directory**: a tsconfig outside the
repository cannot resolve `node_modules/@types`, which silently adds ~46
phantom errors. The ceiling would then be unreachable. This file must sit
beside `tsconfig.json`.

**Why all three flags in one overlay** rather than three files:
`strictPropertyInitialization` cannot be set without `strictNullChecks`
(`TS5052`), and a single overlay measured under the end-state configuration is
monotone by construction — no mid-phase re-baselining. See research §R1/§R3.

## Ratchet entry

```json
{
  "strictTypeErrors": 540
}
```

in `hygiene-baseline.json`, enforced by `scripts/hygiene.js`.

## `scripts/hygiene.js` behaviour

| Condition | Behaviour |
|---|---|
| count > baseline | **fail**, print the new errors, exit non-zero |
| count < baseline | pass, print the standard "lower the baseline in this PR" reminder |
| count == baseline | pass |
| output contains `TS5052` / `TS6046` / `TS5023` | **fail loudly** — a config error, not a type error. The overlay is malformed and the count is meaningless. Mirrors the existing madge `moduleCount < 10` guard. |
| `tsconfig.strict.json` absent | skip the ratchet silently — this is how the check disappears after PR 14 |

The detail output prints the per-flag sub-counts (`noImplicitAny` 143,
`strictNullChecks` 401) and the top offending files, so the burn-down's shape
stays visible without either sub-count becoming a gate.

The counting rule is the one already used elsewhere in the script: lines
matching `error TS`.

## Lifecycle

| Step | State |
|---|---|
| PR 1 | Overlay + ratchet added at 540. No source change. CI proves a deliberate +1 fails. |
| PRs 2–13 | Each PR that touches a strict-unclean file lowers the count and the baseline **in the same PR** (AS-1.2). |
| PR 14 | Count is 0 → the three flags move into `tsconfig.json`; `tsconfig.strict.json` and the `strictTypeErrors` entry are deleted; ADR-007 annotated (AS-1.3, AS-1.4). |

## End state (SC-001)

```json
{
  "compilerOptions": {
    "checkJs": true,
    "allowJs": true,
    "noEmit": true,
    "strict": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

No `noImplicitAny: false`, no `strictNullChecks: false`, no
`strictPropertyInitialization: false`. `yarn typecheck` passes.

## Independent test (spec US1)

With the flags on, adding an unguarded `document.querySelector('x').classList`
to any `src/` file fails `yarn typecheck`. Before the phase, it does not.

## What a burn-down PR may contain

Permitted: `@type` annotations, definite-assignment annotations at sites where
construction is legitimately deferred (documented per site, per the spec's
Assumptions), null guards that preserve the current runtime path, non-null
assertions where the invariant is genuinely established.

Not permitted: `// @ts-expect-error`, `// @ts-ignore`, `any` casts introduced to
silence an error, or a guard that changes behaviour. A site where the honest fix
*is* a behaviour change is split into its own PR with a test, and its error is
left standing until then (research §R2).
