# Phase 1 Data Model: Symbols on Harmonic Pins

## Entities

### SymbolType (enumeration)

A named filled shape used as a colour-blind-friendly visual code.

| Value | Shape | Notes |
|-------|-------|-------|
| `circle` | ● | **Default**; legacy fallback |
| `square` | ■ | |
| `diamond` | ◆ | |
| `triangle` | ▲ | |
| `triangle-down` | ▼ | inverted triangle |
| `star` | ★ | |

- **Validation**: A symbol value MUST be one of the enumeration values above.
  Any unknown/absent value resolves to `circle`.
- **Default**: `circle`.

### HarmonicSet (extended — runtime state)

Existing entity in `src/types.js`; this feature adds one field.

| Field | Type | Existing? | Description |
|-------|------|-----------|-------------|
| `id` | string | existing | Unique identifier |
| `color` | string (hex) | existing | Display colour for lines/label/symbol |
| `anchorTime` | number | existing | Y-axis (time) position in seconds |
| `spacing` | number | existing | Frequency spacing between harmonics (Hz) |
| **`symbol`** | **SymbolType** | **NEW** | **Filled shape drawn at the top of each pin; shown in the harmonics table** |

- **Relationships**: One symbol per harmonic set; the symbol is drawn on **every
  pin** of that set and once in the harmonics-table row for that set.
- **Assignment on creation**: `symbol = state.selectedSymbol ?? 'circle'`
  (parallels the existing `color = state.selectedColor` logic in
  `HarmonicsMode.addHarmonicSet`).
- **State transitions**: none intrinsic; symbol is set at creation. (Future
  per-set re-editing is out of scope for this feature.)

### GramFrameState (extended — global)

| Field | Type | Existing? | Description |
|-------|------|-----------|-------------|
| `selectedColor` | string (hex) | existing | Colour applied to the next created feature |
| **`selectedSymbol`** | **SymbolType** | **NEW** | **Symbol applied to the next created harmonic set** |

- **Default**: `selectedSymbol: 'circle'` (initialised in `src/core/state.js`).
- **Writer**: the symbol selector UI (`SymbolPicker.js`).
- **Readers**: `HarmonicsMode.addHarmonicSet` (both click/drag and manual-add
  paths, since manual-add calls the same function).

### StoredHarmonicSet (extended — persisted)

Persisted subset in `src/core/storage.js` / `src/types.js`; adds one field.

| Field | Type | Existing? | Description |
|-------|------|-----------|-------------|
| `id` | string | existing | Unique identifier |
| `color` | string (hex) | existing | Display colour |
| `anchorTime` | number | existing | Y-axis position (s) |
| `spacing` | number | existing | Frequency spacing (Hz) |
| **`symbol`** | **SymbolType (optional)** | **NEW** | **Persisted symbol; ABSENT in legacy (pre-feature) records** |

- **Save**: `saveAnnotations` writes `symbol: hs.symbol` for every set.
- **Load**: `loadAnnotations` returns the raw record; `_restoreAnnotations` in
  `main.js` applies `symbol: hs.symbol || 'circle'` so legacy records (no
  `symbol`) become `circle`.
- **Schema version**: `SCHEMA_VERSION` stays **1** — the field is additive and
  backward-compatible; no migration and no data discard.

## Backward-compatibility invariant

> A stored annotations blob written by any prior build (with no `symbol` on its
> harmonic sets) MUST load without error, and every such harmonic set MUST
> render with the `circle` symbol.

This is guaranteed by (a) not changing `SCHEMA_VERSION`, and (b) the
`hs.symbol || 'circle'` fallback on restore.

## Derived / rendering data (not persisted)

- **Pin symbol mark**: computed at render time from `(harmonicSet.symbol,
  lineX, lineTop, size, harmonicSet.color)` by `src/rendering/symbols.js`.
- **Table symbol swatch**: computed from `(harmonicSet.symbol, color)` by the
  same factory; not stored.
