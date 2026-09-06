# The control panel

The row of controls above the gram. This describes what it is, why it is
arranged the way it is, and which module owns each part.

The plot area below it is unchanged and out of scope: the gram, the axes and
every overlay are drawn exactly as before.

## The problem it solves

The old panel was five bordered boxes of equal visual weight. Nothing in it was
the first thing to read, so the eye had no entry point; per-mode guidance had
nowhere permanent to live; and it was never clear whether the colour slider was
setting the style of the *next* feature or restyling the one just clicked.

The redesign is about rank, not content. Almost everything that was in the panel
is still in it.

## The five columns

One 250px row, `display: flex`, on the panel surface. Columns are separated by a
single hairline rather than boxed.

| # | Column | Width | Module |
|---|--------|-------|--------|
| 1 | Mode rail | 154px | `components/ModeButtons.js` |
| 2 | Guidance | 264px, or a 40px rail | `components/GuidancePanel.js` |
| 3 | Cursor readouts | 210px | `components/CursorReadout.js` |
| 4 | Style | 222px | `components/StylePanel.js` |
| 5 | Annotation tables | the rest | `components/AnnotationTables.js` |

`components/MainUI.js` assembles them and builds none of them.

The first four are fixed: the instrument face and the tool list are what the
panel is for, so a narrow host squeezes the tables first and then collapses the
guidance to its rail. That decision is made by a **container query** on the
component, not a viewport media query — the same page can carry a full-width
gram and a half-width one.

### 1. The mode rail

Five modes stacked in roster order, each showing its glyph beside its word. The
armed mode takes an accent left border and a tinted ground; the border is
transparent rather than absent at rest, so arming changes no geometry and rows
do not shift under the pointer.

Beneath them, fenced off by a rule, are the **view controls**: zoom out, zoom
in, fit. They are declared by Pan — the mode that owns the viewport — but they
are drawn here in every mode, because zooming and fitting are things an analyst
does *while* measuring rather than instead of it. They used to sit inside Pan's
own row, which made one row of five four controls wide.

Clear is deliberately not here. It removes annotations, not view state; see
column 5.

### 2. Guidance

Immediately beside the rail, so the armed tool and the gestures that drive it
read as one block. Its space is dedicated: collapsing it hands the width to the
annotation tables and nothing else ever moves in.

Each line is split into a **trigger** in a fixed 76px track and an **outcome**
beside it. That split is the whole point: the four gestures of a mode compare
down one column instead of having to be read out of four sentences. The shape
is `{trigger, outcome}` objects returned from each mode's `getGuidanceText()`
and rendered by `utils/secureHTML.js`, which remains the only path guidance
takes to the DOM.

Collapse has three states, not two:

- **collapsed** — the analyst pressed Hide.
- **open** — the analyst pressed the reveal.
- **automatic** — they have never touched it, and the column shows itself where
  there is room and collapses where there is not.

The stored preference distinguishes all three (`true` / `false` / absent). Were
"never chosen" folded into "open", the automatic behaviour could never fire.

### 3. The cursor readouts

The panel's anchor, and the only part styled as an instrument: recessed ground,
large monospaced tabular numerals, and a faint bloom on the two readings the
pointer produces. Doppler speed is fenced off at the foot between two rules at
half the size, because it is a derived quantity rather than a coordinate.

The column has two targets, named by its kicker:

- **CURSOR** — it follows the pointer over the gram.
- **SELECTED &lt;name&gt;** — a feature is selected, and it shows that feature's
  own values, so a marker's numbers can be read without hovering it and losing
  them again on the way to the panel.

`updateUniversalCursorReadouts` stands aside while something is selected, which
is what stops the two targets fighting over the same two numbers.

There is no intensity or colourmap legend. One was drawn and removed: without
calibrated units it tells the operator nothing they cannot see.

### 4. The style panel

Twin tabs across the top state what the controls are about to change:

- **New features** — colour, symbol and pin style for everything added from now
  on, in any mode.
- **Selected: &lt;name&gt;** — the same controls pointed at that feature, plus
  the two things that only make sense for one that already exists: its label,
  edited in place, and a nudge pair mirroring the arrow keys. Its footer offers
  Delete.

