# GramFrame Testing Strategy

This describes the testing that actually exists and runs. Anything not yet built
is under [Targets](#targets) and labelled as such — nothing above that section is
aspirational.

## Lanes

| Lane | Runner | Command | Scope |
|------|--------|---------|-------|
| End-to-end | Playwright (Chromium) | `yarn test` | Everything a user does: modes, markers, harmonics, doppler, pan/zoom, expand, storage, keyboard, legacy-browser handling |
| Unit | Vitest (Node, no browser) | `yarn test:unit` | Pure JS with no DOM dependency (`tests/unit/`) |
| WebKit smoke | Playwright (WebKit) | `npx playwright test --config playwright.smoke.config.ts` | The component initialises and renders in a non-Chromium engine (`tests/smoke/`) |
| Types | `tsc --noEmit` over JSDoc | `yarn typecheck` | Type errors without a TypeScript build |
| Lint | ESLint | `yarn lint` | Style and correctness rules |
| Debt ratchets | `scripts/hygiene.js` | `yarn hygiene` | Import cycles, unused exports and `waitForTimeout` counts, each capped at a committed baseline that only ever falls |

Playwright is configured in `playwright.config.ts`: it boots the Vite dev
server, runs `tests/**` except `tests/unit/` and `tests/smoke/`, and retries
twice in CI.

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
  student 24-hour expiry, "Clear gram", and the warning shown when storage
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
