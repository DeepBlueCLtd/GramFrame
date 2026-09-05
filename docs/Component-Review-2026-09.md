# Component Review — September 2026

**Reviewed at**: commit `9ecbfdc` (v0.1.18, the current release)
**Scope**: fitness for release and handover, maintainability, the test and quality-gate story, and domain/UX correctness — all of `src/`, the shipped standalone bundle, tests, CI and documentation
**Method**: this is the fourth review of the component and the first that is empirical rather than read. Every gate was run (Playwright twice, to test the determinism claim); the standalone bundle was built and driven over `file://` in Chromium with no debug hooks, through every mode, a storage round-trip, six kinds of storage corruption, a full quota, and eight malformed config tables; 19 single-line source mutations were applied to the load-bearing maths, coordinates, coalescing, sanitisation and mode contracts to see whether the 484 tests notice; the harmonic, sideband and Doppler numbers were computed by hand and read off the live UI; and every finding the July and August reviews left open was re-checked at this commit.
**Deployment anchor**: the component ships as one unminified IIFE opened over `file://` on locked-down, possibly old, machines. Severity is set for that world — silent failure and data loss rank first, browser floor and `file://` behaviour second; accessibility, performance and third-party embedding are recorded but rated Low, because none is a stated requirement of this deployment.

**Relationship to the earlier reviews.** [Findings-Register.md](analysis/Findings-Register.md) (July) stays the historical audit record and is cited by `GF-` id. This document *supersedes* [Architecture-Review-2026-08.md](Architecture-Review-2026-08.md) and [Bug-Hunt-2026-08.md](Bug-Hunt-2026-08.md) as the current-state authority: §10 adjudicates every `H`/`M`/`L` and `BH-` finding at this commit, and a still-open one is carried here under its original id rather than re-found. Neither earlier document is edited.

Severity here: **Critical** — the analyst loses work or is shown wrong numbers with no indication. **High** — the component silently fails or half-loads on a target machine, or an interaction cannot be recovered without a reload. **Medium** — wrong-but-visible behaviour, a maintainability hazard that will produce a Critical/High later, or a gate that does not gate what it claims. **Low** — polish and drift. **Flagged** — out of this deployment's stated scope; rated Low with the reason inline. Effort: S ≤ half a day, M ≤ 3 days, L longer.

---

## 1. Executive summary

**GramFrame v0.1.18 is fit to hand over, with one caveat that must be fixed first.** Everything the component is *for* — coordinates, harmonic and sideband geometry, Doppler speed, persistence, zoom and pan, the five modes — works over `file://` exactly as the specifications say, and 15 of 18 effective deliberate breakages were caught by the test suite. The August fix pass held: 26 of the 33 bug-hunt findings and all four August highs are verified fixed at this commit, several of them re-proven here by driving the real bundle.

The caveat is a single class of defect: **silent failure**. A trainer whose saved annotations cannot be restored — a corrupt record, one the sanitiser rejects, one fingerprinted for a different gram — sees an empty gram and a console message nobody will read (R9-01). A config table with no `<img>`, or an `<img>` with no `src`, builds a fully working-looking component that says "Loading spectrogram" forever (R9-02). An empty value cell, or a decimal comma, produces a plausible gram with the wrong axes (R9-03). Each is a small fix; the storage one is one line, because the warning banner it needs already exists and the *save* path already uses it.

Beyond that, the findings cluster in four places:

1. **Two numbers disagree with their documentation** — the Doppler speed of sound is 1481 m/s in the code and 1500 m/s in `Doppler-Calc.md` and the function's own JSDoc; the UI shows knots where the document says m/s (R9-04). A domain decision, not a bug, but it must be made.
2. **The release gate is weaker than the PR gate** — `release.yml` skips lint and hygiene, and the bundle's syntax floor is not pinned to the browser floor the compatibility guard advertises (R9-05, R9-06). Both are safe today by luck, not by construction.
3. **The August Tier 3 backlog is intact** — the duplicated mutation cadence, the hardcoded mode roster (which Sidebands had to be added to by hand, exactly as predicted), the untypechecked tests, the time-axis ticks, the modal ids. Sixteen items, none tracked as an issue until now (§10).
4. **Three test gaps the mutation probe exposed, and one test-infrastructure trap** — every harmonic pin can be drawn one spacing too high, the drag spacing floor can be removed, and the time axis can change its tick count, with all 484 tests green (R9-25); and two `state-listener` specs fail against any dev server that has processed a hot update, so `yarn test` beside an open `yarn dev` reports phantom failures (R9-27).

**Counts**: 1 Critical, 2 High, 13 Medium, 9 Low, 2 Flagged. Every actionable finding has a GitHub issue (§12).

---

## 2. Verified invariants

The positive result. Each claim was checked against the live standalone bundle over `file://` or by mutation, not by reading.

