# Quickstart: Width of Harmonic Lines (Trial)

**Feature**: 158-harmonic-line-width

## What this delivers

A trial rendering where harmonic vertical lines alternate in thickness: odd
harmonics stay at the current 2px, even harmonics render thinner at 1px. This
lets a reviewer compare thinner vs current line weight on the same spectrogram.

## The change in one place

`src/modes/harmonics/HarmonicsMode.js` → `createHarmonicLine()`:

```js
// Before
line.setAttribute('stroke-width', '2')

// After
const strokeWidth = harmonicNumber % 2 === 0 ? 1 : 2  // even → 1px (thin), odd → 2px (current)
line.setAttribute('stroke-width', String(strokeWidth))
```

`harmonicNumber` is already the first parameter of `createHarmonicLine`, so no
other wiring is needed.

## Try it locally

```bash
yarn dev
```

1. Open the dev page and switch to **Harmonics** mode.
2. Click-drag on the spectrogram to create a harmonic set that shows several
   harmonic lines.
3. Observe that consecutive harmonic lines alternate between thin (1px) and the
   current (2px) weight. The harmonic-number labels are unchanged.

## Verify

```bash
yarn typecheck   # zero errors
yarn test        # all Playwright tests green, including the new width assertion
yarn build       # clean production build
```

### What the new test checks

In `tests/harmonics-mode.spec.js`, after creating a harmonic set with multiple
visible harmonics:

- Every `.gram-frame-harmonic-line` has `stroke-width` of exactly `"1"` or `"2"`.
- Odd `data-harmonic-number` lines are `"2"`; even ones are `"1"`.
- Consecutive harmonics differ in width.

## Rollback / follow-up

This is a trial. Once the reviewer decides on a final width, a follow-up change
replaces the alternation with a single chosen `stroke-width`. No data migration
is involved because nothing is persisted.
