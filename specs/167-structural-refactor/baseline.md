# Baseline Measurements — Phase 3

Every number below was measured at commit `7115a8a` (post-Phase-2 `main`,
PR #223 merged), not carried over from the audit. Commands are given so each
can be re-run and disputed.

The register's figures were taken at `edfc549`, before Phase 2 landed. Where
the two disagree, **the measurement here is authoritative** and the difference
is explained.

---

## 1. Strict-flag error counts (Story 1)

Measured by writing a probe tsconfig **at the repo root** (this matters — a
tsconfig outside the repo cannot resolve `node_modules/@types`, which silently
adds ~46 phantom errors) and counting `error TS` lines.

```bash
node -e "
const fs=require('fs');const c=JSON.parse(fs.readFileSync('tsconfig.json','utf8'));
for (const f of process.argv.slice(1)) c.compilerOptions[f]=true;
fs.writeFileSync('tsconfig.probe.json',JSON.stringify(c,null,2));
" noImplicitAny strictNullChecks strictPropertyInitialization
npx tsc --noEmit -p tsconfig.probe.json 2>&1 | grep -c "error TS"
rm tsconfig.probe.json
```

| Configuration | Errors |
|---|---|
| Current `tsconfig.json` (all three off) | **0** |
| `+ noImplicitAny` | **143** |
| `+ strictNullChecks` | **401** |
| `+ strictNullChecks + strictPropertyInitialization` | **401** |
| `+ noImplicitAny + strictNullChecks` | **540** |
| **All three (the Story 1 ceiling)** | **540** |

Two results drive the plan:

1. **`strictPropertyInitialization` adds zero errors** once `strictNullChecks`
   is on, and *cannot be enabled without it* — TypeScript rejects the
   combination with `TS5052: Option 'strictPropertyInitialization' cannot be
   specified without specifying option 'strictNullChecks'`. It is therefore not
   an independent burn-down. See research §R1.
2. `noImplicitAny` and `strictNullChecks` are near-independent: 143 + 401 = 544
   against a combined 540, so only 4 errors are double-reported. Enabling
   `noImplicitAny` first leaves 397 for `strictNullChecks` rather than 401 —
   a small argument for that order, reinforced by §R2.

### Distribution by file (all three flags on, 540 total)

| File | Errors | | File | Errors |
|---|---|---|---|---|
| `src/main.js` | 70 | | `src/utils/tolerance.js` | 15 |
| `src/components/table.js` | 65 | | `src/core/events.js` | 15 |
| `src/modes/harmonics/HarmonicsMode.js` | 51 | | `src/components/HarmonicPanel.js` | 11 |
| `src/modes/doppler/DopplerMode.js` | 47 | | `src/modes/pan/PanMode.js` | 8 |
| `src/core/keyboardControl.js` | 46 | | `src/components/SymbolPicker.js` | 7 |
| `src/modes/analysis/AnalysisMode.js` | 45 | | `src/components/ColorPicker.js` | 7 |
| `src/core/viewport.js` | 28 | | `src/core/initialization/ModeInitialization.js` | 6 |
| `src/core/state.js` | 21 | | `src/core/FocusManager.js` | 6 |
| `src/components/ExpandToggle.js` | 21 | | `src/components/ModeButtons.js` | 6 |
| `src/core/initialization/UISetup.js` | 20 | | `src/modes/BaseMode.js` | 5 |
| `src/core/FeatureRenderer.js` | 16 | | `src/core/configuration.js` | 5 |

Remaining 9 files carry ≤ 4 each: `GramFrameAPI.js` (4),
`BaseDragHandler.js` (3), `EventBindings.js` (2), `PinToggle.js` (2),
`MainUI.js` (2), `LEDDisplay.js` (2), `utils/doppler.js` (1),
`utils/calculations.js` (1), `storage.js` (1), `DOMSetup.js` (1).

### Distribution by error code

| Code | Count | Meaning |
|---|---|---|
| `TS18048` | 134 | `'X' is possibly 'undefined'` |
| `TS2532` | 129 | Object is possibly 'undefined' |
| `TS2339` | 54 | Property does not exist on type |
| `TS7008` | 46 | Member implicitly has an `any` type |
| `TS2345` | 46 | Argument type not assignable |
| `TS18049` | 36 | `'X' is possibly 'null' or 'undefined'` |
| `TS2783` | 20 | Property specified more than once, will be overwritten |
| `TS2722` | 17 | Cannot invoke a possibly-undefined object |
| `TS2533` | 15 | Object is possibly 'null' or 'undefined' |
| `TS7006` | 14 | Parameter implicitly has an `any` type |
| `TS7053` / `TS7005` | 7 / 6 | Implicit `any` from index access / variable |

The shape is what GF-32 predicted: 314 of 540 (58%) are nullability errors on
DOM and state access. `TS7008` is a single concentrated fix — the 46 untyped
class-field declarations in `main.js:80-165`.

`TS2783` (20) is a genuine latent bug class rather than a typing nuisance:
`src/core/state.js:38-39` sets `version` and `timestamp` and then spreads
`buildModeInitialState()` over them. Worth a look during PR 4, which touches
that exact composition.

---

## 2. Circular dependencies (Stories 2 & 3)

`yarn hygiene` — baseline **11**, current **11**.

| # | Cycle | Dissolved by |
|---|---|---|
| 1 | `ExpandToggle.js > table.js` | Story 3 (PR 7) |
| 2 | `state.js > AnalysisMode.js` | Story 2 (PR 4) |
| 3 | `state.js > DopplerMode.js > UIComponents.js > ColorPicker.js > SymbolPicker.js` | Story 2 |
| 4 | `state.js > DopplerMode.js > UIComponents.js > ColorPicker.js > keyboardControl.js` | Story 2 |
| 5 | `state.js > DopplerMode.js` | Story 2 |
| 6 | `table.js > state.js > HarmonicsMode.js` | Story 2 |
| 7 | `state.js > HarmonicsMode.js` | Story 2 |
| 8 | `table.js > state.js > HarmonicsMode.js > ManualHarmonicModal.js` | Story 2 |
| 9 | `ExpandToggle.js > table.js > state.js > PanMode.js > viewport.js` | Story 2 |
| 10 | `table.js > state.js > PanMode.js > viewport.js` | Story 2 |
| 11 | `state.js > PanMode.js > viewport.js` | Story 2 |

All 11 close through `state.js` importing a mode class, `table.js` importing
`dispatch` from `state.js`, or `ExpandToggle` ⇄ `table.js`. Cutting the four
mode imports out of `state.js` (PR 4) removes cycles 2–11; cycle 1 goes with
the Story 3 split (PR 7). **SC-002's target of ≤ 1 is comfortably reachable;
the realistic landing point is 0.**

The remaining edges into `state.js` are all one-directional imports of
`dispatch` — from `table.js`, `ExpandToggle.js`, `SymbolPicker.js` and the
three feature modes. None of them is a cycle once `state.js` stops importing
back.

---

## 3. `table.js` responsibilities (Story 3)

713 lines. Line ranges as measured:

| Lines | Responsibility | Destination |
|---|---|---|
| 22–34 | `getRenderDimensions` | `components/spectrogramImage.js` |
| 35–139 | `createComponentStructure` (private) | `components/table.js` (stays) |
| 140–205 | `setupSpectrogramImage` | `components/spectrogramImage.js` |
| 206–265 | `updateSVGLayout` | `components/svgLayout.js` |
| 266–325 | `applyZoomTransform` | `core/viewport.js` |
| 326–358 | `renderAxes` | `rendering/axes.js` |
| 359–411 | `calculateVisibleDataRange` | `core/viewport.js` |
| 412–687 | 8 private axis helpers | `rendering/axes.js` |
| 688–713 | `replaceConfigTable`, `setupComponentTable` | `components/table.js` (stays) |

Projected sizes: `axes.js` ≈ 310, `table.js` ≈ 135, `spectrogramImage.js` ≈ 90,
`svgLayout.js` ≈ 60, `viewport.js` 192 → ≈ 305. All under the SC-004 line.

Current importers of `table.js` (all rewired by PR 8):

| Importer | Imports | New source |
|---|---|---|
| `ExpandToggle.js` | `updateSVGLayout`, `renderAxes` | `svgLayout.js`, `axes.js` |
| `ManualHarmonicModal.js` | `calculateVisibleDataRange` | `core/viewport.js` |
| `HarmonicsMode.js` | `calculateVisibleDataRange`, `getRenderDimensions` | `core/viewport.js`, `spectrogramImage.js` |
| `core/viewport.js` | `applyZoomTransform`, `updateSVGLayout`, `renderAxes` | in-module, `svgLayout.js`, `axes.js` |
| `UISetup.js` | `setupSpectrogramImage` | `spectrogramImage.js` |
| `DOMSetup.js` | `setupComponentTable` | `table.js` (unchanged) |

After the split only `DOMSetup.js` imports `table.js` — which is what a
scaffold module should look like.

---

## 4. `BaseMode` hook audit (Story 4)

20 members. "Overrides" counts mode files declaring the method; "callers"
counts call sites outside `BaseMode.js`.

| Hook | Overrides | Callers | Verdict |
|---|---|---|---|
| `renderCursor` | **0** | 1 | **DELETE** — sole caller `FeatureRenderer.js:88` always hits the base no-op |
| `getStateSnapshot` | **0** | **0** | **DELETE** — dead |
| `activate` | 1 | 2 | Keep — lifecycle |
| `deactivate` | 2 | 1 | Keep — lifecycle |
| `handleMouseMove` | 5 | 6 | Keep |
| `handleMouseDown` | 4 | 1 | Keep |
| `handleMouseUp` | 4 | 1 | Keep |
| `handleMouseLeave` | 2 | 1 | Keep |
| `renderPersistentFeatures` | 3 | 3 | Keep → becomes a **capability** |
| `updateLEDs` | 3 | 1 | Keep |
| `getGuidanceText` | 4 | 3 | Keep |
| `getCommandButtons` | 1 | 2 | Keep |
| `isEnabled` | 1 | 5 | Keep |
| `resetState` | 4 | 1 | Keep |
| `cleanup` | 4 | 2 | Keep |
| `createUI` | 3 | 2 | Keep |
| `destroyUI` | 2 | 2 | Keep |
| `static getInitialState` | 4 | 4 | Keep → the **registration seam** (Story 2) |
| `getViewport` | 0 | 17 | Keep — concrete base helper, not a hook |
| `updateCursorStyle` | 2 | 3 | Keep — concrete base helper |

GF-10's claim is confirmed exactly: `renderCursor` and `getStateSnapshot` are
the two with zero overrides. `getViewport` and `updateCursorStyle` also have
zero overrides but are *concrete helpers* with 17 and 3 callers — they stay,
and the pruned `BaseMode` documents the distinction.

---

## 5. Named-mode reach-ins (Story 4)

| Site | Reach-in | Capability replacing it |
|---|---|---|
| `FeatureRenderer.js:32-44` | `instance.modes.analysis / .harmonics / .doppler` + three `hasXFeatures()` predicates | `PersistentFeatureProvider` |
| `MainUI.js:211,217` | `/** @type {any} */ (instance.modes['analysis'])`, `…['harmonics']` | `PanelOwner` |
| `PanMode.js:219,225` | `this.instance._zoomOut()`, `_zoomIn()` | `core/viewport.js` seam (FR-007) |
| `viewport.js:162` | `instance.modes.pan && instance.modes.pan.isEnabled()` | see research §R6 |
| `types.js:431-434` | `_setZoom`, `_zoomIn`, `_zoomOut`, `_zoomReset` optional members | removed with PR 12 |

---

## 6. Instance surface (Story 5)

```bash
grep -rn "instance\.state" src --include=*.js | wc -l   # 243
grep -rln "instance\.state" src --include=*.js | wc -l  # 22
```

| Quantity | Register (at `edfc549`) | Measured now | Δ |
|---|---|---|---|
| `instance.state` reach-ins | 371 | **243** | −128 (−34%) |
| Files containing them | 21 | **22** | +1 |
| Class field declarations in `main.js` | ~54 | **56** | +2 |
| Class methods on `GramFrame` | — | 16 | — |
| `this.state` inside `main.js` | — | 24 | — |

Phase 2 removed 128 reach-ins as a by-product of the coordinate and drag
consolidations. The 371 figure in the spec is stale; see research §R7 for how
SC-005 is interpreted against the current number.

The 56 fields group naturally into four cohesive sets, which is what Story 5
exploits:

| Group | Fields | Count |
|---|---|---|
| `ui` (DOM handles) | `container`, `readoutPanel`, `modeCell`, `mainCell`, `modeLED`, `rateLED`, `colorPicker`, `svg`, `cursorGroup`, `axesGroup`, `imageClipRect`, `cursorClipRect`, `leftColumn`, `middleColumn`, `rightColumn`, `modeColumn`, `guidanceColumn`, `controlsColumn`, `unifiedLayoutContainer`, `timeLED`, `freqLED`, `speedLED`, `markersContainer`, `harmonicsContainer`, `spectrogramImage`, `expandToggleButton`, `modesContainer`, `modeButtons`, `commandButtons`, `guidancePanel` | 30 |
| `interaction` | `setSelection`, `clearSelection`, `updateSelectionVisuals`, `applyColorToSelectedFeature`, `applySymbolToSelectedFeature`, `applyPinToSelectedFeature`, `applyLargeSymbolsToSelectedFeature`, `syncStyleControls`, `_symbolControl`, `_pinControl`, `_largeSymbolsControl`, `_registeredListeners`, `_wheelPanHandler`, `_wheelPanLast` | 14 |
| `viewport` | `resizeObserver`, `_boundHandleResize` | 2 |
| `persistence` | `_storageInstanceIndex`, `_isTrainerContext` | 2 |
| Core (stay on the instance) | `state`, `configTable`, `stateListeners`, `instanceId`, `modes`, `currentMode`, `featureRenderer`, `_unsupportedBrowser` | 8 |

30 + 14 + 2 + 2 + 8 = 56. Grouping the first four sets behind four sub-objects
takes the constructor's own field count from 56 to 12 — comfortably past
SC-005's ≥ 40% reduction (target ≤ 33).

---

## 7. Public API surface (Story 5 / FR-010)

Documented methods on the object returned by `createGramFrameAPI`:

| Method | Current coverage |
|---|---|
| `init()` | indirect (auto-init on every page) |
| `detectAndReplaceConfigTables(container)` | `auto-detection.spec.js:88` — `typeof` only |
| `addStateListener(callback)` | `auto-detection.spec.js:96` — `typeof` only |
| `removeStateListener(callback)` | none |
| `getExpandState()` | via `__test__` hooks only |
| `setExpandState(expanded)` | via `__test__` hooks only |

Private (`_`-prefixed, not in scope for FR-010): `_getInstances`,
`_restoreConfigTable`, `_addErrorIndicator`, `_instances`.
Debug-only, attached solely when `window.GRAMFRAME_DEBUG` is set:
`__test__flushDispatches`, `__test__getInstances`, `__test__getInstance`.

---

## 8. Other ratchets at phase start

| Ratchet | Baseline | Story 3 effect |
|---|---|---|
| `circularDependencies` | 11 | → 0 expected |
| `unusedExportModules` | 5 | unchanged (`index.js`, `browserCompatibility.js`, `storage.js`, `harmonicSampling.js`, `version.js`) |
| `waitForTimeoutOccurrences` | 1 | unchanged |

## 9. Modules over the SC-004 ~350-line guideline

| Module | Lines | Addressed by this phase? |
|---|---|---|
| `modes/harmonics/HarmonicsMode.js` | 1016 | No — documented exception |
| `components/table.js` | 713 | **Yes** — Story 3 → ~135 |
| `main.js` | 677 | **Yes** — Story 5 |
| `modes/doppler/DopplerMode.js` | 657 | No — documented exception |
| `types.js` | 617 | Exempt (declarations) |
| `modes/analysis/AnalysisMode.js` | 612 | No — documented exception |
| `core/keyboardControl.js` | 561 | No — documented exception |
| `api/GramFrameAPI.js` | 413 | No — documented exception |
| `core/events.js` | 395 | No — documented exception |

Total `src/`: 10,965 lines across 44 modules.
