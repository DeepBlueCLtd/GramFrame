# GramFrame Testing Strategy

This describes the testing that actually exists and runs. Anything not yet built
is under [Targets](#targets) and labelled as such — nothing above that section is
aspirational.

## Lanes

| Lane | Runner | Command | Scope |
|------|--------|---------|-------|
| End-to-end | Playwright (Chromium) | `yarn test` | Everything a user does: modes, markers, harmonics, doppler, pan/zoom, expand, storage, keyboard, legacy-browser handling |
| Unit | Vitest (Node, no browser) | `yarn test:unit`, or `yarn coverage` to measure | Pure JS with no DOM dependency (`tests/unit/`) |
| WebKit smoke | Playwright (WebKit) | `npx playwright test --config playwright.smoke.config.ts` | The component initialises and renders in a non-Chromium engine (`tests/smoke/`) |
| Types | `tsc --noEmit` over JSDoc | `yarn typecheck` | Type errors without a TypeScript build. Covers `src/`, `tests/helpers/`, `tests/unit/` and `scripts/`, and must stay at zero |
| Spec types | `tsc --noEmit -p tsconfig.specs.json` | `yarn typecheck:specs` | The Playwright specs, counted as a debt ratchet by `yarn hygiene` rather than gated at zero (R9-10) |
| Lint | ESLint | `yarn lint` | Style and correctness rules |
| Debt ratchets | `scripts/hygiene.js` | `yarn hygiene` | Import cycles, unused exports, `waitForTimeout` counts, the instance surface, module line counts, spec type errors and uncovered unit-lane lines — each capped at a committed baseline that only ever falls |

Playwright is configured in `playwright.config.ts`: it boots the Vite dev
server and runs `tests/**` except `tests/unit/` and `tests/smoke/`, with
`retries: 0` everywhere — a test that fails once is a bug, locally and in CI
alike. Only the WebKit smoke lane (`playwright.smoke.config.ts`) retries.

## Coverage — what is and is not measured

`yarn coverage` runs the unit lane under V8 coverage and writes
`coverage/coverage-summary.json`, which `yarn hygiene` ratchets as **uncovered
lines** (issue #266).

**Measured:** only the modules the unit lane can reach — the `include` list in
`vitest.config.js`: `src/audio/`, `src/utils/`, `src/rendering/symbols.js`,
`state.js`, `storage.js`, `browserCompatibility.js`, `ModeFactory.js`,
`modeRoster.js`, `BaseDragHandler.js`. At the time of writing that is **684 of
1,114 lines (61.4%)**.

**Not measured, deliberately:**

- everything outside that list — the DOM and SVG code the unit lane never
  loads. Including it would report a figure that moves for reasons nothing in
  this lane controls, which is worse than no figure;
- the end-to-end lane. Playwright/V8 coverage of the browser run is a separate,
  larger job and is not attempted here;
- branches, statements and functions. The summary carries them and `yarn
  coverage` prints them, but only lines are ratcheted — one number, one gate.

A count rather than a percentage, so it falls like every other ratchet here: a
percentage can rise while the untested code also grows, if the covered lines
grow faster. Bringing a new module into the `include` list raises the count,
which is the point — the debt becomes visible when it is taken on.

Coverage is not a proxy for whether a test asserts anything. The suite's real
guard against that is mutation testing by hand: revert the fix, watch the test
fail. Several PRs in this series found tests that passed for the wrong reason
that way, which no coverage figure would have shown.

WebKit is exercised **only** by that smoke lane — everything else runs in
Chromium. Running it locally needs its browser first: `npx playwright install
webkit`.

## What the end-to-end suite covers

Each spec file targets one feature area; the file names say which. Interaction
tests drive real mouse and keyboard events against a debug page or a fixture in
`tests/fixtures/`, then assert on published state, on the DOM, or on both.

- **Component setup**: config-table detection and replacement, image scaling,
  multi-instance pages, error indicators, legacy-browser warnings
- **Modes**: analysis markers, harmonic sets and panels, doppler curves and
  speed, pan/zoom (including wheel navigation and clamping), and cross-mode
  integration
- **Persistence**: trainer/student context detection, save and restore, the
  student 24-hour expiry, "Clear all annotations", and the warning shown when storage
  refuses a write
- **Keyboard and focus**: instance focus, Tab navigation, arrow-key handling
- **Lifecycle and API hygiene**: the debug-only `__test__*` surface, listener
  teardown on destroy, and the single instance registry

## Test utilities

`tests/helpers/` holds the page object and assertion helpers:

- `gram-frame-page.js` — `GramFramePage`, the page object most specs drive
- `state-assertions.js` — assertions over published state
- `coordinate-helpers.js`, `interaction-helpers.js`, `mode-helpers.js` — drag,
  click and coordinate-conversion helpers
- `fixtures.js` — Playwright fixtures wiring the helpers together

The `__test__*` API methods the helpers use are attached only when a page sets
`window.GRAMFRAME_DEBUG = true`. Every debug page and test fixture does; a
published page does not, so those methods are absent in the field.

## Writing a test

1. Put it in the lane that fits: no DOM needed → `tests/unit/`; anything else →
   a Playwright spec.
2. Prefer web-first assertions (`expect(locator).toHaveText(...)`,
   `expect.poll(...)`) over `waitForTimeout`. The ratchet in
   `hygiene-baseline.json` caps the number of fixed sleeps and only ever goes
   down, so a new one has to displace an old one.
3. Use an existing fixture page where possible; add one under `tests/fixtures/`
   when a test needs a distinct page setup (a trainer flag, a simulated legacy
   browser, a published page without the debug flag).
4. Assert on what a user or an integrator can observe: published state, rendered
   DOM, storage contents.
5. **Never reach module-level mutable state through `await import('/src/...')`
   inside `page.evaluate`.** Importing a pure function that way is fine. Reading
   or writing a module's own mutable state is not: once the dev server has
   processed a hot update it serves the module to the app with a cache-busting
   query (`state.js?t=1788596541008`), and a bare specifier resolves to a
   *second, distinct* module instance with its own fresh copy of that state. The
   test then observes a registry the app never writes to. The symptom is the
   worst kind — green against a cold `yarn dev`, red against a warm one, so a
   developer running `yarn test` beside an open `yarn dev` sees failures that
   have nothing to do with their change (R9-27). Go through `window.GramFrame`
   instead: the API object comes from the module graph the running component was
   built from, whatever URL it arrived under. Add a `__test__*` accessor if one
   does not exist yet.

## Continuous integration

`.github/workflows/test.yml` runs lint, typecheck, the unit lane, the standard
build and the standalone bundle build, then the full Playwright suite. The
release workflow additionally checks the tag against `package.json` and verifies
the built bundle carries that version.

## Targets

Not currently implemented. Listed so the gaps are explicit rather than implied:

- **Visual regression**: there are no screenshot assertions
  (`toHaveScreenshot` / `toMatchSnapshot`) anywhere in the suite.
- **Coverage measurement**: no coverage tool runs in any lane, and no coverage
  threshold is enforced.
- **Broader unit coverage**: the unit lane currently holds the harmonic-sampling
  tests only; pure logic elsewhere is still reached through the browser.
- **Fewer fixed sleeps**: the `waitForTimeout` ratchet exists to drive the count
  down toward state-based waiting.
- **Restored keyboard-movement specs**: `tests/keyboard-focus*.spec.js.disabled`
  are parked; arrow-key marker movement has no behavioural assertion.
