# Bug Hunt — August 2026

**Companion to** [Architecture-Review-2026-08.md](Architecture-Review-2026-08.md). That review sliced the codebase by subsystem; every bug it confirmed lived in a *seam* between subsystems, so this hunt deliberately used four cross-cutting lenses instead:

1. **Adversarial event sequences** — unusual orderings/interleavings of user events
2. **Annotation data lifecycle** — following the data itself through save/load/expiry/multi-instance transitions
3. **Numeric and configuration boundaries** — degenerate ranges, division hazards, NaN propagation, rate handling
4. **Sibling asymmetry** — diffing every parallel function family for the missing step (the technique that found the pin-persistence bug)

All findings verified against commit `91656a5` (code unchanged by the docs/tests commits since). CONFIRMED = the code path provably reaches the bad state (several were additionally proven by running the pure modules in Node); PLAUSIBLE = traced but needs runtime confirmation. The four headline findings below were independently re-verified by hand before publication. Findings already in the architecture review are not repeated.

---

## Summary

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| BH-1 | Stored `spacing: 0` hard-hangs the page at every load | High | Confirmed |
| BH-2 | Unbounded pin rendering: 200,000 SVG lines per drag frame | High | Confirmed |
| BH-3 | Global keyboard handler hijacks arrows/Tab page-wide, including the Manual Harmonic modal's own input | High | Confirmed |
| BH-4 | Left-click during middle-button pan silently mints a marker | High | Confirmed |
| BH-5 | Student 24h expiry never fires for a regularly viewed gram | High | Confirmed |
| BH-6 | Positional storage keys migrate annotations onto the wrong spectrogram | High | Confirmed |
| BH-7 | Right-click in zoomed Pan mode → view glued to cursor | High | Confirmed¹ |
| BH-8 | Doppler speed LED can display "Infinity" | Medium | Confirmed |
| BH-9 | Mode switch mid-doppler-placement *commits* the "cancelled" gesture | Medium | Confirmed |
| BH-10 | Right-click during a marker drag always deletes the dragged marker | Medium | Confirmed |
| BH-11 | Context menu mid-harmonics-drag → set glued to cursor | Medium | Confirmed |
| BH-12 | Mouseup never checks which button — cross-button releases end the wrong drag | Medium | Confirmed |
| BH-13 | Stale `cursorPosition` after pan makes a click mint a duplicate harmonic set | Medium | Confirmed |
| BH-14 | Two trainer tabs: whole-record last-writer-wins destroys work | Medium | Confirmed |
| BH-15 | Restored doppler curve shows speed 0.0 until nudged | Medium | Confirmed |
| BH-16 | Load validates only `version`; corrupt records half-apply silently and are re-persisted as canonical | Medium | Confirmed² |
| BH-17 | Failed save is never retried (signature advances before the write) | Medium | Confirmed |
| BH-18 | Drag saves at frame cadence: stringify + setItem + DOM scan at ~60Hz | Medium | Confirmed |
| BH-19 | "Clear gram" leaves the doppler speed LED and style controls stale | Medium | Confirmed |
| BH-20 | Silent config coercions: blank cell → 0, `"1,5"` → 1 | Medium | Confirmed |
| BH-21 | Version-mismatch deletes forward data on read; re-save strips additive fields | Medium | Confirmed |
| BH-22 | Hit-test tolerance floors/ceilings ignore the axis span | Medium | Plausible |
| BH-23 | No image/config fingerprint: republished content inherits stale annotations | Medium | Plausible |
| BH-24–33 | Ten low/latent findings | Low | Mixed |

¹ On platforms firing contextmenu on mousedown. ² Traced, not executed in-browser.

---

## High severity

### BH-1 — Stored `spacing: 0` hard-hangs the page at every load
`storage.js:294-326` validates only the schema `version`; `main.js:434-442` spreads records into state with zero numeric validation. A harmonic set with `spacing: 0` (and `freq-start > 0`) gives `minHarmonic = maxHarmonic = Infinity`; the guard at `HarmonicsMode.js:1011` (`maxHarmonic < minHarmonic`) is false, and the pin loop at `:1021` runs `h = Infinity; h <= Infinity; h++` **forever** (`Infinity + 1 === Infinity`). Restore happens during init, so a trainer's localStorage record bricks the page on *every* reload with no UI escape. Reachable via BH-16 (any corrupt/hand-edited record) — and note the drag path clamps spacing to 0.1, but nothing validates what comes *out* of storage. Fix: validate restored records field-by-field (finite, in-range, id present); discard and warn on failure.

