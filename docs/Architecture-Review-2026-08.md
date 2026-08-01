# Architecture Review — August 2026

**Reviewed at**: commit `91656a5` (post spec 167, including the harmonic-hover fix from PR #226)
**Scope**: all of `src/`, plus tests, build tooling and documentation accuracy
**Method**: four independent subsystem reviews (core layer; mode system; rendering/components/utils; tests/build/docs), each verifying claimed invariants against code rather than comments, then synthesized and de-duplicated. Findings independently reported by more than one reviewer are noted as such.

---

## Executive summary

The three consolidation phases (specs 165–167) delivered what they claimed. Every load-bearing invariant advertised in CLAUDE.md and the ADRs was verified against the code and **holds**, with two narrow exceptions detailed below. The dispatch/coalescing design, the drag engine, the canonical coordinate module, the capability seams and the initialization discipline are all genuinely built, not aspirational. The tooling story (ratchets, determinism, CI gating) is unusually strong.

The remaining problems cluster in four places:

1. **One user-visible data-loss bug** — pin-visibility changes on a selected harmonic set are never persisted (H1).
2. **Interaction robustness** — feature drags survive releasing the mouse off-image, and every mousemove tears down and rebuilds the entire SVG overlay (H2, H3).
3. **Teardown asymmetry** — `destroy()` skips mode cleanup, and instances removed from the DOM without `destroy()` are stranded in `FocusManager` forever (M1, M2).
4. **A parallel write path** — `keyboardControl.js` re-implements the modes' mutation cadence inline and has already drifted from it observably (M5).

Nothing here undermines the architecture; these are the next ratchet targets, not a case for another restructuring.

**Counts**: 4 high, 12 medium, ~20 low. The highs are all small fixes; the mediums split roughly evenly between quick fixes and one-file refactors.

---

## Verified invariants

Each claim was checked against code by a reviewer instructed to be skeptical. This table is the review's positive result: the refactor's contracts are real.

| Claimed invariant | Verdict | Evidence |
|---|---|---|
| All notifications via coalescing `dispatch()`; `notifyStateListeners` not exported to modes | **Holds** | `src/core/state.js:224-281`; two-tier scheduling (microtask default, rAF for pointer paths) with correct one-way frame→microtask promotion and `flushDispatch` on destroy. ESLint rule present (`eslint.config.js:90-99`) |
| State deep-copied once per delivery, not at all with no listeners | **Holds** | `src/core/state.js:157-186`; unit-verified by clone counting in `tests/unit/notification-batching.test.js` |
| `core/state.js` imports no mode (ADR-014) | **Holds** | Sole import is `utils/version.js`; slices composed by `ModeFactory.getModeInitialStates()` with a loud collision check (`ModeFactory.js:125-134`) |
| Drag state written only by `BaseDragHandler` | **One violation** | `main.js:382` — `_clearGram` writes `state.drag` directly without cancelling active drags (M4) |
| Collaborators find modes by capability, never by name (ADR-017) | **Holds, with leaks** | `FeatureRenderer` is 45 lines and names no mode; `capabilities.js` predicates are true type guards. The two documented exceptions stand; two *undocumented* rosters remain (M12) |
| Init steps declare inputs / return outputs; constructor adopts | **Holds** | Verified in all four `core/initialization/*` files; none assigns to the instance |
| `coordinates.js` is the one coordinate module | **Holds** | Grep for ad-hoc `clientX`/viewBox/margin math found only acceptable residue: `events.js:254-255` (duplicates `screenToData`'s first step) and `svgLayout.js:117-127` (the ADR-015 transform *application*, which is its job) |
| `table.js` is scaffold-only with one importer (ADR-018) | **Holds** | Builds locally, returns, writes nothing on the instance; sole importer `DOMSetup.js:17` |
| One `DiffingTable` behind markers table and harmonics panel | **Holds** | A real diff engine (update-in-place, rebuild-from-divergence, tail-trim), used by both (`HarmonicPanel.js:89`, `AnalysisMode.js:409`) |
| `rendering/` draws, does not dispatch | **Holds** | No `dispatch`/state/mode imports in `src/rendering/` |
| `strict: true`, no per-flag disables | **Holds** | `tsconfig.json` has only additive flags — but `include` covers `src/` only (M9) |
| `__test__*` gated on `window.GRAMFRAME_DEBUG` | **Holds** | `GramFrameAPI.js:27-29`; enforced negatively by `tests/public-api.spec.js` on a no-debug fixture |
| `minify: false`; version via Vite define; no tracked file written | **Holds** | `vite.config.js` |
| Deterministic tests: `retries: 0`, one justified `waitForTimeout`, no screenshots | **Holds** | `playwright.config.ts:15-19`; the single sleep is held at baseline by the hygiene ratchet — but `docs/Testing-Strategy.md:19-20` claims the opposite (M11) |
| Every path in CLAUDE.md's file list exists | **Holds** | All 53 files verified, nothing extra — though `utils/calculations.js` is misdescribed (L14) |
| Drag-engine contract (specs/166 `drag-engine.md`) | **Partial** | Single-owner and projection rules enforced mechanically; but the promised cancel-on-mouseleave/Escape/off-image-mouseup is unwired for feature drags (H2), and the documented drag threshold does not exist in the engine (doc drift) |

Gate results at review time: `yarn typecheck` ✅, `yarn lint` ✅ (0 errors, 44 warnings), `yarn hygiene` ✅ (all five ratchets at baseline), `yarn test:unit` ✅ (49 tests). Playwright suite not run for this review (36 spec files, ~263 tests, gated in CI).

---

## High-severity findings

### H1 — Pin toggle on a selected harmonic set is silently not persisted
`src/core/keyboardControl.js:481-489` — `applyPinToSelectedFeature` mutates `showPin` (a persisted field, written at `storage.js:268`) without calling `markAnnotationsChanged`, unlike its siblings `applyColorToSelectedFeature` (`:449`) and `applySymbolToSelectedFeature` (`:467`). The storage listener (`main.js:471-479`) triggers only on `annotationRevision`, counts, and doppler identity — a pin change alters none of them, so no save fires.

**Failure**: trainer toggles pin off, reloads, pin is back on. The change survives only if some *other* edit later bumps the revision, which makes the loss intermittent and hard to report. (`applyLargeSymbolsToSelectedFeature` also skips the call, but `largeSymbols` is deliberately unpersisted, so that one is correct.)

**Fix**: one line plus one test in the restyle suite.

### H2 — Feature drags survive off-image mouseup and mouseleave
Found independently by both the core and mode-system reviewers. `events.js:317-335` delegates `handleMouseUp` only when the pointer is over the image (`screenToDataWithZoom` returns null over the 60px/50px axis margins). Analysis, Harmonics and Doppler do not cancel on mouseleave (`AnalysisMode.js:200-203` is empty; the others have no override), and no Escape or document-level mouseup fallback exists. Only PanMode (`PanMode.js:158-161`) and the wheel-pan (`events.js:343`) defend themselves.

**Failure**: drag a marker, release the button over the left axis or outside the component; the engine still reports `isDragging`, and when the pointer re-enters, the marker chases the cursor with no button held while `state.drag` broadcasts a phantom drag. This directly violates the drag-engine contract's cancel clause (`specs/166-consolidation/contracts/drag-engine.md`).

**Fix**: wire it centrally in `events.js` — on mouseleave and off-image mouseup, cancel (or end at the last on-image position) via the current mode's handler. The engine already provides `cancelDrag`; nothing calls it.

### H3 — Full SVG overlay rebuild on every mousemove
`handleMouseMove` → `updateCursorIndicators` (`events.js:277`) → `cursorGroup.innerHTML = ''` (`rendering/cursors.js:14`) → `FeatureRenderer.renderAllPersistentFeatures()`, which clears the group *again* (`FeatureRenderer.js:37`) and rebuilds every marker, harmonic set and doppler feature from scratch — synchronously, per event. Only the listener *notification* is rAF-coalesced; the DOM rebuild is not.

**Failure**: a training page with several instances and dozens of features does full SVG teardown/rebuild at mousemove rate (100Hz+ on high-polling mice) — visible lag on exactly the low-end field machines the unminified build is shipped for. Persistent features do not change on hover; a plain mousemove needs no feature re-render at all.

**Fix**: split hover from feature rendering — mousemove updates LEDs/cursor only; `renderAllPersistentFeatures()` runs on real feature/viewport changes (create/move/delete/zoom/expand/mode-switch). Remove the double clear. Optionally rAF-gate the rebuild the same way `dispatch({frame:true})` already gates notifications.

### H4 — Lint warnings are the one unratcheted debt class
`yarn lint` exits 0 with 44 warnings (mostly `no-unused-vars`, `no-shadow`); there is no `--max-warnings` cap and no hygiene ratchet on the count. The `eslint.config.js` header promises "warnings get promoted to errors as debt is paid down", but nothing prevents the count rising — in a codebase whose whole tooling philosophy is ratchets.

**Fix**: `--max-warnings 44` in the lint script, or a `lintWarnings` entry in `hygiene-baseline.json`, ratcheting down like everything else.

---

## Medium-severity findings

### M1 — `destroy()` never deactivates the current mode
`main.js:511-523` flushes dispatch, removes listeners, keyboard control and the container — but never calls `currentMode.cleanup()`/`deactivate()`. Mode-held resources (e.g. `ManualHarmonicModal` DOM, mode handles) outlive the instance. Leaks on SPA-style pages that create/destroy instances.

### M2 — Instances removed from DOM without `destroy()` leak via FocusManager
`GramFrameAPI._getInstances()` filters out disconnected instances (`GramFrameAPI.js:191-195`), but `FocusManager.registeredInstances` is a strong `Set` (`FocusManager.js:16`) that only shrinks via `destroy()`. A host page that swaps `innerHTML` strands the instance — and its whole DOM subtree via `ui.*` handles — forever, and keeps the global keydown handler installed. The API and FocusManager have inconsistent liveness models. Fix M1 and M2 together as one teardown-unification change.

### M3 — Two independent sources of truth for trainer/student storage context
`persistence._isTrainerContext` is detected once at construction (`main.js:201`), yet every `saveAnnotations`/`loadAnnotations`/`clearAnnotations` re-runs `detectUserContext()` — a full-document `querySelectorAll('a')` scan (`storage.js:117-123`) — on every annotation change. If the DOM changes after load, save and load can hit *different* storages, silently splitting annotations between localStorage and sessionStorage. The instance already caches the answer; storage.js just doesn't take it.

### M4 — `_clearGram` bypasses the drag engine
`main.js:382` writes `this.state.drag` directly and — unlike `_switchMode` (`main.js:551-555`) — does not call `cancelDrag()` first. Clicking "Clear gram" mid-drag leaves the engine's private `dragState` saying *dragging* while the projection says *idle*; the next `publishDragProjection` resurrects the stale drag. Exactly the two-owners bug the single-owner invariant exists to prevent. Fix: run the same cancel loop `_switchMode` uses, drop the direct write.

### M5 — The mutation cadence is copy-pasted ~8×, and keyboardControl is a parallel write path that has already drifted
The sequence *mutate slice → `markAnnotationsChanged` → `renderAllPersistentFeatures` → refresh panel → `dispatch`* appears in AnalysisMode add/remove/dragUpdate (`AnalysisMode.js:497-519, 525-550, 87-112`) and HarmonicsMode add/update/remove (`HarmonicsMode.js:366-418, 425-443, 449-473`) — and again, bypassing the modes entirely, in `keyboardControl.js:196-207` (direct `marker.freq =` writes) and `:280-292` (inline `Object.assign` re-implementing `updateHarmonicSet`). The drift is already observable: keyboard resize clamps harmonic spacing to **1.0** (`keyboardControl.js:261`) where drag resize clamps to **0.1** (`HarmonicsMode.js:624`). H1 is also a direct consequence of this duplication. Fix: one `commitAnnotationChange` helper, and route keyboard moves through the modes' own update paths.

### M6 — Cursor-style target is inconsistent across modes
`BaseMode.updateCursorStyle` targets `spectrogramImage` (`BaseMode.js:221-225`); Analysis and Harmonics override it with *identical* bodies targeting `ui.svg` (`AnalysisMode.js:127-131`, `HarmonicsMode.js:133-137`); Pan has its own (`PanMode.js:62-66`); Doppler alone inherits the base and styles a different element — so the wheel-pan's cursor save/restore (`events.js:105,126-128`), which reads `svg.style.cursor`, can fight it. Fix: base helper targets `ui.svg`; delete both overrides; Doppler inherits the fix.

### M7 — Analysis hit-testing does not follow what is drawn
`findMarkerAtPosition` always tests the 15px crosshair-arm geometry (`AnalysisMode.js:585-598`) even when the marker renders as a compact symbol (`AnalysisMode.js:306-316`) — a symbol marker is grabbable along a 30×30px invisible cross. HarmonicsMode explicitly established the opposite principle ("hit-testing follows exactly what is drawn", `HarmonicsMode.js:478-486`). Three modes currently use three hit-test strategies; only the tolerance constants are shared.

### M8 — Style-control components install side-channel handles on `instance.interaction`
Four files write underscore-named handles onto the shared surface: `syncStyleControls` (`ColorPicker.js:143`), `_symbolControl` (`SymbolPicker.js:78`), `_pinControl` (`PinToggle.js:67`), `_largeSymbolsControl` (`SymbolPicker.js:132`) — read by `keyboardControl.js`. Construction order is an invisible contract and typecheck cannot help (dynamic installs). Reordering panel construction or mounting a picker twice silently breaks selection sync. Fix: one declared registration point, e.g. `interaction.registerStyleControls({...})`.

### M9 — `tests/` is excluded from the type gate
`tsconfig.json` includes only `src/**`. The ~1,300 lines of JSDoc-typed helpers (`tests/helpers/`, including an orphaned `global.d.ts`) and 36 spec files get zero `tsc` checking; helper/type drift surfaces only as runtime test failures.

### M10 — Release workflow ships stale user-facing docs
`release.yml`'s generated README example uses the **legacy 3-column config format** that CLAUDE.md explicitly says is unsupported, and its release notes name a "Cross Cursor" mode that is now Analysis. This is documentation handed to end users at every release.

### M11 — Testing-Strategy.md contradicts the determinism config
`docs/Testing-Strategy.md:19-20` claims CI retries twice; `playwright.config.ts` sets `retries: 0` unconditionally with a comment saying exactly the opposite (only the WebKit smoke lane retries). Doc and config disagree on a determinism-critical setting.

### M12 — Mode-roster leaks contradict "adding a mode touches `src/modes/` and ModeFactory"
`ModeButtons.js:28` hardcodes `['pan','analysis','harmonics','doppler']` instead of deriving from `ModeFactory.getAvailableModes()`, and `utils/calculations.js:28-31` carries a mode→display-name map. A fifth mode must touch both. Related: the `createUI`/`destroyUI` lifecycle is vestigial — `createUI` is invoked only for analysis and harmonics at init (`ModeInitialization.js:51-54`), `destroyUI` has **zero callers**, and two modes stub it with "don't call super" comments. ADR-017's own standard ("a hook with no real use is a no-op dressed up as a contract") condemns these.

---

## Low-severity findings

**Core**
- L1 — Dead forwarder chain in `main.js`: `_setRate` (`:643-654`, zero callers), `_updateAxes` (called only by `_setRate`), `_updateZoomControlStates` (zero callers), plus ~40 lines of deleted-method residue (`:296-308, 525-533, 656-659`).
- L2 — Stale cycle rationale: `BaseDragHandler.js:73-75` and `main.js:500-506` justify the `notifyStateListeners` forwarder with "core/state.js imports every mode" — false since ADR-014; the forwarder is now unnecessary indirection with an untrue comment. (Found independently by two reviewers.)
- L3 — `keyboardControl.js` (572 lines) is half selection/restyle machinery with nothing keyboard about it; imported by `EventBindings`, `PinToggle`, `ColorPicker` et al. Natural split: `keyboardControl.js` + `core/selection.js`.
- L4 — `initialState.timestamp` is module-load time (`state.js:26`), shared by every instance, broadcast as if meaningful.
- L5 — `window.GramFrame` registered twice, and `init()` never runs if the script is injected after `DOMContentLoaded` (`main.js:666-681`, no readyState check).
- L6 — `handleMouseMove` calls `getBoundingClientRect()` twice per event (`events.js:254-255`), on the hottest path; also duplicates `screenToData`'s first step.
- L7 — `configuration.js` has a no-op catch-rethrow (`:101-104`) and two error philosophies in one file (image-URL failure logs and continues; range failure throws).
- L8 — `events.js:96-132` instantiates the wheel-pan `BaseDragHandler` inline — the one core→`modes/shared/` reach-in; `shared/` is arguably infrastructure mislocated under `modes/`.

**Modes**
- L9 — HarmonicsMode fabricates a `cursorPosition` with zeroed screen/SVG fields during drag (`HarmonicsMode.js:111-115`); any reader of `svgX` mid-drag gets garbage. `findHarmonicSetAtFrequency` reads `state.cursorPosition.time` instead of taking it as a parameter (`:488-490`) — a hidden ordering dependency.
- L10 — Hygiene: deprecated `substr` (`HarmonicsMode.js:367`) vs `substring` (`AnalysisMode.js:238`) in duplicated id-minting; undeclared instance fields assigned outside constructors (`AnalysisMode.js:101-105, 409`); empty vestigial bodies (`HarmonicsMode.js:649-656`, `AnalysisMode.js:625-643`); stale comment claiming doppler curve logic mirrors `cursors.js` (`DopplerMode.js:602`); doppler hover cursor never resets after right-click clears features (`DopplerMode.js:303-306`).

**Rendering / components**
- L11 — Duplicate class `gram-frame-table` on the layout div (`table.js:35`) and the diffing `<table>` (`DiffingTable.js:39`); CSS works around it with an apology comment (`gramframe.css:622-638`). Cheap rename now versus permanent selector footguns.
- L12 — Time axis uses hardcoded 5 evenly spaced ticks (`axes.js:115-121`) while frequency gets the nice-numbers engine (`:152-219`); labels like `00:07`/`00:23` at arbitrary intervals, worse zoomed. Also `renderFrequencyAxis`'s `_naturalHeight` is documented "(unused)" yet load-bearing at `:292` — an "unused param" cleanup would break the axis.
- L13 — `ManualHarmonicModal` is the single `innerHTML`-template deviation from the programmatic-DOM norm (`:40-55`, static, no XSS path today) and hardcodes global element ids that can collide with the host page. `MainUI.updateUniversalCursorReadouts` (`MainUI.js:192-206`) re-implements the `setLEDValue` helper inline, per mousemove. Layout magic numbers as inline JS styles (`MainUI.js:41-99`). DiffingTable node-cells rebuilt every update (`DiffingTable.js:69-77`, `HarmonicPanel.js:99-104`). Accessibility unevenly applied: mode buttons lack `aria-pressed`, colour canvas is keyboard-inaccessible, DiffingTable rows have no `tabindex`/`aria-selected` — while ExpandToggle/PinToggle/StorageWarning are properly labelled. Axis major/minor coincidence uses an absolute FP epsilon on a modulo (`axes.js:324`).
- L14 — `utils/calculations.js` contains no calculations — only mode display names (CLAUDE.md still says "Mathematical calculations"); it belongs beside its two UI importers. `ColorPicker.js` does three jobs (slider, whole-symbol-panel assembly at `:95-103`, sync-hook install at `:143-159`). `UIComponents.js` is a vestigial barrel. `spectrogramImage.js` and `ExpandToggle.js` import `dispatch` directly — components dispatching state; worth a deliberate rule either way.

**Tests / tooling**
- L15 — Pure-JS modules with no unit tests: `utils/doppler.js`, `calculations.js`, `timeFormatter.js`, `tolerance.js`, `secureHTML.js` — exactly the profile the Vitest lane exists for; doppler math is tested only through e2e.
- L16 — No coverage measurement in any lane; coverage shape is asserted by narrative, not measured. Firefox untested (documented honestly; Gecko SVG quirks are a known risk class for this component). `release.yml` posts to a public ntfy.sh topic anyone can subscribe to or spoof.

---

## Size and cohesion

- **`HarmonicsMode.js` (1058 lines) is three modules in one class**: ~350 lines of genuine mode logic; ~280–350 lines of pure SVG construction (`:793-1043`) that is the same species of code as `rendering/symbols.js`; ~120 lines of pin geometry deliberately shared by renderer and hit-test (`:793-801, 913-976`) — the right coupling, extractable as a geometry module both sides import. An extraction mirroring the ADR-018 table split removes ~350–400 lines from the repo's largest file with zero behaviour change.
- **`DopplerMode.js` (688) has the same shape, smaller**: ~185 lines of pure drawing (`:483-667`) including verbatim-duplicated f+/f− circle construction.
- **`main.js` (704) is no longer a god-file by size — but the instance is still the god-parameter.** Static fan-in is 1, but the `GramFrame` instance is passed to essentially every module in `src/`, and its underscore methods form an implicit interface invoked from `events.js`, `viewport.js` and `UISetup.js` — type-checked, but invisible to import-graph tooling. ~150 of its lines are blank/deleted-method residue.
- **`keyboardControl.js` (572)** — see L3.
- Everything else is well-sized: state 323, storage 346, BaseDragHandler 319, initialization files 31–97 (genuinely thin, as claimed), `FeatureRenderer` 44.

---

## Recommendations

In priority order. The first tier is small, behaviour-fixing, and each item is one PR.

### Tier 1 — bugs and contract repairs (small, high value)
1. **Persist the pin toggle** (H1): add `markAnnotationsChanged` in `applyPinToSelectedFeature` + one restyle-suite test.
2. **Wire drag cancellation** (H2): central handling in `events.js` for mouseleave and off-image mouseup (plus Escape, which the engine already supports); align the drag-engine contract doc with reality on the non-existent threshold.
3. **Route `_clearGram` through `cancelDrag`** (M4), and delete the dead `_setRate`/`_updateAxes`/`_updateZoomControlStates` chain and comment residue while in `main.js` (L1).
4. **Cap lint warnings** (H4): `--max-warnings` or a hygiene ratchet entry.
5. **Fix the three stale docs** (M10, M11): release.yml's legacy config example and "Cross Cursor" naming; Testing-Strategy's retries claim; the stale cycle comments (L2) — and retire the now-unnecessary `notifyStateListeners` forwarder with them.

### Tier 2 — performance and teardown (moderate, one subsystem each)
6. **Split hover from feature rendering** (H3): mousemove updates LEDs/cursor only; feature re-render on real changes; remove the double clear. Biggest perceived-performance win available for the least structural change.
7. **Unify teardown** (M1+M2): `destroy()` calls mode cleanup; FocusManager's liveness model made consistent with the API's (weak refs, or the API destroying disconnected instances).
8. **Single-source the storage context** (M3): pass the constructor-detected context into storage functions; removes both the split-storage failure mode and the per-save DOM scan.

### Tier 3 — consolidation (the next ratchet round)
9. **One mutation helper** (M5): `commitAnnotationChange(...)` encapsulating the cadence; route `keyboardControl` moves through the modes' own update paths, eliminating the parallel write path and the 0.1-vs-1.0 clamp drift.
10. **Extract harmonic pin rendering + geometry** to `src/rendering/` (then the doppler equivalent) — ~550 lines out of the two largest modes with zero behaviour change.
11. **Close the roster leaks and retire dead lifecycle hooks** (M12): `ModeButtons` derives from the factory (absorbing the display-name map); delete `destroyUI`; make `createUI` honest.
12. **Consolidate cursor styling** (M6) and align Analysis hit-testing with what is drawn (M7).
13. **Formalise style-control registration** (M8); split `keyboardControl.js` (L3); type-check `tests/` (M9); unit-test `utils/doppler.js` (L15); rename one `gram-frame-table` class (L11); give the time axis the nice-numbers engine (L12); accessibility pass (L13).

---

*Review artefacts: four subsystem reports synthesized into this document; overlapping findings de-duplicated with both attributions noted. All file:line references are against commit `91656a5`.*
