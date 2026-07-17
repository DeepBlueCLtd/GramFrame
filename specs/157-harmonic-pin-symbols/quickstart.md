# Quickstart: Symbols on Harmonic Pins

## What this feature does

Adds a **symbol** (filled shape) to each harmonic set as a colour-blind-friendly
code alongside colour. You pick a symbol from a drop-down next to the colour
picker; every new harmonic set draws that filled symbol — in the set's colour —
at the top of each pin and in the harmonics table.

## Try it (manual)

1. `yarn dev` and open the debug page.
2. Switch to **Harmonics** mode.
3. In the control panel, next to **Color**, open the new **Symbol** drop-down and
   pick e.g. **Diamond**. Pick a colour too.
4. Click/drag on the spectrogram to create a harmonic set → each pin shows a
   filled diamond in the chosen colour at the top of its vertical line, clear of
   the pin-number label (which sits to the right of the line).
5. Check the **Harmonics** table on the right → the set's row shows a diamond in
   the same colour.
6. Use the **Manual** add dialog to add another set → it uses the currently
   selected symbol too.
7. Reload the page (on a trainer/persistent page) → sets come back with their
   symbols intact.

## Verify legacy behaviour

1. In devtools, seed storage with a pre-feature blob (harmonic sets **without** a
   `symbol` field), keeping `version: 1`.
2. Reload → every legacy harmonic set renders with a **circle** and does not
   error.

## Developer entry points

| Concern | File |
|---------|------|
| Symbol drop-down UI | `src/components/SymbolPicker.js` (new) |
| Mount next to colour picker | `src/components/MainUI.js` |
| Default selected symbol | `src/core/state.js` (`selectedSymbol: 'circle'`) |
| Assign symbol on create | `src/modes/harmonics/HarmonicsMode.js` (`addHarmonicSet`) |
| Draw symbol on pin | `src/modes/harmonics/HarmonicsMode.js` (`renderHarmonicSet`) + `src/rendering/symbols.js` (new) |
| Table swatch | `src/components/HarmonicPanel.js` |
| Persist symbol | `src/core/storage.js` (`saveAnnotations`) |
| Legacy default on load | `src/main.js` (`_restoreAnnotations`) |
| Types | `src/types.js` (`SymbolType`, `HarmonicSet.symbol`, `StoredHarmonicSet.symbol`, `selectedSymbol`) |

## Gates before merge

```bash
yarn typecheck   # zero errors
yarn test        # all Playwright tests green (incl. new harmonic-symbols spec)
yarn build       # clean production build
```

## Key design guardrails

- **SVG only** — symbols are SVG marks in `cursorGroup`; no Canvas, no
  absolute-DOM overlays (constitution I).
- **No schema bump** — `SCHEMA_VERSION` stays `1`; `symbol` is additive so
  legacy data is never discarded (see contracts/persistence-schema.md).
- **Mirror the colour pattern** — symbol handling parallels `selectedColor`
  end-to-end so the code stays consistent and discoverable.