### BH-2 — Unbounded pin rendering: 200,000 SVG lines per drag frame
`renderHarmonicSet` draws a line for **every** harmonic in the visible span with no cap (`HarmonicsMode.js:1020-1026`); only labels are thinned (cap 25). Spacing clamps at 0.1 Hz, so on the standard 0–20 kHz config, dragging a set toward the low-frequency edge yields `floor(20000/0.1)` = 200,000 lines — rebuilt on **every drag mousemove** (via `renderAllPersistentFeatures`). `findHarmonicSetAtFrequency` (`:518`) iterates the same 200k per hover, using the full config range (`:496-500`) rather than the visible range. Browser lockup from an ordinary user gesture. Fix: cap rendered pins (or derive the minimum spacing clamp from the config range), and hit-test against the visible range.

### BH-3 — Global keyboard handler hijacks arrows and Tab page-wide
`handleGlobalKeyboardEvent` (`keyboardControl.js:71-122`) never inspects `event.target`. Consequences, both confirmed:
- **Arrows**: with any feature selected and the instance focused, ArrowUp/Down/Left/Right anywhere on the page is `preventDefault`ed and moves the feature — *including inside the Manual Harmonic modal's own spacing input* (`ManualHarmonicModal.js:46`), which is opened from exactly that state (`addHarmonicSet` auto-selects). Typing arrows in the modal mutates the selected set behind it, and the mutation persists.
- **Tab**: with any instance focused, every Tab is swallowed (`:76-86`) — even with one instance, where `focusNextInstance` no-ops but `preventDefault` still runs. Focus is set on every SVG mousedown and **never cleared** (FocusManager has no blur/outside-click path), so one click on a gram permanently disables keyboard navigation of the whole host page. Escape is bound only on the modal's input, so once focus leaves the input the modal cannot be closed by keyboard either.

Fix: bail out when `event.target` is an editable element (input/textarea/contenteditable) or outside the instance; add a blur/outside-click path that clears focus; only `preventDefault` Tab when actually cycling between ≥2 instances.

### BH-4 — Left-click during middle-button pan silently mints a marker
`events.js:288-309` intercepts only `button === 1`; a left mousedown during an active wheel-pan is delegated to the mode. `AnalysisMode.handleMouseDown` (`:172-185`, verified) calls `dragHandler.startDrag`, which returns `false` both for "no marker here" **and** for the D4 single-owner refusal (`BaseDragHandler.js:198-199` — the wheel-pan owns the drag), and the fallback treats any `false` as "create a marker". Repro: zoom in, middle-drag to pan, left-click while panning → a spurious marker is minted, auto-selected and persisted. The same conflation fires on rapid double-mousedown with a lost mouseup. Harmonics/Doppler are safe (their resolvers gate before minting). Fix: make the D4 refusal distinguishable from "no target" (return a reason, or expose `isDragActive` on the engine) and don't mint on refusal.

### BH-5 — Student 24h expiry never fires for a regularly viewed gram
The save listener's `lastSignature` starts `''` (`main.js:460`, verified) so the constructor's first dispatch **always** saves, and every save restamps `savedAt: new Date()` (`storage.js:240`). Merely opening the page restarts the 24-hour window — a student who views a gram daily keeps annotations indefinitely, which is precisely the pre-157 behaviour the feature exists to prevent (spec 157 FR-005 ties the refresh to "saving or modifying", not viewing). Fix: seed `lastSignature` from the restored state (so an unchanged load doesn't save), or preserve the loaded `savedAt` when nothing has changed.

### BH-6 — Positional storage keys migrate annotations onto the wrong spectrogram
The storage key is `pathname` + instance index (`storage.js:157-163`), where the index is a count of previously constructed containers (`main.js:198`). Nothing identifies the image. A config table that fails to init (its container is removed, `GramFrameAPI.js:125-170`), or a reordered/inserted/removed table, shifts every later instance's index — gram B restores gram A's annotations onto B's spectrogram, and the load-time auto-save (BH-5's mechanism) immediately re-persists the corruption under B's identity. `destroy()` mid-page can likewise leave two live instances sharing one key, each save clobbering the other. Fix: include an image fingerprint (URL basename and/or config ranges) in the key or record, and refuse to restore on mismatch (see also BH-23).