| Claim | Verdict | Evidence |
|---|---|---|
| The standalone bundle parses on the declared browser floor | **Holds (unpinned)** | `MIN_BROWSER_VERSION` derives to 86 (`browserCompatibility.js:44-67`). `dist/gramframe.bundle.js` contains no `??=`/`\|\|=`/`&&=`, no `static {}`, no `.at(`, no `structuredClone`, no top-level `await`; `??` appears (Chrome 80). But nothing pins it — see R9-06 |
| Coordinate transform | **Holds** | 902×237 render of 0–10 s / 0–50 Hz: centre reads 24.99 Hz / 00:05, corners 0.10 Hz / 00:09 and 49.84 Hz / 00:00; three markers placed at 20/50/80 % read 10.03 / 24.99 / 39.90 Hz |
| Harmonic seed spacing (`Updated-Harmonics.md` §4.1: 5th harmonic at origin 0, 10th above) | **Holds** | Click at 25 Hz on 0–50 → spacing 5.00, 10 pins labelled 1–10, ratio 5.000. Click at 300 Hz on 200–400 → spacing 30.00, 7 pins labelled 7–13 (210…390 Hz), ratio 10.000 — exactly the hand computation |
| Sideband geometry (`SidebandMode.js:8`: member *n* at `fundamental + n·spacing`, *n* signed) | **Holds** | Fundamental 24.99, seed spacing 6.25 (= 50/8): 8 pins indexed −3…+4, index 0 on the fundamental |
| Doppler speed (`v = (c/f₀)·(f⁺−f⁻)/2`, shown in knots) | **Holds, with c = 1481** | f⁺ 29.96 / f⁻ 19.97 / f₀ 24.97 → LED 576.1 kts; hand value 575.8 kts at c = 1481 (583.2 at c = 1500). See R9-04 |
| Storage round-trip (trainer, localStorage) | **Holds** | Marker, harmonic set, sideband set and Doppler curve survive `reload()` field-for-field; the restored curve shows its speed immediately (BH-15 fixed) |
| Storage identity gates | **Hold** | A record fingerprinted `other.png` is refused; schema version 99 is ignored and **not** deleted (BH-21 fixed); a `spacing: 0` set is dropped and the rest restored (BH-1/BH-16 fixed); a legacy record with no `gram` field restores |
| Save failure is visible | **Holds** | With localStorage filled to 5,242,656 bytes, placing a marker raises the banner "Annotations could not be saved — they will be lost when this page is reloaded." |
| Zoom clamps and survives | **Holds** | Six `+` presses reach 10× (image 902 → 9020 px) and the button disables; six `−` return to 902; markers keep 10.03 / 1.75 / 39.90 Hz through zoom, middle-drag pan and back |
| Expand toggle is geometry-neutral | **Holds** | Image 902 → 1269 px and back; marker values unchanged |
| Drag released off-image ends cleanly (H2) | **Holds** | A marker dragged into the left axis margin ends at the last on-image position (1.75 Hz) and does not follow the pointer on re-entry |
| Button discipline (BH-4, -7, -10, -11, -12) | **Holds** | Left click during a middle-button pan mints nothing; right-click mid-drag deletes nothing; a middle release does not end a left drag; right-click in zoomed Pan does not glue the view; a context menu mid-harmonic-drag leaves the set where it was |
| Keyboard scoping (BH-3) | **Mostly holds** | Arrows in a host-page `<input>` edit the input, not the selected marker; a click outside every gram releases focus. Residual: R9-09 |
| Escape cancels a drag | **Holds** | The marker stays at its last position, as the contract says |
| Hover does not rebuild the overlay (H3) | **Holds for hover** | 200 pointer moves across a 500-pin set: SVG node count 657 before and after, no stall. The pan/zoom and drag paths still rebuild — R9-24 |
| Deterministic Playwright | **Holds** | Two consecutive full runs: 335/335 and 335/335, identical test lists, 199 s and 186 s, `retries: 0` |
| `__test__*` hooks absent on a published page | **Holds** | None of the nine harness pages set `GRAMFRAME_DEBUG`; every check above was made through the DOM alone |
| 15 of 18 effective mutations caught | **Holds, with three gaps** | §5 |

---

## 3. Gate results

All from a clean tree at `9ecbfdc`. `yarn build` and `yarn build:standalone` leave the tree clean (the version is a Vite define, spec 165).

| Gate | Result | Time | Note |
|---|---|---|---|
| `yarn hygiene` | ✅ | 4.7 s | all five ratchets exactly at baseline (0 / 5 / 1 / 160 / 11) — nothing below baseline either, so no ratchet has moved since spec 167 |
| `yarn lint` | ✅ | 2.5 s | `--max-warnings 0` (H4 fixed) |
| `yarn typecheck` | ✅ | 5.4 s | `src/` only — M9 still open, R9-10 |
| `yarn test:unit` | ✅ 149/149 | 4.3 s | 13 files |
| `yarn build` | ✅ | 1.9 s | |
| `yarn build:standalone` | ✅ | 1.4 s | 346,985 bytes; version string present |
| `yarn test` (run 1) | ✅ 335/335 | 199 s | slowest test 3.8 s |
| `yarn test` (run 2) | ✅ 335/335 | 186 s | identical pass list |
| WebKit smoke | ⚠ not run | — | WebKit is not installed in this container; the lane runs in CI |
| `tsc --strict` over `tests/helpers` + `tests/unit` (out of band) | 80 errors | — | the size of the untypechecked surface: 19× TS7005, 11× TS7006, 6× TS2339, 6× TS18047/18048 … |

Observed, not run: `release.yml` runs typecheck and Playwright but **not** `yarn lint` or `yarn hygiene` (R9-05); `pr-preview.yml` builds only; `.husky/pre-push` runs typecheck + lint + unit, deliberately not Playwright; there is no coverage measurement in any lane (R9-11); `eslint.config.js` has no `complexity`, `max-lines`, `max-lines-per-function` or `max-depth` rule (R9-16); the `no-restricted-imports` guard that keeps modes on `dispatch()` lists only `../../core/state.js` and `../core/state.js` (`eslint.config.js:86,90`), so a mode one directory deeper escapes it.

---

## 4. The shipped bundle over `file://`

Nine harness pages beside a copy of `dist/gramframe.bundle.js` and `sample/mock-gram*.png`, opened as `file:///…/NN.html` in headless Chromium with default flags and **no** `GRAMFRAME_DEBUG`.

