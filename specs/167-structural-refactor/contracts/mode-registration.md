# Contract — Mode state registration seam

**Story 2 · FR-002 · SC-003 · ADR-014**

How a mode contributes its slice of initial state without `core/state.js`
knowing the mode exists.

## Producer — `ModeFactory`

```js
/**
 * Compose the initial-state slices contributed by every registered mode.
 *
 * The single place that knows the mode roster for state purposes, mirroring
 * `createMode`'s role for instantiation. `core/state.js` receives the result
 * rather than importing the mode classes itself — which is what breaks the
 * state ⇄ modes cycle (GF-03).
 * @returns {Partial<GramFrameState>} Merged mode slices
 */
static getModeInitialStates() {
  return Object.assign({},
    AnalysisMode.getInitialState(),
    HarmonicsMode.getInitialState(),
    DopplerMode.getInitialState(),
    PanMode.getInitialState()
  )
}
```

`ModeFactory` already imports all four classes for `createMode`. No new imports.

## Consumer — `core/state.js`

```js
/**
 * Create a deep copy of the initial state for a new instance.
 * @param {Partial<GramFrameState>} [modeStates={}] - Mode slices from
 *   ModeFactory.getModeInitialStates(). Defaults to none so the module can be
 *   loaded and exercised without any mode being imported (AS-2.2).
 * @returns {GramFrameState}
 */
export function createInitialState(modeStates = {}) { … }
```

`core/state.js` has **no** `import … from '../modes/…'` after this change.

## Call site — `main.js`

```js
this.state = createInitialState(ModeFactory.getModeInitialStates())
```

## Key-collision rule

Mode slices are spread **first**; core keys are written **after**, so a mode
cannot overwrite `version`, `timestamp`, `mode`, `zoom`, `drag` or any other
core key. This fixes the 20 `TS2783` errors that currently report `version` and
`timestamp` being set and then spread over (`state.js:38-39`).

A mode slice whose key collides with a core key is a bug in the mode. PR 4 adds
a development-time assertion listing any collision rather than silently
resolving it.

## Merge order

Fixed and explicit: **analysis, harmonics, doppler, pan**. Order is observable
only through collisions, which the rule above forbids — but it is pinned anyway
by a frozen-snapshot unit test written before PR 4 changes anything.

## Adding a fifth mode

| File | Change |
|---|---|
| `src/modes/<name>/<Name>Mode.js` | new — extends `BaseMode`, implements `static getInitialState()` |
| `src/modes/ModeFactory.js` | one `case` in `createMode`, one entry in `getModeInitialStates`, one entry in `getAvailableModes` |

Nothing else. Specifically **not** `core/state.js`, **not**
`components/MainUI.js`, **not** `core/FeatureRenderer.js` — that is SC-003, and
the spike PR in the sequencing table is its evidence.

## Verification

| Assertion | Where |
|---|---|
| No madge cycle contains both `core/state.js` and a `modes/` file | `yarn hygiene`, baseline lowered 11 → ~1 (AS-2.1) |
| A mode module loads in the Vitest lane without importing `state.js` | `tests/unit/mode-registration.test.js` (AS-2.2) |
| `createInitialState()` with no argument returns a valid core state | same file |
| Composed state matches the frozen snapshot | same file, written **before** PR 4 |
| A fifth mode's initial state appears without editing `state.js` | `tests/mode-registration.spec.js` + the spike PR (AS-2.2, SC-003) |
