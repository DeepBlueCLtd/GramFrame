# Contract: State Shape Additions

## Global state — `src/core/state.js` / `GramFrameState`

Add one field, initialised to the default symbol:

```js
// getInitialState() additions
selectedSymbol: 'circle'   // SymbolType — symbol applied to the next created harmonic set
```

- **Type**: `SymbolType` (see symbol-catalog).
- **Default**: `'circle'`.
- **Deep-copy**: covered by the existing deep-copy-before-notify path; a string
  field needs no special handling.
- **Writer**: `SymbolPicker.js` sets `state.selectedSymbol` on selection change.
- **Reader**: `HarmonicsMode.addHarmonicSet` reads it when creating a set.

## Harmonic set — `HarmonicSet` (runtime)

```js
/**
 * @property {SymbolType} symbol - Filled shape drawn at the top of each pin
 */
```

Assigned at creation (parallels colour):

```js
// HarmonicsMode.addHarmonicSet
const symbol = this.instance.state.selectedSymbol || 'circle'
const harmonicSet = { id, color, anchorTime, spacing, symbol }
```

## Type definitions — `src/types.js`

Add:

```js
/** @typedef {'circle'|'square'|'diamond'|'triangle'|'triangle-down'|'star'} SymbolType */
```

Extend `HarmonicSet` with `symbol: SymbolType`, `StoredHarmonicSet` with
`symbol?: SymbolType`, and the state typedef with `selectedSymbol: SymbolType`.

## Invariants

- Every harmonic set created after this feature has a defined `symbol`.
- Reading `state.selectedSymbol` always yields a valid `SymbolType` (default
  `circle`).
- No other mode reads or writes `selectedSymbol` (harmonics-only concern; the
  field lives in shared state only to mirror the colour-picker pattern).