| Page | What the analyst sees | Console | Verdict |
|---|---|---|---|
| valid table (0–10 s, 0–50 Hz) | working component, v0.1.18, five modes | clean | ✅ |
| two tables on one page | two independent instances, separate storage keys (`::1` suffix) | clean | ✅ |
| trainer page (`#gf-persistent`) | Clear-gram button present; localStorage | clean | ✅ |
| 2000×525 image, 200–400 Hz | scaled to 1200×315, axis 200…400 Hz, 00:00…01:00 | one `console.log` | ✅ |
| image `src` that 404s | **"Spectrogram image could not be loaded"** in red | `console.error` | ✅ visible |
| `time-start 10`, `time-end 0` | table restored, red error indicator "Invalid time range: start (10) must be less than end (0)" | `console.error` | ✅ visible |
| `freq-end` row missing | error indicator "Missing required frequency configuration…" | `console.error` | ✅ visible |
| `freq-end` = `abc` | same indicator, plus a warning naming row 5 | `console.warn`+`error` | ✅ visible |
| **no `<img>` in the first row** | a complete, working-looking component whose image area says **"Loading spectrogram" forever**; no axes; LEDs hold 0 | one `console.error` | ❌ **silent** — R9-02 |
| **`<img>` with no `src`** | identical to the above | one `console.error` | ❌ **silent** — R9-02 |
| **`time-start` cell empty** | a normal-looking 0–10 s gram | clean | ❌ **silently wrong** — R9-03 |
| **`time-end` = `1,5`** | a normal-looking 0–1 s gram | clean | ❌ **silently wrong** — R9-03 |

Storage corruption on the trainer page (each variant written into the real key, then `reload()`):

| Stored record | Restored | User told | Verdict |
|---|---|---|---|
| valid | everything | — | ✅ |
| `not json{` | nothing | **no** — `console.warn` only | ❌ R9-01 |
| harmonic `spacing: 0` | all but that set | **no** — "Discarded 1 invalid stored annotation entry" on the console | ❌ R9-01 |
| marker `freq: "NaN"` | all but that marker | **no** | ❌ R9-01 |
| `gram.image: "other.png"` | nothing | **no** — "Ignoring stored annotations — they belong to a different spectrogram" on the console | ❌ R9-01 |
| `version: 99` | nothing (record kept) | **no** | ❌ R9-01 |
| legacy record with no `gram` | everything | — | ✅ |
| **save** with quota full | — | **yes** — banner | ✅ (the asymmetry) |

Other observations from the same pages: the mode button reads **"Cross Cursor"** while CLAUDE.md, README and the release notes call the mode Analysis (R9-20); every `file://` document gets its own storage in Chromium (a copy of the trainer page in a sibling directory saw an empty `localStorage`), so cross-page key collisions are a same-directory concern only; hovering into the axis margins holds the last readout rather than showing NaN.

---

## 5. Test-suite mutation probe

Nineteen single-line mutations, each applied to a clean tree, run against the spec subset that *should* pin the behaviour (Vitest and/or Playwright against the running dev server), then restored with `git checkout --` and a clean-tree assertion. Tree clean at the end.

| # | File | Mutation | Should break | Subset result | Full-suite result |
|---|---|---|---|---|---|
| 1 | `utils/doppler.js:39` | drop `/ 2` | speed doubles | **caught** — `doppler.test.js` ×3, `doppler-mode.spec.js` ×2 | — |
| 2 | `utils/doppler.js:44` | drop `Math.abs` | negative speed | **caught** — `doppler.test.js` | — |
| 3 | `utils/doppler.js:34` | `1481` → `1500` | all speeds +1.3 % | **caught** — `doppler.test.js` "the default c gives c/100", `doppler-mode.spec.js` ×2 | — |
| 4 | `utils/harmonicSampling.js:27` | `MAX_VISIBLE_PINS` 25 → 250 | sampling never engages | **caught** — unit ×1, `harmonic-pin-sampling.spec.js` ×4 | — |
| 5 | `utils/harmonicSampling.js:66` | `chooseSamplingStep` → constant | degenerate step | **caught** | — |
| 6 | `utils/tolerance.js:45` | `pixelRadius` 8 → 1 | ungrabbable features | **caught** — `tolerance.test.js`, hotspot specs | — |
| 7 | `utils/coordinates.js:219` | time mapping inverted | every time readout flips | **caught** — `coordinate-equivalence.test.js`, `coordinate-agreement.spec.js` | — |
| 8 | `utils/coordinates.js:191` | `svgToImage` ignores `viewport.zoom` | wrong coordinates when zoomed | missed | *equivalent mutation*: `getImageBounds` reads the resized `<image>` element (ADR-016), so the change has no effect — excluded |
| 9 | `core/state.js` | delete frame→microtask promotion | mode switch mid-drag delayed | **caught** — `notification-batching.test.js` | — |
| 10 | `core/state.js` | deliver synchronously, no coalescing | one clone per event | **caught** — `notification-batching.test.js` (clone counting), `state-listener.spec.js` | — |
| 11 | `core/storage.js:310` | sanitiser `spacing > 0` → `>= 0` | zero-spacing set restores | **caught** — `storage-validation.test.js` | — |
| 12 | `core/storage.js:48` | `STUDENT_TTL_MS` ×10 | expiry loosened | **caught** — unit + `storage.spec.js` | — |
| 13 | `core/storage.js:380` | fingerprint ignores the image name | cross-image restore | missed by `storage.spec.js` | **caught** — `storage-validation.test.js` "uses the image URL basename and the four config ranges" |
| 14 | `harmonics/HarmonicsMode.js:153` | drop the `MIN_PIN_SPACING` clamp on drag | zero/negative spacing reachable | missed | **missed** — 484/484 green (R9-25) |
| 15 | `harmonics/HarmonicsMode.js:62` | `index·spacing` → `(index+1)·spacing` | every pin one spacing high | missed | **missed** — 484/484 green (R9-25) |
| 16 | `sideband/SidebandMode.js:124` | fundamental → 0 | sidebands collapse onto harmonics | **caught** — `sideband-mode.spec.js` | — |
| 17 | `rendering/axes.js:115` | time `tickCount` 5 → 3 | axis relabels | missed | **missed** — 484/484 green (R9-25, tracked under R9-07) |
| 18 | `main.js:426` | never restore | nothing restored | **caught** — `storage.spec.js` ×14 | — |
| 19 | `utils/markerLabel.js` | `normalizeMarkerLabel` returns its input | no trimming/length cap | **caught** — `marker-label.test.js` ×7 | — |

