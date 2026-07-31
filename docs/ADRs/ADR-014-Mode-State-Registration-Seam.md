# ADR-014: Mode State Registration Seam

## Status

**Accepted** (spec 167, Story 2).

This fills the numbering gap recorded in [the ADR index](README.md#the-gap-at-014).
The number was skipped when ADR-015 was written and no decision was ever missing;
it is used here rather than left permanently unused.

## Context

`core/state.js` imported all four mode classes to build the initial state:

```js
import { AnalysisMode } from '../modes/analysis/AnalysisMode.js'
import { HarmonicsMode } from '../modes/harmonics/HarmonicsMode.js'
import { DopplerMode } from '../modes/doppler/DopplerMode.js'
import { PanMode } from '../modes/pan/PanMode.js'
```

Every mode imports `dispatch` back from `state.js`, so each of those four lines
closed a cycle. Ten of the project's eleven madge circular dependencies ran
through them (GF-03). The cycles were not academic: they made the load order
fragile, and they meant `state.js` could not be exercised in the unit lane
without dragging four modes and their entire UI dependency tree in with it.

There was a second, quieter problem. The initial state was assembled as:

```js
const initialState = {
  version: getVersion(),
  timestamp: new Date().toISOString(),
  …
  ...buildModeInitialState()
}
```

The spread came **last**, so a mode returning a `version` or `timestamp` key
would silently overwrite the real one. `tsc` reported this 20 times as `TS2783`
under `strictNullChecks`; it read as a typing nuisance and was in fact a latent
bug.

## Decision

`ModeFactory` composes the mode slices; `core/state.js` receives them.

```js
// modes/ModeFactory.js — already imports all four classes for createMode()
static getModeInitialStates() {
  const slices = Object.assign({},
    AnalysisMode.getInitialState(),
    HarmonicsMode.getInitialState(),
    DopplerMode.getInitialState(),
    PanMode.getInitialState()
  )
  assertNoCoreKeyCollision(slices)
  return slices
}

// core/state.js — imports no mode
export function createInitialState(modeStates = {}) { … }

// main.js
this.state = createInitialState(ModeFactory.getModeInitialStates())
```

`ModeFactory` is where the mode roster already lived, for instantiation. Owning
it for state as well adds no import and no new concept.

### Mode slices are additive

A mode contributes new keys; it can never overwrite a core one. The composition
copies the core state and appends only keys that are not already present, so
`version`, `timestamp`, `mode`, `zoom` and `drag` are safe by construction.

A collision is a bug in the mode, and `assertNoCoreKeyCollision` names it on the
console rather than resolving it silently. That check is left on in production:
it runs once per instance construction and costs one copy of a small object,
which is not worth a second code path to avoid.

### The no-argument form is deliberate

`createInitialState()` with no argument returns a valid core state with no mode
slices. That is what lets a unit test build state without loading a mode, which
is the observable form of "state.js does not depend on modes".

It is also a trap, and one that was sprung immediately: `_clearGram` rebuilt the
annotation slices from `createInitialState()` and, after the signature change,
set `analysis`, `harmonics` and `doppler` to `undefined` rather than empty. A
unit test now fails on any `createInitialState()` call in `src/` that omits the
slices, with `state.js` and `ModeFactory` exempt.

## Consequences

- madge circular dependencies: **11 → 1** on this change alone. The survivor,
  `ExpandToggle ⇄ table`, went with the Story 3 split ([ADR-018](ADR-018-Table-Split.md)).
- 20 `TS2783` errors gone, and with them the silent-overwrite bug.
- Adding a fifth mode touches `modes/<name>/` and `ModeFactory` — one `case` in
  `createMode`, one entry in `getModeInitialStates`, one in `getAvailableModes`.
  Not `core/state.js`.
- Merge order is fixed and explicit (analysis, harmonics, doppler, pan). It is
  observable only through collisions, which the additive rule forbids, but
  `tests/unit/mode-registration.test.js` pins the composed shape and key order
  anyway — that snapshot was written *before* the rewiring and passed unchanged
  after it, which is the evidence the move preserved the state.

## Alternatives considered

**Leave the imports and break the cycle from the mode side** — have modes not
import `dispatch`. They genuinely need to notify; the dispatcher is the only
supported route (spec 166), and passing it in would mean threading it through
every mode constructor for no gain.

**A mode registry module both sides import** — a third module holding the
roster. It works, but it is `ModeFactory` with a different name, and it splits
"which modes exist" across two files.

**Lazy initial state, resolved on first access** — defers the import rather than
removing it; the cycle survives in the module graph.
