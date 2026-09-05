# Gram Component Interaction Modes

GramFrame has **five** interaction modes: **Pan**, **Cross Cursor** (the
analysis mode), **Harmonics**, **Sidebands** and **Doppler**. This document
describes what each one does for an analyst; for how they are built see
[Tech-Architecture.md](Tech-Architecture.md).

Behaviour common to every mode:

- The time/frequency readouts follow the cursor regardless of the active mode.
- Markers, harmonic sets, sideband sets and doppler curves stay visible in all
  modes once placed — only the mode that *creates* them changes.
- Ctrl+wheel zooms about the pointer, wheel scrolls along frequency when zoomed
  in, and a middle-button drag pans — in every mode.
- **Shift + drag** a box over the gram to zoom straight into that region, in
  every mode and at any zoom level. The box holds the gram's proportions while
  you draw it (zoom is one level plus a centre, so an arbitrary rectangle
  cannot become the view), the surround dims, and the span you are choosing is
  shown live. Escape cancels; a Shift-click that barely moves does nothing.
- Switching mode clears the current selection, so the colour/symbol controls
  target the next feature you create rather than restyling the last one.

---

## 🖐️ Pan Mode

### Purpose

Move around a zoomed-in gram without placing anything. This is the **default**
mode, so a first stray click never leaves an annotation behind.

### Behaviour

- Click and drag to pan the view (only meaningful when zoomed in).
- `+` / `−` command buttons zoom in and out; panning clamps at the image edges.
- The **fit** button (four corner brackets) returns the whole gram in one click,
  and is disabled when it is already showing. On an audio-sourced gram "the
  whole gram" is the configured `window-seconds` window, not the entire
  recording.
- Pan's own button shows a hand rather than a word. Its row is the only one
  carrying command buttons, and four controls do not fit across the column with
  a word among them; the hand is also what the cursor becomes over a gram you
  can drag. Every other mode is still named in full.
- Selectable at any zoom level, including fully zoomed out.

---

## 🎯 Cross Cursor Mode (analysis)

### Purpose

Measure precise frequency (X) and time (Y) positions, and keep a record of the
points measured.

### Business context

Used by analysts and trainees to identify and examine features such as tonal
events, broadband pulses or ambient shifts in sonar data.

### Behaviour

- Click to place a persistent marker at the cursor position.
- Drag an existing marker to reposition it.
- Right-click a marker to delete it.
- Markers are listed in the markers table above the gram; clicking a row selects
  that marker, after which the arrow keys nudge it (Shift for larger steps).
- A marker's colour and symbol come from the style controls; with a marker
  selected, those controls restyle it in place.
- Each row's **label button** (the tag icon, above the delete ×) opens a dialog
  for the marker's label. Labels are optional — a marker has none until one is
  entered — and clearing the field removes the label again.
- A label is drawn on the gram in black on a white rounded plate, so it reads
  over both dark and light pixels: in the upper-right quadrant of a crosshair marker,
  or centred above a marker that carries a shaped symbol. The one exception is
  the upward-pointing triangle, which is aimed at the gram above it — its label
  is centred *below* the symbol so the data being marked stays visible.
- The table's **Label** column shows labels of five characters or fewer in full,
  and abbreviates anything longer to its first three characters plus `..`. The
  full text stays on the gram and in the dialog.

---

## 🎼 Harmonics Mode

### Purpose

Reveal harmonic relationships — whether several tonals share a common origin,
such as a propeller shaft or another mechanical source, by testing for integer
multiples of a spacing.

### Behaviour

- Click and drag to create a harmonic set; the drag sets the spacing.
- Drag an existing set to adjust its spacing and anchor time.
- **+ Manual** opens a dialog for entering a spacing numerically.
- Each set draws a vertical pin line per harmonic, capped by the **Tall Pins**
  toggle (on by default for each browser session): full-height lines when it is
  on, short mini-pins hanging from the symbols when it is off.
- Dense sets are sampled: at most a fixed number of symbols and harmonic numbers
  are drawn within the visible span, at a regular "nice" interval, so a small
  spacing over a wide span stays legible. The pins themselves are not thinned, so
  the unlabelled harmonics still show against the data.
- Each harmonic number sits above its symbol — except for a set drawn with the
  upward-pointing triangle, whose apex points at the gram above it. There the
  number hangs below the symbol instead, leaving that data clear; the grab region
  follows the digits, so the set is still grabbable wherever it is drawn.
- Sets are listed in the harmonics panel; selecting a row enables arrow-key
  adjustment and in-place restyling, as for markers.

---

## 📻 Sidebands Mode

### Purpose

Reveal a modulated tonal: a carrier with equally-spaced sidebands either side of
it, such as a shaft rate modulating a blade tone. It is Harmonics mode with the
origin freed — the analyst places the fundamental rather than counting up from
0 Hz.

### Behaviour

- Click to set the **fundamental** at that frequency. About eight sidebands
  appear, equally spaced either side of it: an equal count each side when the
  fundamental sits mid-axis, and more on the roomier side when it does not.
- The initial spacing is only a starting point — hold the drag on and keep
  moving, or drag again, to match the spacing to the data underneath.
- Drag the **0** line to move the fundamental; drag any other line to set the
  spacing, which holds the line you grabbed under the cursor. Dragging
  vertically moves the set's anchor time, as in Harmonics mode.
- Each sideband is labelled by its signed offset from the fundamental — `0`,
  `+1`, `-1` and so on — and is drawn with the same pins, symbols, colours and
  **Tall Pins** toggle as a harmonic set. Dense sets are sampled the same way.
- Sets are listed in the **Sidebands** panel, which sits beside the harmonics
  panel and is visible in every mode, as the markers and harmonics tables are.
  Selecting a row enables arrow-key spacing adjustment and in-place restyling,
  as for harmonic sets.

---

## 🛰️ Doppler Mode

### Purpose

Estimate platform speed from the frequency shift of a tonal as it passes.

### Business context

Used during tactical or post-mission analysis to derive speeds from tonal slopes
on a spectrogram.

### Behaviour

- Click and drag to place the f+ and f− markers in one gesture; the curve
  previews during the drag. On release, f+ is the later of the two in time.
- f₀ is placed automatically at the midpoint and can then be dragged
  independently — dragging f+ or f− leaves it where it is.
- An S-curve is drawn between f+ and f−, with vertical extensions clipped to the
  visible gram area.
- Speed is calculated from f+, f− and f₀ and shown in knots on the Speed
  readout.
- Right-click resets all doppler markers.