Every full-suite run made against the live dev server after a source edit also failed the same two `state-listener.spec.js` tests, whatever the mutation. Reproduced on a clean tree: a fresh server passes 12/12; after a single no-op edit under HMR the same two fail until the server restarts. That is a finding about the test infrastructure, not about any mutation (R9-27), and those two failures are excluded from the "caught" column above.

**15 of 18 effective mutations caught.** The three misses share a shape: nothing reads a rendered harmonic pin's position back as a frequency, nothing drags a set below its floor, and nothing asserts a time-axis label. Everything the July and August reviews said was load-bearing — coordinates, tolerance, sanitisation, expiry, fingerprinting, the coalescing tiers, the Doppler formula and even its constant — is genuinely pinned, most of it in the unit lane where a mutation costs two seconds to detect. Mutation 13 is the cautionary one: the e2e spec that names BH-6/BH-23 does not exercise the image half of the fingerprint; the unit lane does.

---

## 6. Critical

### R9-01 — Annotation *load* failures are silent while *save* failures warn
`src/core/storage.js:552-565` — every refusal on the load path (`fingerprintMatches` mismatch, `sanitizeStoredAnnotations` drops, a `JSON.parse` failure, an unrecognised schema version) ends in `console.warn` and `return null`, and `src/main.js:426` is `if (!saved) return`. The save path, ten lines further down (`main.js:548-554`), calls `showStorageWarning` with a clear sentence. Six corruption variants above: the analyst is told nothing in every case.

**Failure**: a trainer's record is damaged (a hand edit, a partial write, an older build's schema) or the lesson is republished with a new image at the same path. They open the page, see an empty gram, and conclude their work is gone — or, worse for a refused-fingerprint record, they re-annotate and the next save overwrites the old record for good. `GF-16` found the save side of this in July; the fix that landed covered save and clear but not load.

**Fix** (S): return a reason from `loadAnnotations` (or a second return value) and route "refused"/"partially restored"/"unreadable" through the existing `showStorageWarning` with wording that says what happened and that the stored record was left alone. One Playwright test per refusal class in `tests/storage.spec.js`.

---

## 7. High

### R9-02 — A table with no `<img>`, or an `<img>` without `src`, builds a working-looking component that loads forever
`src/core/configuration.js:19-34` catches the "no image element" and "no src" errors, logs them, and **continues**; construction completes with `imageDetails.url = ''`, `loadSpectrogramImage` is never given a URL, and the CSS loading caption (`gramframe.css:172-186`) stays up permanently. Contrast the two neighbours: a bad range at `:78-96` throws and the API renders the red error indicator with the message; a URL that 404s reaches `spectrogramImage.js:78-84` and renders "Spectrogram image could not be loaded". The two silent cases are the two an author is most likely to produce while assembling a lesson (wrong row order, a template `<img>` left empty).

**Fix** (S): let the two image errors throw like the range errors do — the `try` block exists only to swallow them. One Playwright test with a fixture lacking the `<img>`, asserting `.gramframe-error-indicator`.

### R9-03 — An empty value cell validates as 0; a decimal comma is truncated (BH-20, still open)
`src/core/configuration.js:53` — `cells[1].textContent?.trim() || '0'`: an empty `time-start` cell yields `0`, passes the range check, and draws a normal-looking 0–10 s axis. `:55` `parseFloat("1,5")` is `1`, so a European-locale `time-end` of `1,5` draws a 0–1 s axis. Both verified on the bundle; neither logs anything. Every marker and every harmonic ratio the analyst then reads is wrong by a factor they cannot see.

**Fix** (S): drop the `|| '0'`; reject any value `parseFloat` does not consume in full (`Number(text)` and `Number.isFinite`), and let the existing "must be present with valid numeric values" error carry it. Two Playwright fixtures.

---

## 8. Medium

### R9-04 — Speed of sound: 1481 in code, 1500 in the specification and the JSDoc; knots on screen, m/s in the document
`src/utils/doppler.js:30` (`@param … (default: 1500 m/s)`) and `:34` (`speedOfSound = 1481`) disagree with each other; `docs/Doppler-Calc.md:61` says 1500 and `:43` says the speed is displayed in m/s, while `DopplerMode.js:481-483` multiplies by `MS_TO_KNOTS` and the LED is labelled "(kts)". Nothing in `src/` passes `speedOfSound`, so 1481 is what every analyst sees (LED 576.1 kts against 583.2 at 1500 — 1.3 %). 1481 is fresh water at 20 °C; 1500 is the nominal seawater value sonar training normally uses. `tests/unit/doppler.test.js` pins the default, so whichever value is chosen changes one constant and one test. A domain decision for the customer; the review's only position is that the three documents must agree.

### R9-05 — The release gate is weaker than the PR gate
`.github/workflows/release.yml` runs `yarn typecheck`, `build:standalone` and `yarn test`, but not `yarn lint` or `yarn hygiene`; `test.yml` runs all five. A release cut from a branch that never went through a PR (the `release/vX.Y.Z` branches do go through one today, so this is latent) can ship a lint or ratchet regression. Fix (S): the same five-step `checks` job, or `needs:` the existing one.

