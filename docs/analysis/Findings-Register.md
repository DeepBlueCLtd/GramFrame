# Findings Register — GramFrame Architecture & Implementation Audit

**Date:** 2026-07-23 · **Re-verified:** 2026-07-31 against `edfc549` — see [§6](#6-re-verification--2026-07-31) · **Companion:** [Architecture-Analysis.md](Architecture-Analysis.md)

Every row was adversarially verified by independent reviewer agents running on a different Claude model (Opus) than the author, given only the claim and repo access and instructed to refute it. Critical/High claims: three verifiers (correctness / reproducibility / severity lenses), 2-of-3 majority required. Medium/Low claims: one verifier. The **Verified** column records the outcome; severities below are the *post-review* severities (the severity lens's corrections were applied). Refuted findings are retained in §5 with their refutations — not silently dropped.

**Severity rubric:** Critical = active correctness/data-loss risk · High = materially slows or endangers feature work · Medium = friction/rot · Low = polish.
**Effort:** S ≤ half day · M ≤ 3 days · L > 3 days.

Review outcome in brief: of 19 findings originally rated Critical/High, 17 were factually confirmed but 16 of those had their severity downgraded (mostly to Medium) under the rubric, one was refuted outright (GF-01), and one was narrowed (GF-26). Of 25 Medium/Low findings, 23 were confirmed (two with minor evidence corrections) and two were refuted as stated (GF-21, GF-28). **Post-review distribution: 0 Critical, 1 High, 35 Medium, 8 Low.**

---

## 1. High

| ID | Dim | Finding | Evidence | Recommendation | Effort | Verified |
|----|-----|---------|----------|----------------|--------|----------|
| GF-32 | Process | Type gate gutted: `strict: true` but `strictNullChecks`, `noImplicitAny`, and `strictPropertyInitialization` disabled — in DOM-heavy code full of nullable `querySelector`/`boundingBox` returns, and JSDoc+tsc is the project's only type defense (ADR-007) | `tsconfig.json:6-11` | Re-enable per-flag with a staged burn-down of resulting errors | M | CONFIRMED 2/3 (severity: PLAUSIBLE) |

## 2. Medium

### Architecture & module boundaries

| ID | Finding | Evidence | Recommendation | Effort | Verified |
|----|---------|----------|----------------|--------|----------|
| GF-01ᴿ | Coordinate pipeline implemented 4× (`utils/coordinates.js`; `utils/coordinateTransformations.js`; private funcs in `keyboardControl.js`; inline in `events.js`) — *reframed after refutation:* the implementations are currently mutually consistent (keyboard compensates zoom via `increment/zoomLevel` + offset-cancelling round-trip), so this is duplication/fragility, not an active bug; any future change to one path can silently break the equivalence | `keyboardControl.js:104,303-354`, `events.js:19-72`, `coordinateTransformations.js` | Consolidate on `coordinateTransformations.js`; delete the other paths; pin the equivalence with unit tests | M | Original Critical claim REFUTED 0/3; duplication itself verified — reframed at reviewer-assigned severity |
| GF-02 | `events.js:164-165` writes SVG coords into `cursorPosition.imageX/imageY` (comment admits it); `types.js:61-62` documents them as image-relative — published state contradicts its own contract, though no in-repo consumer reads the fields | `events.js:51-52,71,156,164-165`, `types.js:61-62,516-517` | One-line fix: the correct values are already computed and discarded | S | CONFIRMED 2/3, severity High→Medium |
| GF-03 | Hard import cycle `state.js` ⇄ all four modes (state imports mode classes for initial state; modes import `notifyStateListeners` back, 13 self-broadcast sites); 8 madge cycles, 7 involving this boundary. Benign at runtime today (hoisted function + static methods) but load-order-fragile coupling | `state.js:10-13,20-31`, mode files | Modes register state slices via ModeFactory; single notification dispatcher in core | M | CONFIRMED 2/3, severity High→Medium |
| GF-04 | `ModeFactory` throws on `localhost` but in production console.warns and returns a no-op `BaseMode` — a mode-construction failure silently kills interaction. Low-probability (dev-caught bug class), but the swallowed error hinders field diagnosis | `ModeFactory.js:47-54`, `BaseMode.js:36-87` | Fail loud via the `.gramframe-error-indicator` pattern (`GramFrameAPI.js:249-290`); drop the hostname check | S | CONFIRMED 2/3, severity Critical→Medium |
| GF-05 | God-object: ~50 public fields on the instance (`main.js:65-133`); `instance.state` accessed 347× across 19 files; class methods are forwarders to free functions taking the instance back — no encapsulation boundary | `main.js:65-133,203-252` | Carve seams incrementally (stages 2–4 of the roadmap shrink the surface); no big-bang store | L | CONFIRMED 2/3, severity High→Medium |
| GF-07 | Full-state `JSON.parse(JSON.stringify)` clone per listener notification, fired on every mousemove and drag frame; cost scales with annotation count (imperceptible at realistic counts, hence Medium) | `state.js:112`, `events.js:186`, `AnalysisMode.js:77`, `DopplerMode.js:244` | Throttle mousemove broadcasts; clone only for external listeners | M | CONFIRMED 2/3, severity High→Medium |
| GF-08 | Broadcast diffusion: ~29 `notifyStateListeners` sites across 12 files, unbatched — one gesture fires several clones; some mutations never notify | `main.js:492`, `viewport.js:65,83-85`, `main.js:323-350` | Single choke-point dispatch with microtask batching | M | CONFIRMED 1/1 |
| GF-09 | `table.js` (703 lines) is a misnamed hub owning scaffold, image loading, layout, zoom math, visible-range computation, and the axis engine; imported by modes/viewport for non-table exports; in 4 of 8 cycles incl. mutual `ExpandToggle` cycle | `table.js:12,252-306,345-391,465-665`, `ExpandToggle.js:11` | Split into layout/axes/imageSetup; the cycle dissolves with the split | M | CONFIRMED 2/3, severity High→Medium |
| GF-10 | `BaseMode` interface too wide: ~20 hooks; `renderCursor`/`getStateSnapshot` overridden by no subclass; several subclass overrides are empty no-ops | `BaseMode.js`, `FeatureRenderer.js:82-90`, `AnalysisMode.js:388-391,687-688,704-705` | Prune to the hooks modes actually implement | S | CONFIRMED 1/1 |
| GF-11 | Modes are not islands: `MainUI` calls named mode methods; `FeatureRenderer` reaches into named modes; PanMode calls `instance._zoomIn/_zoomOut` | `MainUI.js:204-222`, `FeatureRenderer.js:32-44`, `PanMode.js:234,240` | Capability interfaces instead of named-mode reach-ins | M | CONFIRMED 1/1 |
| GF-12 | `_clearGram` hand-resets ~13 nested fields instead of rebuilding from `createInitialState` — init/clear drift is inevitable | `main.js:278-296` | Rebuild from `createInitialState()`, preserving config/imageDetails | S | CONFIRMED 1/1 |
| GF-13 | Initialization is a fixed 10-call order-sensitive sequence with implicit dependencies and double-nulling between setup modules | `main.js:152-161`, `DOMSetup.js:88-93` | Make dependencies explicit (return values over instance mutation) | M | CONFIRMED 1/1 |
| GF-15 | Dynamic `import()` in the arrow-key hot path with empty `.catch(() => {})` | `keyboardControl.js:275-279` | Static import; surface errors | S | CONFIRMED 1/1 |

### Code quality & maintainability

| ID | Finding | Evidence | Recommendation | Effort | Verified |
|----|---------|----------|----------------|--------|----------|
| GF-16 | Storage layer swallows all errors with bare `catch {}` returning booleans callers ignore — save failures (quota, corruption) are silent. Impact bounded: persistence is best-effort and current-session work survives | `storage.js:125-127,203-205,242-245,262-264`, `main.js:372` | Surface a UI signal on save failure | S | CONFIRMED 2/3, severity High→Medium |
| GF-17 | Drag state double-bookkept: `BaseDragHandler` authoritative fields mirrored into `state.analysis.*` ("for backward compatibility") and `state.dragState.*` | `BaseDragHandler.js:51-57`, `AnalysisMode.js:37-39,401-406`, `HarmonicsMode.js:72-77` | Single owner; read-only projection for listeners | S | CONFIRMED 1/1 |
| GF-18 | Drag fragmentation: PanMode hand-rolls drag; Harmonics creation and Doppler placement each run a second manual drag machine beside their `BaseDragHandler` | `PanMode.js:17-21,57-134`, `HarmonicsMode.js:154,187-213`, `DopplerMode.js:257-311` | Extend `BaseDragHandler` for creation/placement; port PanMode | M | CONFIRMED 1/1 |
| GF-19 | Copy-paste hit-testing ×3 in Doppler while `tolerance.js` helpers go unused | `DopplerMode.js:62-99,162-193`, `tolerance.js:91-144` | Use the tolerance helpers | S | CONFIRMED 1/1 |
| GF-20 | Same row-diffing table engine maintained twice (markers table vs harmonics panel), incl. duplicated click-to-select logic | `AnalysisMode.js:536-674,611-624`, `HarmonicPanel.js:59-155,207-220` | Extract one diffing-table component | M | CONFIRMED 1/1 |
| GF-22 | Dead code: 3 never-called DopplerMode methods; deprecated `zoom.panMode` in state + public type; vestigial `markersPlaced`; `visual-helpers.js` unused; 15 modules with unused exports | `DopplerMode.js:158-196,504-528,609-612,478,413`, `state.js:79`, `types.js:153` | Delete; ratchet with `ts-unused-exports` in CI | S | CONFIRMED 1/1 |
| GF-24 | API keeps two disagreeing instance registries (DOM scan vs `_instances`) — methods can operate on different instance sets | `GramFrameAPI.js:108-111,164-167,184,196,211-214,228` | Single registry | S | CONFIRMED 1/1 |

### Testing strategy

| ID | Finding | Evidence | Recommendation | Effort | Verified |
|----|---------|----------|----------------|--------|----------|
| GF-25 | No unit-test lane: Playwright is the only runner; pure math validated only through browser E2E; the 9 pure-JS sampling assertions boot Vite+Chromium | `package.json`, `tests/harmonic-sampling-unit.spec.js:1` | Add Vitest (dev-only; zero-runtime-dep stance unaffected) | M | CONFIRMED 2/3, severity High→Medium |
| GF-26ᴺ | *Narrowed:* arrow-key marker-movement behavioral coverage was lost when the two `keyboard-focus` specs were disabled without explanation; FocusManager itself retains active coverage (`focus-simple.spec.js`, `tab-navigation.spec.js`), so the gap is `keyboardControl.js`'s movement path — where the transform duplication (GF-01ᴿ) lives | `tests/keyboard-focus*.spec.js.disabled`, `tests/keyboard-simple.spec.js:11-83` | Restore an arrow-key movement assertion spec | M | Correctness REFUTED as stated / repro CONFIRMED — narrowed, High→Medium |
| GF-27 | 142 `waitForTimeout` occurrences incl. in the page object; CI `retries: 2` masks flakiness | `gram-frame-page.js:270,413,426`, `playwright.config.ts:11` | State-based waits; drop retries once stable | M | CONFIRMED 2/3, severity High→Medium |
| GF-29 | Visual regression testing claimed (CLAUDE.md:126) but nonexistent: zero snapshot assertions; `visual-helpers.js` reachable only transitively via `fixtures.js` and never used by any spec | suite grep; `playwright.config.ts:20` | Adopt `toHaveScreenshot` for key renders or delete claim + helper | S | CONFIRMED 1/1 (evidence corrected) |
| GF-30 | PanMode is the only mode with no dedicated spec; no zoom/viewport spec (clamping untested); API tested mainly via `__test__` hooks | `tests/` inventory, `viewport.js:21,31` | Add pan + zoom specs; test the public API surface | M | CONFIRMED 1/1 |

### Implementation strategy & process

| ID | Finding | Evidence | Recommendation | Effort | Verified |
|----|---------|----------|----------------|--------|----------|
| GF-31 | No linting anywhere: no ESLint config, script, or CI step (`.gitignore` even lists `.eslintcache`) | `package.json:5-14`, `.github/workflows/` | ESLint flat config + CI step | S | CONFIRMED 2/3, severity High→Medium |
| GF-33 | `madge`, `ts-unused-exports`, `unimported` installed but never wired to any script or CI — the 8 cycles and 15 dead-export modules went unreported | `package.json:19-22` | `yarn hygiene` script + CI ratchet on new cycles/dead exports | S | CONFIRMED 1/1 |
| GF-34 | CI never builds the standalone bundle (the shipped artifact) on the test path; chromium-only; Node 18 (EOL) vs `@types/node ^24` | `.github/workflows/test.yml`, `package.json:17` | Add `build:standalone` to test.yml; bump Node; webkit smoke job | S | CONFIRMED 1/1 |
| GF-36 | Repo hygiene: tracked `playwright-report/index.html` (contradicting `.gitignore`), `.obsidian/` vault, `Memory/` + 61 KB `Memory_Bank.md` + `Implementation_Plan.md`, 404 KB `prompts/`, 276 KB unreferenced `zoom-demonstrator/` shadowing real module names | `git ls-files`, `.gitignore` | Untrack/archive; fix force-adds | S | CONFIRMED 1/1 |

### Documentation drift

| ID | Finding | Evidence | Recommendation | Effort | Verified |
|----|---------|----------|----------------|--------|----------|
| GF-38 | CLAUDE.md materially stale: three modes claimed (four exist); phantom `src/rendering/axes.js`; ~15 real modules missing from File Structure; nonexistent test files cited; nonexistent visual testing claimed | `CLAUDE.md:26,31,52,89,126,139` vs `src/` tree | Regenerate structure + mode sections; audit remaining claims | S | CONFIRMED 2/3, severity High→Medium |
| GF-39 | ADR-015 (accepted) mandates viewBox-based zoom, "No Image Transforms"; implementation keeps viewBox fixed and resizes the image element — the rejected approach is what shipped | `ADR-015:33-45` vs `table.js:219,252-306` | Rewrite or supersede ADR-015 | S | CONFIRMED 2/3, severity High→Medium |
| GF-40 | ADR-011 documents a fictional FeatureRenderer API — every listed method name is nonexistent | `ADR-011:37-52` vs `FeatureRenderer.js:10-92` | Correct the ADR | S | CONFIRMED 1/1 |
| GF-41 | `Gram-Modes.md` describes *two* modes (Analysis, Doppler) — omits Harmonics and Pan | `docs/Gram-Modes.md:3` | Rewrite or fold into Tech-Architecture.md | S | CONFIRMED 2/3, severity High→Medium |
| GF-42 | `Testing-Strategy.md` prescribes Jest + 80% coverage + "all functions must have unit tests" — none of it exists or ever ran | `docs/Testing-Strategy.md:97-117`, `package.json` | Rewrite to describe the real (and labeled-target) strategy | S | CONFIRMED 2/3, severity High→Medium |
| GF-43 | Mode-count drift replicated: README (line 7), ADR-008, test-helper mode maps omit pan; ADR numbering skips 014; ADR-004 example code contradicts implementation | `README.md:7`, `ADR-008:7,58-61`, `state-assertions.js:130,150`, `ADR-004:42-51` | One sweep fixing the mode list everywhere; note the ADR-014 gap | S | CONFIRMED 1/1 (line ref corrected) |

## 3. Low

| ID | Dim | Finding | Evidence | Recommendation | Effort | Verified |
|----|-----|---------|----------|----------------|--------|----------|
| GF-06 | Arch | Module-level `globalStateListeners` auto-copied into every instance; removal must scrub two registries. Reviewer: working, documented global-broadcast design — maintenance surface, not hazard | `state.js:95`, `EventBindings.js:42-46`, `GramFrameAPI.js:150-176` | Explicit pub/sub with per-instance filtering | M | CONFIRMED 2/3, severity High→Low |
| GF-14 | Lifecycle | Global keydown handler deliberately never removed; anonymous SVG/mode-button listeners unremovable — but destroy() detaches the container, so instances remain garbage-collectable; one document-level handler genuinely persists | `keyboardControl.js:37-56`, `events.js:82-105,115-122,270-284` | Bound refs + uninstall keydown at zero instances | S | CONFIRMED 1/3 + PLAUSIBLE, severity High→Low |
| GF-21ᴿ | Quality | *Reframed after refutation:* the Doppler preview path (`cursors.js` `drawDopplerPreview` + `DopplerMode.renderPreviewCurve`) is duplicated/dead code overlapping GF-22 — not a live preview-divergence bug | `cursors.js:69-98`, `DopplerMode.js:609-612,706-712` | Delete the dead path with the GF-22 sweep | S | REFUTED as stated — reframed to Low |
| GF-23 | Quality | `__test__*` methods always on the production API — expose only re-notify + instance refs (no sensitive data), hence polish | `GramFrameAPI.js:209-240` | Strip or gate behind a debug flag | S | CONFIRMED 1/1, severity → Low |
| GF-28ᴿ | Testing | *Reframed after refutation:* minor selector duplication in ~6–8 small specs; the "only 3 of 19 specs use the POM" quantification was wrong | `tests/` imports | POM-ify the small specs opportunistically | S | REFUTED as stated — reframed to Low |
| GF-35 | Process | Pre-push runs the full Playwright suite — workflow-ergonomics concern (bypass risk inferred, not observed) | `.husky/pre-push` | Pre-push = typecheck + unit lane once GF-25 lands | S | CONFIRMED 1/1, severity → Low |
| GF-37 | Process | `generate-version` mutates tracked `src/utils/version.js` on every test/build, dirtying the tree (observed twice during this audit) | `scripts/generate-version.js`, `package.json:8,11` | Generate to an untracked file or inject at build | S | CONFIRMED 1/1 |
| GF-44 | Docs | Completed-refactor planning doc presented as current (describes 2,100-line main.js; actual 562) | `docs/refactoring/main-js-dependency-analysis.md:5,8` | Add a "historical — completed" banner | S | CONFIRMED 1/1 |

## 4. Strengths (verified in passing, no action needed)

Credit where due: `rendering/symbols.js` (pure, documented, single source of truth), `utils/harmonicSampling.js` (+ its genuinely good boundary tests), `core/storage.js` schema-versioning/TTL design, `FeatureRenderer` as a clean rendering seam, per-listener error isolation in `notifyStateListeners`, the fail-loud config-table error indicator, `ExpandToggle`'s two-pass scrollbar-aware layout, the release/PR-preview pipelines, `Tech-Architecture.md` and `Data-and-State-Guide.md` as accurate canonical docs, and zero TODO/FIXME debt.

## 5. Refutation disclosures

The adversarial review refuted or materially narrowed four findings; per the audit's methodology they are disclosed here rather than silently dropped:

- **GF-01 (was Critical, 0/3):** the claimed keyboard-vs-mouse divergence under zoom/expand does not occur — `keyboardControl.js:104` divides the increment by zoom level, and the data→SVG→data round trip cancels the position offset, yielding exactly `baseIncrement` rendered pixels per keypress at any zoom/expand, consistent with the mouse pipeline. The 4-way duplication stands as a Medium maintainability finding (GF-01ᴿ).
- **GF-26 (correctness lens refuted):** FocusManager focus-isolation coverage exists in active specs; only the arrow-key movement assertions were lost. Narrowed accordingly (GF-26ᴺ).
- **GF-21:** the "preview diverges under zoom" mechanism is dead code, not a live bug path. Reframed to Low (GF-21ᴿ).
- **GF-28:** the POM-adoption count was wrong; actual duplication is limited to ~6–8 small specs. Reframed to Low (GF-28ᴿ).

Two additional evidence corrections from reviewers were applied in place: GF-29 (`visual-helpers.js` is transitively imported but unused) and GF-43 (README mode list is line 7, not 9).

## 6. Re-verification — 2026-07-31

All 44 findings were re-verified against HEAD `edfc549` (25 non-merge commits after the audit, spanning features 159–163: harmonic pin labels/toggles, mouse-wheel pan/zoom, in-place restyling, legacy-browser check, loading placeholder). Verification was performed by four independent agents, one per dimension, instructed to locate current evidence rather than trust audited line numbers.

**Outcome: no finding was resolved.** 41 of 44 hold as written (many with drifted line numbers — corrected below), 3 are partially valid, and several **worsened** because new feature work extended the audited patterns rather than the consolidation seams. The severity distribution (0 Critical / 1 High / 35 Medium / 8 Low) is unchanged. The original tables above are retained as the audit-date record; the table below is the current-state authority for evidence locations.

**Headline deltas since the audit:**

- **GF-27 worsened materially:** `waitForTimeout` occurrences grew 142 → **249**; the heaviest new users are `reformat-markers-harmonics.spec.js` (43), `storage.spec.js` (30), `harmonic-pin-toggle.spec.js` (19), `harmonic-pin-sampling.spec.js` (16).
- **GF-18 worsened:** a **fourth** hand-rolled drag machine was added — the middle-button wheel-pan (`instance._wheelPan`) in `events.js:115-120,208-217,264-280,300-304`.
- **GF-07 worsened:** feature-160 wheel navigation notifies (and therefore full-state-clones) on **every wheel notch** via `viewport.js:65 setZoom`, and `main.js:414-434` re-serializes annotation state inside every notification.
- **GF-30 largely resolved (best news):** new `tests/pan-zoom.spec.js` covers zoom clamping to 1–10×, pointer-centred zoom, scroll-pan edge clamping, middle-drag pan, and Pan-mode switching. Residual gap: interactions still route through `__test__` hooks and the public API surface remains untested.
- **GF-01ᴿ duplication confirmed live:** the post-audit `renderWidth`/`renderHeight` support was copy-pasted into each of the four coordinate pipelines — exactly the fragility the finding predicted.
- **GF-15 now provably pointless:** the dynamic `import()`'s "avoid circular dependencies" rationale is voided — the same module is statically imported at `keyboardControl.js:11`.

### Per-finding status (current evidence at `edfc549`)

| ID | Status | Current evidence / notes |
|----|--------|--------------------------|
| GF-01ᴿ | VALID (drifted) | `coordinates.js:21-73`; `coordinateTransformations.js:25-115,124-196`; `keyboardControl.js:304-321,333-355` (still not zoom/expand-aware); `events.js:27-80`. Feature-156/160 render-size support copy-pasted into all four |
| GF-02 | VALID (drifted) | `events.js:230-231` still writes SVG coords into `imageX/imageY` ("Simplified" comment); correct values computed at `events.js:59-60`, returned at `:79`, discarded by destructuring at `:222`; `types.js:61-62` contract unchanged |
| GF-03 | VALID (marginally worse) | madge now reports **11** cycles, 10 involving state⇄modes; `state.js:10-13,20-31`; 12 self-broadcast sites in mode files; PanMode closes its cycle via `viewport.js:12` |
| GF-04 | VALID | `ModeFactory.js:47-54` unchanged |
| GF-05 | VALID (slightly worse) | `instance.state` now **371×/21 files** (was ~347/19); ~54 constructor fields (`main.js:72-165`), grown by feature-161 style-control fields |
| GF-06 | VALID | `state.js:104`; `EventBindings.js:44-50`; `GramFrameAPI.js:181-202`; HMR re-read `main.js:614` |
| GF-07 | **WORSENED** | Clone unchanged (`state.js:121`; `events.js:252`; `AnalysisMode.js:87`; `DopplerMode.js:244`); new per-wheel-notch notify path via `viewport.js:65`; `main.js:414-434` storage listener re-serializes annotations per notification |
| GF-08 | VALID | 29 sites / 11 files (unchanged); e.g. `_switchMode` fires ≥2 notifies per gesture (`keyboardControl.js:402` + `main.js:558`) |
| GF-09 | VALID (slightly worse) | `table.js` now **716 lines** (was 703); same six responsibilities; ExpandToggle⇄table cycle is madge cycle #1 |
| GF-10 | VALID | `BaseMode.js` 20 methods; `renderCursor:77-79` no overrides (sole caller `FeatureRenderer.js:88-89` always hits base no-op); `getStateSnapshot:166-169` zero overrides & zero callers |
| GF-11 | VALID (drifted) | `MainUI.js:209-230` (casts modes to `any`, calls named methods); `FeatureRenderer.js:32-44`; `PanMode.js:193,199` |
| GF-12 | VALID (drifted) | `_clearGram` now `main.js:327-369`, hand-resets 12 nested fields |
| GF-13 | VALID (drifted) | 10-call sequence `main.js:203-212` + further order-sensitive steps `:220-234`; `DOMSetup.js:100-106` |
| GF-14 | VALID | `keyboardControl.js:38-42,49-57`; `events.js:130-159,170-177,367-369`; destroy `main.js:439-447` |
| GF-15 | VALID (drifted; rationale voided) | `keyboardControl.js:274-281`; same module statically imported at `:11` and used synchronously at `:485,583` — the cited circular-dependency justification no longer applies |
| GF-16 | VALID (drifted) | Bare catches `storage.js:137-139,168-170,184-186,258-260,317-319` (`loadAnnotations:297-300` gained a `console.warn`); ignored returns `main.js:349,431` + **new** ignoring site `PinToggle.js:54` |
| GF-17 | VALID | `BaseDragHandler.js:51-57`; mirrors `AnalysisMode.js:47-49,97-100,442-446`; `HarmonicsMode.js:72-78,105-111,1030-1038`; third mirror `DopplerMode.js:109-113,130-134` |
| GF-18 | **WORSENED** | PanMode drag `PanMode.js:17-21,57-134`; Harmonics creation machine `HarmonicsMode.js:202-210,255-261,551-599`; Doppler placement `DopplerMode.js:256-260,288-310,322-354`; **fourth machine added:** wheel-pan `events.js:115-120,208-217,264-280,300-304,323-326` |
| GF-19 | VALID | Triplicated hit-tests `DopplerMode.js:62-99` and `:158-196`; `tolerance.js:91-96,105-110,130-144` still unused (only `isWithinToleranceRadius` used, `AnalysisMode.js:527`) |
| GF-20 | VALID (grew) | `AnalysisMode.js:577-717` vs `HarmonicPanel.js:62-232`; post-audit fixed-height scroll wrapper also implemented twice (`AnalysisMode.js:373-377` vs `HarmonicPanel.js:32-36`) |
| GF-21ᴿ | VALID | `renderPreviewCurve` (`DopplerMode.js:609-612`) never called; `drawDopplerPreview` now `cursors.js:40-109`; live path is `handlePreviewDrag → renderDopplerFeatures` (`DopplerMode.js:203-218`) |
| GF-22 | VALID (grew) | Dead Doppler methods `:158-196,504-528,536-539,547-551,609-612`; `zoom.panMode` `state.js:88`/`types.js:158`; `markersPlaced` `DopplerMode.js:413,478`; ts-unused-exports now reports **17** modules (was ~15), incl. `tolerance.js` (5), `browserCompatibility.js` (5) |
| GF-23 | VALID (drifted) | `GramFrameAPI.js:235-266` |
| GF-24 | VALID (extended) | DOM-scan registry `GramFrameAPI.js:134-137,190-193,237-240` vs `_instances` `:53,95,210-212,221,253-255,264-265`; post-audit `getExpandState`/`setExpandState` (`:209-227`) built on `_instances` only, deepening the split |
| GF-25 | PARTIAL (evidence corrected) | Still no unit runner (`package.json`: Playwright only). Correction: `harmonic-sampling-unit.spec.js` runs Node-side without a `page` fixture — but still rides Playwright, whose `webServer` boots Vite for every run |
| GF-26ᴺ | VALID | Both `keyboard-focus*.spec.js.disabled` still disabled; only ArrowKey presses in active specs assert visibility (`keyboard-simple.spec.js:20-26`) or absence-of-errors (`mode-integration.spec.js:272-273`), never marker movement |
| GF-27 | **WORSENED** | `waitForTimeout` **249** (was ~142); page object now 3 sites (`gram-frame-page.js:337,481,493`); `retries: 2` unchanged (`playwright.config.ts:11`) |
| GF-28ᴿ | VALID (unchanged) | Not re-examined in depth; no POM consolidation commits landed |
| GF-29 | VALID | `CLAUDE.md:126` claim intact; zero `toHaveScreenshot`/`toMatchSnapshot` in tests/; `visualHelpers` referenced only in `fixtures.js:21-22` JSDoc |
| GF-30 | **LARGELY RESOLVED** | `tests/pan-zoom.spec.js` (new): zoom clamping `:25-52`, pointer-centred zoom `:54-63`, scroll-pan clamping `:95-105`, middle-drag pan `:108-141`, mode switching `:166-176`, click-drag pan `:188-200`. Residual: `__test__` hook routing (`gram-frame-page.js:604,621,638-639`); public API still only typeof-checked (`auto-detection.spec.js:88,96`) |
| GF-31 | VALID | No ESLint config/script/CI step in any of the 3 workflows; `.eslintcache` still in `.gitignore` |
| GF-32 | VALID | `tsconfig.json:6-11` byte-identical: `strict: true` + three strict-flag disables |
| GF-33 | VALID | `madge`/`ts-unused-exports`/`unimported` at `package.json:19,20,22`; wired to nothing |
| GF-34 | VALID | Node '18' (`test.yml:19`, `pr-preview.yml:25,109`, `release.yml:45`) vs `@types/node ^24`; test path runs `yarn build`, never `build:standalone`; chromium-only |
| GF-35 | VALID (drifted) | `.husky/pre-push` now `yarn typecheck` + `yarn test` — full suite plus typecheck |
| GF-36 | VALID | All tracked artefacts confirmed via `git ls-files`; `.obsidian/` 916K, `prompts/` 404K, `zoom-demonstrator/` 276K |
| GF-37 | VALID | `generate-version.js:21,30` writes tracked `src/utils/version.js`; `prebuild`/`pretest` hooks unchanged |
| GF-38 | VALID | Post-audit CLAUDE.md edits fixed none of it: still three modes claimed, phantom `src/rendering/axes.js`, missing modules (now also `PinToggle`, `SymbolPicker`, `browserCompatibility`, `wheelGuidance`, `secureHTML`), nonexistent `.spec.ts` files cited, phantom visual testing |
| GF-39 | VALID (drifted) | ADR-015:34-35 vs `table.js:262-311` (`applyZoomTransform` mutates image x/y/width/height; viewBox fixed at `:232`); **new** `viewport.js` `setZoom` delegates to the same image-mutating path — divergence carried into the wheel-zoom feature |
| GF-40 | VALID | ADR-011:38-51 method names vs `FeatureRenderer.js:23,51,61,71,82` — zero name overlap |
| GF-41 | VALID | `Gram-Modes.md:3` still "two interaction modes" |
| GF-42 | VALID | `Testing-Strategy.md:97,101,115,117` still prescribe Jest/80%/unit-tests-for-all |
| GF-43 | PARTIAL (one sub-item resolved) | `state-assertions.js:150` now includes `'pan'`. Still valid: `README.md:7`, ADR-008:7,58-61, ADR-014 gap, ADR-004:37-51 contradiction, display-name map `state-assertions.js:127-131` omits pan (fallback `:133` handles it) |
| GF-44 | VALID (drifted) | Doc still claims ~2100-line main.js; actual now **628** lines (grew from 562) |

**Implication for sequencing:** the worsenings are concentrated where new feature work touched audited seams (drag machines, notification fan-out, waitForTimeout, coordinate pipelines). Consolidation findings GF-01ᴿ/GF-18/GF-07/GF-27 are accruing interest fastest and are the strongest candidates to fix before further feature work lands on top of them.

---

## 7. Resolutions — Phase 2 consolidation (spec 166)

Closed by [PR #223](https://github.com/DeepBlueCLtd/GramFrame/pull/223), which
implements [specs/166-consolidation](../../specs/166-consolidation/spec.md).
Every resolution below is covered by a test that fails if the finding returns.

| ID | Status | How it was closed | Guarded by |
|----|--------|-------------------|------------|
| GF-01ᴿ | **RESOLVED** | Four coordinate pipelines collapsed into `src/utils/coordinates.js`. `coordinateTransformations.js` deleted, the private pair in `keyboardControl.js` deleted, the inline `screenToDataWithZoom` in `events.js` deleted. The canonical module reads the image element's live attributes, so the external `increment / zoomLevel` compensation went with them | `tests/unit/coordinate-equivalence.test.js` (144-cell grid against the four deleted implementations, kept as frozen references); `tests/coordinate-agreement.spec.js`; `tests/keyboard-movement.spec.js` |
| GF-07 | **RESOLVED** | The deep clone moved inside the dispatcher: one per delivery, none when no listener is registered. The storage listener no longer re-serialises annotations per notification — it compares a cheap signature plus a revision counter bumped by the paths that actually mutate an annotation | `tests/unit/notification-batching.test.js` (clone counting via a `toJSON` hook); `tests/state-listener.spec.js` AS-4.3 (20 cursor moves ⇒ 0 storage writes) |
| GF-08 | **RESOLVED** | All 44 direct `notifyStateListeners` sites now route through one `dispatch()` choke-point with microtask batching and a frame-cadence tier for pointer/wheel/drag paths. A mode switch fires once, not ≥2 | `tests/state-listener.spec.js` AS-4.1/AS-4.2; ESLint `no-restricted-imports` blocks a mode bypassing the dispatcher |
| GF-17 | **RESOLVED** | Three broadcast drag mirrors (`state.analysis.*`, `state.dragState`, `state.doppler.*`) replaced by one read-only projection, `state.drag`, written only by the owning handler | `tests/state-hygiene.spec.js` — one owner across all modes, idle projection always present |
| GF-18 | **RESOLVED** | All five drag machines ported onto `BaseDragHandler` with `move`/`create`/`place`/`pan` kinds. PanMode's hand-rolled drag, the Harmonics creation machine, the Doppler placement machine and the middle-button `_wheelPan` are gone; the middle-button pan is resolved centrally so no mode ever sees a button-1 event | `tests/pan-zoom.spec.js`, `tests/harmonics-mode.spec.js`, `tests/doppler-mode.spec.js` (all unchanged); `tests/state-hygiene.spec.js` |
| GF-20 | **RESOLVED** | One `src/components/DiffingTable.js` serves both tables. Selected-row styling — which was the same logic a *third* time, in `updateSelectionVisuals` — moved into the component and now reaches both tables from one line | `tests/analysis-mode.spec.js`, `tests/harmonics-mode.spec.js`, `tests/table-scroll.spec.js`, `tests/reformat-markers-harmonics.spec.js` (all unchanged) |
| GF-26ᴺ | **RESOLVED** | `tests/keyboard-movement.spec.js` asserts arrow-key movement in *data coordinates* — the increment each direction produces, Shift's 5× step, and the rendered-pixels-per-keypress invariant across zoom levels — for markers and harmonic sets. The two `.disabled` specs were deleted; their FocusManager coverage was already live elsewhere | the new spec itself |
| GF-27 | **RESOLVED** | `waitForTimeout` in `tests/`: **244 → 1**, the survivor carrying the inline justification FR-007 requires. `retries` is now `0` unconditionally | `yarn hygiene` ratchet (baseline 1); five consecutive full-suite runs at `--retries=0` |
| GF-28ᴿ | **RESOLVED** | Addressed by deletion rather than adoption: `interaction-helpers.js`, `mode-helpers.js` and `coordinate-helpers.js` were unreachable — only `fixtures.js` imported them and no spec destructured those fixtures. The remaining specs use `GramFramePage`, whose action methods now wait for their own effects | full suite green after removal |

### Not addressed by this phase

`GF-03` (madge cycles) is unchanged at 11 — the phase's brief was not to raise
it, and it did not. The drag engine notifies through an instance method rather
than importing `core/state.js` precisely to avoid closing a twelfth cycle.
`GF-02`, `GF-04`–`GF-06`, `GF-09`–`GF-16` and the process/documentation
findings from `GF-29` onward are outside spec 166's scope and remain open.

---

## 8. Resolutions — Phase 3 structural refactor (spec 167)

Closed by [PR #225](https://github.com/DeepBlueCLtd/GramFrame/pull/225), which
implements [specs/167-structural-refactor](../../specs/167-structural-refactor/spec.md).
Every resolution below is covered by a check that fails if the finding returns.

| ID | Status | How it was closed | Guarded by |
|----|--------|-------------------|------------|
| GF-32 | **RESOLVED** | The register's only High finding. `tsconfig.json` had `strict: true` beside `noImplicitAny: false`, `strictNullChecks: false` and `strictPropertyInitialization: false`. All three are now on with no disable left, 540 errors burned to zero, no `@ts-expect-error`/`@ts-ignore`/`any` used to get there | `yarn typecheck` itself — an unguarded `document.querySelector('.nope').classList` in any `src/` file now fails it, where before the phase it passed. Recorded stage by stage in ADR-007 |
| GF-03 | **RESOLVED** | madge cycles **11 → 0**. Ten closed through `core/state.js` importing the four mode classes; `ModeFactory.getModeInitialStates()` composes the slices and `createInitialState(modeStates)` receives them. The eleventh, `ExpandToggle ⇄ table`, went with the `table.js` split | `yarn hygiene` ratchet (`circularDependencies` baseline 0); `tests/unit/mode-registration.test.js` asserts `state.js` imports no mode |
| GF-06 | **RESOLVED** | Instances stopped copying `globalStateListeners` into their own array at construction, so a global listener no longer lived in as many arrays as there were instances and removal no longer scrubbed each one. Delivery unions the two registries, de-duplicated | `tests/state-listener.spec.js` — add-then-remove touches one registry on a multi-instance page, one delivery per notification, and a listener registered before an instance exists still reaches it |
| GF-09 | **RESOLVED** | `components/table.js` **713 → 151 lines** and scaffold-only, imported by exactly one module. Its other five responsibilities went to `rendering/axes.js`, `components/svgLayout.js`, `components/spectrogramImage.js` and `utils/coordinates.js` | full Playwright suite green **with no spec file edited** — the gate for a pure move; ADR-018 |
| GF-10 | **RESOLVED** | `BaseMode`'s two hooks with zero overrides deleted, along with the `FeatureRenderer` method whose entire body was calling one of them. `getViewport` and `updateCursorStyle` also have zero overrides but 17 and 3 callers — they are concrete helpers, and the class header now says so, so the next audit does not delete them. The reverse case also surfaced: `handleContextMenu` had two live overrides and no declaration | `tsc` under the strict flags; `tests/mode-registration.spec.js` |
| GF-11 | **RESOLVED** | `FeatureRenderer` and `MainUI` name no mode and use no `any` cast. Modes are found by duck-typed capability (`PersistentFeatureProvider`, `PanelOwner`). PanMode's `instance._zoomIn`/`_zoomOut` reach-ins replaced by the `core/viewport.js` seam; the three forwarders that then had no caller were deleted. Two named-mode sites remain, documented as exceptions in ADR-017 | `tests/mode-registration.spec.js` — a fifth mode is rendered and refreshed with no edit to either coordinator, and the three files are asserted to name no mode |
| GF-13 | **RESOLVED** | `initializeDOMProperties` deleted with its double-nulling — it set `modes`, `currentMode` and `featureRenderer` to `null` three lines before `initializeModeInfrastructure` re-created them. Each step now declares what it needs and returns what it built | Verified by experiment: swapping two constructor steps produces four `TS2448` at check time and a TDZ `ReferenceError` at runtime, where before it produced `undefined` fields surfacing several steps later |
| GF-30 (residual) | **RESOLVED** | The public API's coverage was `expect(typeof …).toBe('function')` for two methods and nothing at all for the rest. `tests/public-api.spec.js` asserts every documented method behaviourally, against a fixture that does **not** set `window.GRAMFRAME_DEBUG` | the spec itself, which also fails if the `__test__` hooks leak onto a published page |
| GF-38 (partial) | **RESOLVED** | `src/rendering/axes.js` exists, so CLAUDE.md's long-standing claim about it is true. CLAUDE.md's file listing updated for the four new modules | the file exists; CLAUDE.md's listing is checked against `src/` by review |
| GF-40 | **RESOLVED** | ADR-011 documents a `FeatureRenderer` interface whose method names have zero overlap with the real ones. ADR-017 records the correction and the surface as implemented | ADR-017 |
| GF-43 | **RESOLVED** | The ADR numbering gap at 014 is filled by ADR-014 (mode state registration seam), and the index says so | `docs/ADRs/README.md` |

### Not addressed by this phase

**GF-05 (instance surface) is partially closed and remains open.** The
`instance.state` reach-in count is 243 → 222 and class fields 56 → 54 — some of
that from `FeatureRenderer`'s eight reach-ins moving onto the modes that own the
state, some from six fields found to be write-only. The grouping into
`ui`/`interaction`/`viewport`/`persistence` sub-objects (spec 167 T034–T035) is
not done, so SC-005's targets (≤ 185 reach-ins, ≤ 33 fields) are not met. Both
counts are ratcheted in `hygiene-baseline.json` and can only fall.

`GF-02`, `GF-04`, `GF-12`, `GF-14`–`GF-16` and the remaining process and
documentation findings are outside spec 167's scope and remain open.