### BH-7 — Right-click in zoomed Pan mode leaves the view glued to the cursor
`PanMode.handleMouseDown` (`:133-135`) has no button check, so button 2 starts a pan drag; no `handleContextMenu` override exists and `events.js:365-376` never `preventDefault`s, so the native menu opens and swallows the mouseup. After dismissing the menu, the drag is still active: the viewport chases the cursor with no buttons pressed until the next full click cycle. (Platform-dependent: fires where contextmenu is dispatched on mousedown.) Fix: button-filter the pan resolver; suppress the context menu during active drags (also fixes BH-10/BH-11's trigger).

---

## Medium severity

### Interaction
- **BH-8 — "Infinity" on the speed LED.** `calculateDopplerSpeed` divides by `f₀` unguarded (`doppler.js:36`; pinned by `tests/unit/doppler.test.js`). With the typical `freq-start = 0`, dragging f₀ to the exact left edge (in-bounds — the bounds test is inclusive) yields `speed: Infinity`, and `updateSpeedLED` (`DopplerMode.js:451-458`) calls `.toFixed(1)` with no finiteness check. A trainee reads "Infinity" knots; the value is also broadcast in state.
- **BH-9 — Mode switch mid-doppler-placement commits instead of cancelling.** `_switchMode` cancels every handler (`main.js:549-555`), but DopplerMode wires `onDragCancel` to the same callback as drag-end (`DopplerMode.js:47` → `:127-131`), and for a `place` drag that calls `completeMarkerPlacement()` — persisting a (often degenerate) f⁺/f⁻ curve from a gesture the user thinks was discarded. Cancel semantics are unachievable while cancel and end share one callback.
- **BH-10 — Right-click during a marker drag always deletes the dragged marker.** During a drag the marker sits exactly at the cursor, so `handleContextMenu`'s `findMarkerAtPosition` is a guaranteed hit (`AnalysisMode.js:210-220`) → `removeMarker` splices it mid-drag, 100% reproducible, no confirmation. The drag record stays live pointing at a dead id.
- **BH-11 — Context menu mid-harmonics-drag → set glued to cursor.** No `handleContextMenu`/`handleMouseLeave` in HarmonicsMode; the native menu swallows the mouseup while the pointer never leaves the SVG (distinct from the known off-image gap). The set then tracks the cursor buttonless, persisting every move.
- **BH-12 — `handleMouseUp` never reads `event.button`** (`events.js:317-335`, and no mode checks either). Releasing the *middle* button ends a left-button feature drag at the wrong moment (committing a doppler placement early); releasing the *left* button ends a middle-button pan. Fix: match mouseup to the drag's initiating button.
- **BH-13 — Stale `cursorPosition` corrupts harmonic hit-testing after a pan.** While the wheel-pan is active, `handleMouseMove` returns early (`events.js:240-245`) and plain wheel-pan never updates `cursorPosition`; `findHarmonicSetAtFrequency` reads `state.cursorPosition.time` (`HarmonicsMode.js:487-490`) instead of the click's own coordinates. Click a pin after a long pan → the vertical test runs against the pre-pan time, misses, and **mints a duplicate set on top of the existing one**.

### Persistence
- **BH-14 — Two trainer tabs: last-writer-wins.** localStorage is shared; saves write the whole record from the saving tab's state; no `storage` event listener exists anywhere in `src/`. Markers added in tab A are silently erased by any later save from tab B.
- **BH-15 — Restored doppler curve shows speed 0.0.** Restore sets `fPlus/fMinus/fZero/color` only (`main.js:444-452`); nothing on the load path calls `calculateAndUpdateDopplerSpeed`, and `speed: null` renders as `0.0`. Wrong number over a complete curve until a marker is nudged.
- **BH-16 — Load validates only `version`.** `{...m}` spreads restore anything — `"12k"` strings, missing ids, `spacing: 0` (→ BH-1), NaN positions that render invisibly yet appear in tables — silently, half-applied (a non-array `harmonicSets` is skipped while markers restore), then re-persisted as canonical by the load-time save.
- **BH-17 — Failed saves are never retried.** `lastSignature = signature` executes *before* `saveAnnotations` (`main.js:481-488`); on quota failure the signature is already consumed, so when quota frees the same state never re-saves unless the user makes another change. Move the assignment into the success branch.
- **BH-18 — Drag saves at frame cadence.** Feature drags bump `annotationRevision` per move and dispatch at rAF cadence, so the "cheap signature" changes every frame and the listener runs the *expensive* path — full `JSON.stringify` + synchronous `setItem` + `detectUserContext()`'s document-wide anchor scan + the storage probe — at ~60Hz throughout every drag, defeating the stated purpose of the signature (spec 166 AS-4.3). Save on drag-end instead (`state.drag.active` is already in the projection).
- **BH-21 — Version handling destroys forward data.** Any `version !== 1` record is `removeItem`'d *on read* (`storage.js:306-310`) — opening one page with an older build permanently deletes a newer build's trainer data. Additive same-version fields survive restore (spread) but are stripped by the load-time re-save's whitelist. Safer posture: leave unrecognized records alone.

### Configuration and geometry
- **BH-19 — "Clear gram" leaves derived UI stale.** It rebuilds state slices but skips both `updateSpeedLED` (its "refresh LEDs" call targets `modeLED`/`rateLED`, which are never assigned — a no-op) and `clearSelection()` (it replaces the selection object instead), so the doppler LED keeps the deleted curve's speed and the style controls keep the deleted feature's state — including a Pin toggle stuck disabled if a marker was selected (`main.js:371-411`, vs the right-click reset sibling `DopplerMode.js:475-480` which does call `updateSpeedLED`).
- **BH-20 — Silent config coercions** (`configuration.js:53-59`): an empty value cell becomes `'0'` (`textContent?.trim() || '0'`) — a blank `time-start` yields a plausible-looking 0–60 axis with no warning; `parseFloat` partial parsing turns the European decimal comma `"1,5"` into `1` (halved axis). Duplicate parameter rows: last silently wins. (Range validation itself is good — missing rows, zero and inverted ranges all throw loudly.)
- **BH-22 — Tolerance floors/ceilings ignore the axis span** (`tolerance.js:32-47`). Wide-band at zoom 1: the 50 Hz ceiling is ~2.5 px of grab radius on a 0–20 kHz/1000 px gram — features are hard to grab. Narrow-band: the 1 Hz floor is 10% of a 0–10 Hz axis and zoom can never shrink it, so two features 0.9 Hz apart are never disambiguable — the `/effectiveZoom` term is dead once floored. Plausible (arithmetic confirmed; UX impact needs a fixture).
- **BH-23 — No image/config fingerprint in stored records** (`storage.js:237-277`). Republishing a lesson with a different recording at the same path restores old markers onto the new image at coordinates that meant something else — no way to detect the swap. Distinct from BH-6: corrupts meaning even with stable indices.

---

## Low / latent

- **BH-24 — The live `removeHarmonicSet` lacks `markAnnotationsChanged`; the compliant one is dead code.** The panel's delete button routes to `keyboardControl.js:517-540` (no mark, plain `dispatch`); `HarmonicsMode.removeHarmonicSet` (`:449-473`, has the mark) has zero callers. Masked today by the signature's set-count field; removing the belt-and-braces counts would resurrect the pin bug here. `DopplerMode.resetState` is the same pattern, masked by the identity fields.
- **BH-25 — Harmonic `anchorTime` is clamped by keyboard moves but not drags** (`keyboardControl.js:274` vs `HarmonicsMode.js:627-638`): a drag can push the anchor outside the time range (stored unvalidated → feeds BH-16); the set then snaps back the moment an arrow key touches it.
- **BH-26 — rate ≠ 1 is internally inconsistent (latent).** `imageToData` divides by rate; the renderers and hit-tests pass stored freq straight to `dataToSVG` (documented asymmetry); axis labels divide; only `keyboardControl` re-multiplies (`:179-183`). With rate ≠ 1, drawn positions, grab regions and keyboard geometry disagree by a factor of rate, and `_setRate(0)` produces `Infinity` displays. Masked because nothing sets rate today; any re-enablement ships wrong numbers. Also `_setRate` accepts 0/negative unvalidated.
- **BH-27 — `formatTime` garbage for negative times**: `formatTime(-30)` → `"-1:-30"` on axis labels and marker rows (negative `time-start` passes config validation); sub-5s spans and deep zooms show runs of identical `"00:00"` tick labels (pinned by `tests/unit/time-formatter.test.js`).
- **BH-28 — Whole-Hz axis labels duplicate in the narrowband regime** (`axes.js:226-228`): the nice-number engine happily picks sub-Hz intervals, then `Math.round(f) + 'Hz'` renders `0Hz, 0Hz, 0Hz, 1Hz, 1Hz` — exactly the low-frequency regime sonar training cares about.
- **BH-29 — Button-path `zoomOut()` keeps the old center at 1×** (`viewport.js:31-35` vs `:140-149`), unlike the wheel path which resets it; the next button `zoomIn` jumps to a stale corner. Plausible.
- **BH-30 — Style-picker "next-feature default" branches: only the newest sibling dispatches** (`SymbolPicker.js:120-128` does; color/symbol/pin branches don't), so external listeners see stale defaults.
- **BH-31 — Right-mousedown reaches doppler placement** (`DopplerMode.handleMouseDown:314-319` has no button check, unlike its two siblings): on Windows event order a right-click can commit-then-clear a degenerate pair, churning storage; a right-drag ending off-SVG leaves it in place.
- **BH-32 — `hasPersistableAnnotations` ignores `fZero`** (`storage.js:213` vs the mode's own predicate): an fZero-only state renders but deletes the storage key on save. Unreachable through normal flows; trivial to align.
- **BH-33 — A backwards clock step deletes fresh student work** (`storage.js:95-98`): `savedAt` 1 ms in the future ⇒ expired ⇒ removed. Documented as an anti-tamper trade-off, but an NTP correction triggers it; a small tolerance window (< 5 min) would keep the intent.

---

## Negative results (worth recording)

- **The pin bug is the sole save-trigger hole.** Every other annotation mutation was checked against the save signature: drag-moves, keyboard moves, colour/symbol restyles, harmonic drags, doppler moves and resets all either bump `annotationRevision` or are caught by the signature's count/identity fields. (`largeSymbols` is exempt by documented design.)
- **Mode switches do not wedge drags.** `_switchMode` cancels every mode's drag handler centrally — the "switch mid-drag corrupts state" hypothesis is disproven (though see BH-9 for what *cancel* itself does to a doppler placement).
- **Marker/harmonic-set round-trip fidelity is exact.** Field-by-field: `{id, color, time, freq, symbol}` and `{id, color, anchorTime, spacing, symbol, showPin}` survive save/load byte-for-byte; `showPin !== false` defaulting is symmetric on both ends.

---

## Suggested fix order

1. **Storage validation on restore** (BH-1, feeds from BH-16): field-by-field validation kills the page-brick and the garbage-cementing class in one change.
2. **Keyboard scoping** (BH-3): `event.target` guard + focus-clearing — small change, unbreaks the modal and host-page forms.
3. **Pin render cap / spacing floor derived from range** (BH-2).
4. **Button discipline** (BH-4, BH-7, BH-10, BH-11, BH-12, BH-31): one pass over mousedown/mouseup/contextmenu adding button filters, a distinguishable D4 refusal, and contextmenu suppression during drags — plus a separate cancel callback for DopplerMode (BH-9).
5. **Save-listener hygiene** (BH-5, BH-17, BH-18): seed the signature from restored state, advance it only on successful write, and skip saves while `state.drag.active`.
6. **Storage identity** (BH-6, BH-23): fingerprint records with the image URL/config ranges; refuse or warn on mismatch.
7. The doppler polish pair (BH-8 finiteness guard on the LED, BH-15 recompute on restore) and the "Clear gram" staleness fixes (BH-19).