### R9-06 — The bundle's syntax floor is not pinned to the browser floor the guard advertises
`vite.config.js` sets no `build.target` in either branch, so esbuild's default (`modules`, ≈ Chrome 87) decides what syntax reaches `dist/`. `browserCompatibility.js` promises Chrome/Edge 86 and is written in ES5 so it can *run* on older engines — but it lives inside the same IIFE, and a single `??=` anywhere in the bundle is a parse error that stops the whole script before the guard executes: a blank page with no message on exactly the machine the guard exists for. Verified safe at this commit (no ≥ 87 syntax in the bundle), by luck. Fix (S): `build.target: 'chrome86'` (or derive it from `MIN_BROWSER_VERSION`), and a CI assertion that greps the built bundle.

### R9-07 — Time axis: hard-coded five ticks, truncated labels, duplicates under zoom (L12, BH-27, BH-28, still open)
`src/rendering/axes.js:115` `const tickCount = 5` while the frequency axis uses the nice-number engine at `:152`. On the standard 0–10 s gram the labels are `00:00 00:02 00:05 00:07 00:10` (2.5 s ticks truncated by `formatTime`'s `Math.floor`); at 10× zoom the same axis reads `00:04 00:04 00:05 00:05 00:05`; `formatTime(-30)` is `-1:-30`; and `Math.round(frequency) + 'Hz'` (`:227`) duplicates whole-hertz labels on narrow bands. One change — the engine the frequency axis already has, plus sub-second and signed formatting — closes all four.

### R9-08 — `ManualHarmonicModal` uses page-global ids and an `innerHTML` template; neither modal closes on Escape unless the text input has focus, and neither restores focus (L13, still open)
`src/modes/harmonics/ManualHarmonicModal.js:40-55` injects `id="harmonic-spacing-input"`, `spacing-error`, `cancel-button`, `add-button` — verified in the DOM of the live bundle. `cancel-button` and `add-button` will collide with a host page's own ids, and a page with two grams has two of each. Escape is bound on the input only (`ManualHarmonicModal.js:88-93`, `MarkerLabelModal.js:106-111`): Tab to Cancel and press Escape, and the dialog stays (verified for both). After Save or Cancel, `document.activeElement` is `<body>`. Fix (S): class-scoped elements built like `MarkerLabelModal` builds them, `keydown` on the overlay, and focus returned to the opening button.

### R9-09 — With two or more grams on a page, Tab is swallowed page-wide once any gram is focused (BH-3 residual)
`src/core/keyboardControl.js:120-131` — with ≥ 2 registered instances and one focused, every Tab is `preventDefault`ed and moves the *custom* focus between grams; DOM focus stays on `<body>`. Verified on the two-gram page: after clicking one gram, four Tabs toggle `.gram-frame-focused` between the instances and never reach the host page's next `<input>`. The single-instance case was fixed in August; the multi-instance case — the one `debug-multiple.html` exists for — still hijacks the host page's keyboard navigation until the user clicks elsewhere. Fix (S): cycle only while DOM focus is inside a gram, or drop Tab-cycling in favour of the natural button tab order that already exists.

### R9-10 — `tests/` is outside the type gate (M9, still open)
`tsconfig.json:14` includes `src/**` only. Running `tsc --strict` over `tests/helpers` and `tests/unit` alone produces **80 errors** (implicit `any` in 30, possibly-null in 12, unknown members in 6). The 1,084-line page object every spec depends on is unchecked; helper drift surfaces as runtime test failures. Fix (M): add `tests/**` to `include` and burn the 80 down.

### R9-12 — The mode roster is still hand-maintained in two places (M12, still open — and it happened)
`src/components/ModeButtons.js:28` `['pan', 'analysis', 'harmonics', 'sideband', 'doppler']` and the display-name map in `src/utils/calculations.js` — both had to be edited by hand to land Sidebands (#241), exactly the "adding a mode touches `src/modes/` and `ModeFactory`" promise CLAUDE.md and ADR-017 make. `ModeFactory.getAvailableModes()` exists. Fix (S).

### R9-13 — The mutation cadence is still copy-pasted, and keyboard nudging still disagrees with dragging (M5, still open)
`markAnnotationsChanged(` has 16 call sites and no `commitAnnotationChange` helper exists. The drift the August review predicted is present: a harmonic set dragged clamps at `MIN_PIN_SPACING = 0.1` (`HarmonicsMode.js:153`) but nudged with the arrow keys clamps at **1.0** (`HarmonicsMode.js:170`, with a comment explaining the 1 Hz floor "is inherited"). Fix (M): one helper, one clamp.

### R9-16 — Module sizes have grown past their own documented exceptions, and nothing measures them
`hygiene-baseline.json:3` records the spec 167 SC-004 exceptions as PinSetMode 995, DopplerMode 685, AnalysisMode 640 and says "nothing here enforces it". At this commit they are **1036, 720 and 792**; `main.js` is 750, `keyboardControl.js` 621. Twelve modules exceed the ~350 heuristic; `eslint.config.js` has no size or complexity rule; `createDiffingTable` is one 312-line closure, `createGramFrameAPI` 310, `_switchMode` 146. The codebase's whole tooling philosophy is ratchets, and this is the one debt class without one. Fix (S): a `maxModuleLines` entry per exception in `hygiene-baseline.json`, ratcheting down like the rest — or delete the SC-004 claim.

### R9-18 — Two trainer tabs on the same page: last writer wins (BH-14, still open)
No `storage` event listener exists anywhere in `src/`; each save writes the whole record from the saving tab's state (`storage.js:417-`). Markers added in tab A are erased by the next save from tab B. Plausible on a trainer's machine; a merge design is needed before this can be fixed properly, so file it as the design question it is.

---

### R9-25 — Harmonic pin frequencies and the drag spacing floor are unasserted
Mutations 14 and 15 survived the full suite: `HarmonicsMode.freqForIndex` (`:62`) returning `(index + 1) × spacing` draws every pin one spacing too high with the labels unchanged, and removing the `MIN_PIN_SPACING` clamp from `freqUpdatesForDrag` (`:153`) reopens the BH-2 hang class — and `harmonics-mode.spec.js`, `harmonic-labels`, `harmonic-hotspot` and `harmonic-pin-sampling` all pass, because they assert counts, labels, state spacing and hit areas but never a rendered pin's frequency, and never drag below the floor. The Sidebands equivalent (mutation 16) *is* caught. Fix (S): one spec that reads each pin's x back through the page's own readout and asserts `n × spacing`, on both an origin-zero and an origin-above-zero gram; one that drags to the floor. The time-axis miss (mutation 17) is the regression test R9-07 already asks for.

### R9-27 — Two state-listener specs fail against any dev server that has processed a hot update
`playwright.config.ts:40` `reuseExistingServer: !process.env.CI`. On a fresh `yarn dev`, `tests/state-listener.spec.js` passes 12/12; after one no-op edit to any `src/` file (tree restored, server left running) the two registry tests at `:355` and `:390` fail — `preserved` and `afterAdd.global` come back 0 — and keep failing until the server restarts. A developer running `yarn test` beside an open `yarn dev` sees two failures unrelated to their change, which is exactly what `Testing-Strategy.md:20` ("a test that fails once is a bug") tells them to believe. Whether the cause is the harness (a page loaded while Vite's graph is invalidated) or the HMR handler in `main.js` re-registering on a stale module is the first thing to establish; if the latter, it is a product bug in `yarn dev` sessions. Fix (S).

---

## 9. Low

- **R9-11 — No coverage measurement in any lane** (L16). The suite's shape is asserted by narrative. `@vitest/coverage-v8` is a dev-only add; Playwright coverage is harder and can wait.
- **R9-14 — Style controls install side-channel handles** (M8): `interaction._pinControl` (`PinToggle.js:74`), `_symbolControl` / `_largeSymbolsControl` (`SymbolPicker.js:78,132`), `syncStyleControls` (`ColorPicker.js:189`), read by `keyboardControl.js`. Construction order is an invisible contract.
- **R9-15 — Cleanup**: the drag-cancel loop is duplicated verbatim (`main.js:343-350` and `:617-620`); `_switchMode` carries three comments describing removed behaviour (`:632`, `:699`, `:701`); `GramFrameAPI.js:110` builds an `errors` array that `:150` fills and nothing reads; `configuration.js:101-104` is a `catch` that only rethrows; `axes.js:35-54` declares `AxisConfig`/`AxisTick`/`AxisLabel` for an abstraction that was never built; the `no-restricted-imports` guard matches two relative depths only; `utils/calculations.js` contains no calculations (L14); `gram-frame-table` names two different elements (L11); only `SymbolPicker` dispatches on a default change (BH-30).
- **R9-17 — `HarmonicPanel.js` (143) and `SidebandPanel.js` (123) are the same component**: with mode/field names normalised, 68 of ~266 lines differ. The natural next extraction after `PinSetMode`; recorded here, not filed — it is an opportunity, not a defect.
- **R9-19 — `zoomOut()` keeps the stale centre at 1×** (BH-29): `viewport.js:31-35` vs the wheel path's reset; the next button zoom-in jumps to the old corner.
- **R9-20 — Documentation drift**: `HTML-Integration-Guide.md` documents neither `getExpandState` nor `setExpandState` though both are in the public typedef (`types.js:692-707`); the release-generated README (`release.yml:233`) lists "Pan, Analysis, Harmonics, and Doppler" — no Sidebands; `test-release.html:41-44` tells the tester to try "Cross Cursor, Harmonics, Doppler, Pan" and to click in "Cross Cursor mode", and references `./mock-gram.png`, which is not beside it in the repository (release.yml copies it in at `:124`, so the tracked file is broken when opened as-is); `Doppler-Calc.md:43` says m/s is displayed; the UI button says "Cross Cursor" while CLAUDE.md, README and the release notes say Analysis; CLAUDE.md still describes `calculations.js` as "Mathematical calculations".
- **R9-21 — `init()` never runs if the script is injected after `DOMContentLoaded`** (L5): `main.js:712` registers the listener with no `readyState` check. A lesson page that loads the bundle lazily gets nothing.
- **R9-22 — Analysis hit-testing follows the crosshair, not the drawn symbol** (M7): `AnalysisMode.js:709-745` tests the 15 px arms for every marker, so a `●` marker is grabbable along an invisible 30×30 cross (verified: a grab 10.8 px along the arm at 1×, and 12.2 px at 2.25×, both move a marker whose tolerance is 8 px). `PinSetMode` established "hit-testing follows what is drawn"; Analysis does not.
- **R9-26 — rate ≠ 1 is internally inconsistent** (BH-26, latent): `keyboardControl.js:239` re-multiplies, `axes.js:297` divides, the renderers pass stored frequency straight through. Nothing sets `rate` today; any re-enablement ships wrong numbers.

---

## 9a. Flagged — outside this deployment's stated requirements

- **R9-23 — Keyboard reachability and dialog semantics.** The arrow-key feature is real (verified: two ArrowRights move a selected marker 24.99 → 25.11 Hz) but is reachable only after a mouse click: no element in `src/` has a `tabindex`, `.gram-frame-focused` is a class rather than DOM focus, `DiffingTable` rows have no `role`/`tabindex`/`aria-selected`, and neither modal has `role="dialog"`, a focus trap or focus restore. Eight `aria-*` attributes exist in the whole tree. Rated **Low** because keyboard-only and screen-reader access is not a stated requirement for this material; re-rate to High the day it is.
- **R9-24 — Full overlay rebuild on pan, zoom and pin-set drag.** `svgLayout.js:106,135` calls `renderAxes` and `renderAllPersistentFeatures` on every wheel tick and pan move; `axes.js:67` and `FeatureRenderer.js:37` each `innerHTML = ''` and rebuild; `PinSetMode.renderPersistentFeatures` (`:948-958`) then clears the freshly emptied group again; a harmonic drag at minimum spacing rebuilds 500 `<line>`s per frame, and `MAX_PIN_LINES` allows 1000. Hover is exempt (H3 was fixed there). Measured on the bundle: a full-width drag to minimum spacing completes in 696 ms with no stall, 200 hovers leave the node count at 657. Rated **Low** because large-gram performance is not a stated concern; the pattern that fixes it (`events.js:278-281`) already exists.

---

## 10. Status of the July/August findings at `9ecbfdc`

Re-checked against the code, and where behavioural, against the live bundle (✓ = verified by driving it).

| Id | Finding | Status |
|---|---|---|
| H1 | Pin toggle not persisted | Fixed (`applyPinToSelectedFeature` marks the change; round-trip carries `showPin`) |
| H2 | Drags survive off-image mouseup | **Fixed ✓** (ends at last on-image position; Escape cancels) |
| H3 | Full rebuild on every mousemove | Fixed for hover ✓; pan/zoom/drag paths remain — R9-24 |
| H4 | Lint warnings unratcheted | Fixed (`--max-warnings 0`) |
| M1 / M2 | `destroy()` skips modes; FocusManager strands instances | Fixed (`main.js:579-588`; `FocusManager.js:29` filters on `isConnected`) |
| M3 | Two sources of truth for storage context | Fixed (`main.js:548` passes `_storageContext()`) |
| M4 | `_clearGram` bypasses the drag engine | Fixed (`main.js:343-350` cancels first) |
| M5 | Mutation cadence copy-pasted; keyboard clamp drift | **Open** — R9-13 |
| M6 | Cursor-style target inconsistent | Fixed (one `BaseMode.updateCursorStyle`) |
| M7 | Analysis hit-test ignores the drawn symbol | **Open ✓** — R9-22 |
| M8 | Side-channel style-control handles | **Open** — R9-14 |
| M9 | `tests/` untypechecked | **Open** — R9-10 |
| M10 / M11 | Stale release README format; Testing-Strategy retries claim | Fixed (2-column example; `retries: 0` documented) |
| M12 | Mode roster hardcoded | **Open, and it bit** — R9-12 |
| L1, L2, L6, L15 | Dead forwarders, stale cycle comment, double `getBoundingClientRect`, untested pure modules | Fixed |
| L3 | `keyboardControl.js` is half selection machinery | Open (621 lines) — folded into R9-16 |
| L5 | No `readyState` check | **Open** — R9-21 |
| L7 | Two error philosophies in `configuration.js` | **Open, now High** — R9-02 |
| L11, L13, L14 | Duplicate class; modal ids/innerHTML; misnamed `calculations.js` | **Open** — R9-15, R9-08, R9-20 |
| L12 | Time-axis ticks | **Open ✓** — R9-07 |
| L16 | No coverage | **Open** — R9-11 |
| BH-1, -16 | `spacing: 0` bricks the page; load validates only version | **Fixed ✓** (sanitiser drops the set, restores the rest) |
| BH-2 | 200 k lines per drag frame | Fixed (500 lines at min spacing ✓; `MAX_PIN_LINES` 1000) |
| BH-3 | Global keyboard hijack | Fixed for editable targets and single instance ✓; multi-instance Tab **open** — R9-09 |
| BH-4, -7, -10, -11, -12, -31 | Button discipline | **Fixed ✓** (all five reproductions attempted; none reproduce) |
| BH-5, -17, -18 | Save-listener hygiene | Fixed by inspection (signature seeded from restore; advanced on success; drag saves skipped) — not re-driven |
| BH-6, -23 | Positional keys; no fingerprint | **Fixed ✓** (fingerprint present and enforced) |
| BH-8 | "Infinity" knots | Fixed (`DopplerMode.js:443` finiteness guard) |
| BH-9 | Mode switch commits a cancelled placement | Fixed (`onMarkerDragCancel` discards) |
| BH-13 | Stale `cursorPosition` after pan | Fixed by inspection |
| BH-14 | Multi-tab last-writer-wins | **Open** — R9-18 |
| BH-15 | Restored curve shows 0.0 | **Fixed ✓** (576.1 kts on reload) |
| BH-19 | Clear gram leaves LEDs stale | Fixed ✓ (speed LED 0.0 after clear) |
| BH-20 | Config coercions | **Open ✓, now High** — R9-03 |
| BH-21 | Version mismatch deletes on read | **Fixed ✓** (v99 ignored, record kept) |
| BH-22 | Tolerance clamps | Fixed (unit-pinned) |
| BH-24, -25, -32, -33 | Low hygiene | Fixed |
| BH-26 | rate ≠ 1 latent | **Open** — R9-26 |
| BH-27, -28 | `formatTime` negatives; whole-Hz labels | **Open ✓** — R9-07 |
| BH-29 | Button zoom-out centre | **Open** — R9-19 |
| BH-30 | Picker default dispatch | **Open** — R9-15 |
| GF-32 | Type gate gutted | Fixed for `src/` (strict, no per-flag disables); `tests/` — R9-10 |

Sixteen items open, all now tracked (§12).

---

## 11. Recommendations

**Before handover (all S, one PR each)**
1. Surface load refusals through `showStorageWarning` (R9-01).
2. Let the two image-config errors throw (R9-02) and reject empty/partial numeric cells (R9-03).
3. Decide c = 1481 or 1500 and make the code, the JSDoc and `Doppler-Calc.md` agree; fix the m/s claim (R9-04).
4. Pin `build.target` to the guard's floor and assert it in CI; add lint + hygiene to `release.yml` (R9-05, R9-06).
5. Pin harmonic pin frequencies and the spacing floor with a spec (R9-25), and make the state-listener specs robust to a warm dev server (R9-27) — what the mutation probe found missing.

**Next round**
6. Time axis onto the nice-number engine with proper formatting and its first axis-label assertion (R9-07); modal ids, Escape and focus (R9-08); multi-instance Tab (R9-09).
7. Type-check `tests/` (R9-10); derive the mode roster (R9-12); one commit helper and one clamp (R9-13); a module-size ratchet (R9-16).
8. The docs sweep (R9-20) and the cleanup list (R9-15) — both mechanical.

**Design questions to settle, not to code yet**: multi-tab merge (R9-18); whether keyboard reachability becomes a requirement (R9-23).

---

## 12. Issue index

| Finding | Severity | Issue |
|---|---|---|
| R9-01 Storage: load failures silent | Critical | [#253](https://github.com/DeepBlueCLtd/GramFrame/issues/253) |
| R9-02 Config: no `<img>` / no `src` loads forever | High | [#254](https://github.com/DeepBlueCLtd/GramFrame/issues/254) |
| R9-03 Config: empty cell → 0, decimal comma truncated | High | [#255](https://github.com/DeepBlueCLtd/GramFrame/issues/255) |
| R9-04 Doppler: 1481 vs 1500; m/s vs kts | Medium | [#256](https://github.com/DeepBlueCLtd/GramFrame/issues/256) |
| R9-05 CI: release gate skips lint + hygiene | Medium | [#257](https://github.com/DeepBlueCLtd/GramFrame/issues/257) |
| R9-06 Build: syntax floor unpinned | Medium | [#258](https://github.com/DeepBlueCLtd/GramFrame/issues/258) |
| R9-07 Axes: time ticks and labels | Medium | [#259](https://github.com/DeepBlueCLtd/GramFrame/issues/259) |
| R9-08 Modals: global ids, Escape, focus | Medium | [#260](https://github.com/DeepBlueCLtd/GramFrame/issues/260) |
| R9-09 Keyboard: multi-instance Tab | Medium | [#261](https://github.com/DeepBlueCLtd/GramFrame/issues/261) |
| R9-10 Tests: `tests/` untypechecked | Medium | [#262](https://github.com/DeepBlueCLtd/GramFrame/issues/262) |
| R9-11 Tests: no coverage | Low | [#266](https://github.com/DeepBlueCLtd/GramFrame/issues/266) |
| R9-12 Modes: hand-maintained roster | Medium | [#263](https://github.com/DeepBlueCLtd/GramFrame/issues/263) |
| R9-13 Harmonics: clamp drift, no commit helper | Medium | [#264](https://github.com/DeepBlueCLtd/GramFrame/issues/264) |
| R9-14 Style-control side channels | Low | [#267](https://github.com/DeepBlueCLtd/GramFrame/issues/267) |
| R9-15 Cleanup | Low | [#268](https://github.com/DeepBlueCLtd/GramFrame/issues/268) |
| R9-16 Module-size ratchet | Medium | [#265](https://github.com/DeepBlueCLtd/GramFrame/issues/265) |
| R9-17 Panel duplication | Low | not filed — opportunity, not defect |
| R9-18 Storage: multi-tab | Medium | [#269](https://github.com/DeepBlueCLtd/GramFrame/issues/269) |
| R9-19 Zoom-out centre | Low | [#270](https://github.com/DeepBlueCLtd/GramFrame/issues/270) |
| R9-20 Docs drift | Low | [#271](https://github.com/DeepBlueCLtd/GramFrame/issues/271) |
| R9-21 `init()` after `DOMContentLoaded` | Low | [#272](https://github.com/DeepBlueCLtd/GramFrame/issues/272) |
| R9-22 Analysis hit-test | Low | [#273](https://github.com/DeepBlueCLtd/GramFrame/issues/273) |
| R9-23 Keyboard reachability / ARIA | Flagged | [#274](https://github.com/DeepBlueCLtd/GramFrame/issues/274) |
| R9-24 Overlay rebuild on pan/zoom/drag | Flagged | [#275](https://github.com/DeepBlueCLtd/GramFrame/issues/275) |
| R9-25 Harmonic pin frequency / spacing floor unasserted | Medium | [#277](https://github.com/DeepBlueCLtd/GramFrame/issues/277) |
| R9-26 rate ≠ 1 latent | Low | [#276](https://github.com/DeepBlueCLtd/GramFrame/issues/276) |
| R9-27 HMR-warm dev server fails two specs | Medium | [#278](https://github.com/DeepBlueCLtd/GramFrame/issues/278) |

All carry the `review-2026-09` label; filter on it for the full set. The umbrella issue [#89](https://github.com/DeepBlueCLtd/GramFrame/issues/89) (security audit / production readiness) links here.

---

*Artefacts: gate logs, the twelve harness pages and their screenshots, the interaction driver, the mutation runner and its per-mutation logs were kept out of the repository. All file:line references are against `9ecbfdc`.*