`state.styleTarget` records which is armed. Selecting a feature arms the second;
clicking the first arms the defaults **without** giving up the selection, so an
analyst can change what comes next while still nudging the row they are on.
`core/featureStyle.js`'s `getSelectedFeature` is the single gate: `getActiveStyle`
and all four `apply*ToSelectedFeature` functions read the answer from it.

There is exactly one colour control in the panel. The second row of fixed
swatches is gone: two ways to set one property meant neither was the one that
said what the colour currently *was*.

The symbol control is a button opening a popup of all seven shipped symbols,
drawn at the size and in the colour they will actually take. It also houses the
temporary large-symbol trial, which was a permanent control in the main panel
for a temporary question.

**Marker labels** are edited here rather than in a dialog opened from the row.
Labels are optional; clearing the field removes the label.

### 5. The annotation tables

Markers, harmonics and sidebands, three equal columns, all visible at all times
whatever mode is armed. Each has a header with a count chip, hidden at zero, and
an instructional empty state rather than a blank rectangle.

The **selected row is reversed out whole** — light ground, dark ink. It used to
be an accent border, which collided with the feature colours the rows themselves
carry: a green-bordered row holding a green marker said two things at once.
Inversion survives any feature colour.

The sidebands column carries a footer holding **Clear all annotations**, on
every page. It was trainer-only, on the reasoning that a student's work expires
overnight anyway — but "it will be gone tomorrow" is no answer to a student who
has mislabelled a gram and wants to start the exercise again today. Clearing is
the same operation either way; only where the annotations were stored differs.

Sideband sets are rare, so the foot of that column is the space the panel has
going spare — and a destructive control among three view controls in the rail
would be one slip from an afternoon's work.

## The transport bar

Only present when the gram is audio-sourced, and mounted **below** the gram:
that is where the scrub track and its bookmark flags line up with the time axis
they refer to, and where the panel's height never changes when a recording
loads.

The view scrolls back to the very start of a recording, not to one window above
it. The top edge of the plot area *is* the playhead, and drag-seek resumes from
whatever time that edge shows, so a lower bound of one window made the opening
seconds of every recording impossible to put under the playhead — visible at the
bottom of the view, but unreachable by dragging. Reaching zero means the window
below the start is blank, which is the same blankness the opening seconds
already showed while the first window played.

**Time bookmarks** are the one new affordance. Bookmark (or the `B` key) flags
the playhead; each bookmark draws a numbered flag on the track that can be
clicked to jump, and the "*n* saved" button lists them with a way to remove each.
They are playback chrome, not annotation — a marker says what was measured and
belongs to the gram, a bookmark says where to listen again and belongs to the
sitting — so they live in memory for the life of the page and never reach the
annotation store.

## Tokens

Declared once on `.gram-frame-container` in `src/gramframe.css` and used through
the variables, so a change lands everywhere at once.

- Ground `--gf-bg` #161826 · Surface `--gf-surface` #232532 · Text `--gf-text`
  #e9e9ed
- Accent `--gf-accent` #9184d9 with a ramp: `-900` for tinted fills,
  `-800`/`-700`/`-600` for borders, `-400` for hover, `-200`/`-100` for text on
  those tints
- Muted ink is one value, `rgba(233,233,237,.62)` (~5.4:1 on the surface).
  Alphas below .60 do not reach 4.5:1 on this ground and are not used for text
- Non-text tier (borders, hover tints, hairlines): `rgba(233,233,237,.05)`–`.18`,
  and `rgba(0,0,0,.16)`–`.28` for recesses
- Danger is a hover-only affordance: border `#8d5a5a`, text `#e2b3b3`. Nothing
  in the panel is red at rest
- Keyboard focus is one treatment everywhere: `outline: 2px solid var(--gf-accent)`
  at `outline-offset: 2px`

## What was considered and rejected

- **New-user onboarding** (first-run cards, a guided mode). The interface should
  be self-explanatory instead, which is what the permanent guidance column is
  for.
- **Docking the transport into the panel.** It keeps all the chrome in one
  block, but puts the playhead ~150px from the axis it refers to, so scrubbing
  means watching two places at once.
- **An accent tint for the selected row**, rather than inverting it. It collides
  with feature colours; see column 5.
