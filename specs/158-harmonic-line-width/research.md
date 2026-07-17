# Research: Width of Harmonic Lines (Trial)

**Feature**: 158-harmonic-line-width
**Phase**: 0 (Outline & Research)

This feature has no NEEDS CLARIFICATION markers in its Technical Context — the
scope is a single, well-understood rendering change. The research below records
the decisions that shape the (minimal) implementation.

## Decision 1: Current harmonic line width is 2px, so the trial applies

- **Decision**: Proceed with a trial. Harmonic lines are drawn at `stroke-width:
  2` today, so the issue's "if they are 2px" branch applies (not the "already
  1px, can't do anything" branch).
- **Rationale**: `src/modes/harmonics/HarmonicsMode.js` → `createHarmonicLine()`
  sets `line.setAttribute('stroke-width', '2')` (line 683). This is the only
  place harmonic vertical lines get their width.
- **Alternatives considered**: None — the current width is a directly verifiable
  fact in the source, not a judgement call.

## Decision 2: Interpret "every other line is 1px" as alternation, not a global change

- **Decision**: Render alternating widths within each harmonic set — odd
  harmonic numbers at 2px (current), even harmonic numbers at 1px (thinner) — so
  the reviewer sees both weights on the same spectrogram.
- **Rationale**: The issue explicitly says "produce a *trial* release where every
  other vertical line is 1px." A trial implies a side-by-side comparison so the
  reviewer can decide whether 1px reads better than 2px. Converting every line to
  1px would remove the comparison and pre-empt the decision. Alternation is the
  most literal reading of "every other line."
- **Alternatives considered**:
  - *Make all lines 1px*: rejected — removes the comparison the trial exists to
    provide and over-commits before the reviewer decides.
  - *Add a UI toggle to switch width*: rejected — over-engineered for a trial;
    introduces state/config surface the issue does not ask for and the
    constitution's declarative-config principle would scrutinise.

## Decision 3: Derive width from harmonic number for determinism

- **Decision**: Compute the width as `harmonicNumber % 2 === 0 ? 1 : 2` inside
  `createHarmonicLine`, which already receives `harmonicNumber`.
- **Rationale**: `harmonicNumber` is a stable identity for each line (1, 2, 3,
  …). Keying width off it guarantees the same harmonic always renders at the same
  width across every re-render — drag updates, zoom, expand, mode switches, and
  reloads (FR-002, SC-003). Using a render-loop index would also work but is
  slightly less stable if visible-harmonic ranges shift; harmonic number is the
  natural, persistent key. No extra parameter plumbing is required.
- **Alternatives considered**:
  - *Alternate by loop index (`forEach` index)*: rejected — index can shift when
    the visible-harmonic window changes (freqMin/freqMax), so a given harmonic
    could flip width across re-renders, violating determinism.
  - *Store width in state / persisted record*: rejected — width is a pure
    render-time attribute; persisting it adds needless surface and migration
    concerns (Doppler/Analysis unaffected).

## Decision 4: Fixed pixel stroke, not zoom-scaled

- **Decision**: Keep `stroke-width` as a fixed pixel value (1 or 2), exactly as
  today's `'2'`.
- **Rationale**: The existing line already uses a fixed pixel stroke and is not
  scaled with the coordinate transform; harmonic *positions* are zoom-aware but
  the stroke weight is intentionally constant. Preserving this keeps the trial an
  apples-to-apples comparison and satisfies the constraint that width must not
  change with zoom/expand.
- **Alternatives considered**: *Scale width with zoom*: rejected — changes
  behaviour beyond the trial's scope and would make the comparison inconsistent
  across zoom levels.

## Decision 5: Test via DOM attribute assertion

- **Decision**: Assert the alternating widths by reading the `stroke-width`
  attribute of `.gram-frame-harmonic-line` elements, keyed by
  `data-harmonic-number`, in a Playwright test.
- **Rationale**: SVG-first rendering (Constitution I) keeps the lines
  DOM-queryable. Each line already carries `data-harmonic-number`, so the test
  can map harmonic → expected width deterministically. This matches the existing
  test patterns in `tests/harmonics-mode.spec.js`.
- **Alternatives considered**: *Visual/screenshot comparison*: rejected as the
  primary check — attribute assertion is exact and stable; a screenshot is
  brittle for a 1px difference. Screenshots remain available for manual review.

## Summary

All decisions resolve to a one-line source change plus one test. No unknowns
remain; Phase 1 proceeds.
