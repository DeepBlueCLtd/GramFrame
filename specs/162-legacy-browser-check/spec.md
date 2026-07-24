# Feature Specification: Legacy-Browser Compatibility Warning

**Feature Branch**: `162-legacy-browser-check`  
**Created**: 2026-07-24  
**Status**: Draft  
**Input**: GH issue #198 (Review feedback) — bullet 6: a legacy Chrome (v84) lacked `replaceChildren` (needs v86), so GramFrame silently failed. Add an early check for the required JS/DOM APIs and show a clear "please update your browser" warning instead of failing silently.

## User Scenarios & Testing *(mandatory)*

<!--
  Background: GramFrame uses modern DOM APIs — notably Element.replaceChildren()
  (Chrome/Edge 86+) — with no feature-detection guard. On an older browser these
  calls throw during rendering and the component silently fails: the analyst sees
  a blank or broken area with no explanation. GramFrames are about to be
  distributed more widely, where old Chrome/Edge installs are likely. This
  feature adds a check, very early in the render process, that the required APIs
  exist, and shows an actionable warning message when they do not.
-->

### User Story 1 - Legacy-browser user gets a clear, actionable warning (Priority: P1)

An analyst opens training material containing a GramFrame on an out-of-date
browser (for example Chrome/Edge 84) that lacks the JavaScript/DOM features the
component needs. Instead of a blank or half-rendered area with no explanation, the
analyst sees a plain, readable message in place of the component telling them the
component needs a newer browser and to update. The message names the minimum
supported version so the analyst (or their IT support) knows what to do.

**Why this priority**: This is the whole point of the feature — replacing a silent
failure with a clear instruction. It is independently valuable and testable by
simulating a missing API.

**Independent Test**: In an environment where a required API is absent (or
simulated absent), load a page with a GramFrame and confirm a readable warning
message is shown in place of the component, naming the minimum browser version and
telling the user to update.

**Acceptance Scenarios**:

1. **Given** a browser missing one or more required JS/DOM APIs, **When** a
   GramFrame would initialise, **Then** a human-readable warning is shown in place
   of the component instead of a blank/broken area or a thrown error.
2. **Given** the warning is shown, **When** the analyst reads it, **Then** it
   states that a newer version of Chrome/Edge is required, names the minimum
   supported version, and asks the user to update their browser.
3. **Given** a page containing multiple GramFrames on an unsupported browser,
   **When** the page loads, **Then** each GramFrame area shows the warning (no
   area is left silently blank).
4. **Given** an unsupported browser, **When** the check fails, **Then** the failure
   is detected before the component attempts the rendering that would otherwise
   throw, so the analyst never sees a partially-rendered, broken component.

---

### User Story 2 - Modern-browser user is unaffected (Priority: P1)

An analyst on a current, supported browser opens the same material. The
compatibility check passes silently and the GramFrame renders and behaves exactly
as it does today, with no warning, no delay noticeable to the user, and no change
in behaviour.

**Why this priority**: The check must be invisible on supported browsers — the
overwhelming majority of users. A guard that degraded the normal experience would
be unacceptable, so this is P1 alongside Story 1.

**Independent Test**: On a current supported browser, load a page with a GramFrame
and confirm no warning appears and the component renders and works exactly as
before.

**Acceptance Scenarios**:

1. **Given** a supported browser with all required APIs present, **When** a
   GramFrame initialises, **Then** no warning is shown and the component renders
   normally.
2. **Given** a supported browser, **When** the check runs, **Then** it adds no
   perceptible delay and does not change any existing behaviour.

---

### Edge Cases

- **Partial support** (some required APIs present, others missing): the check
  treats the browser as unsupported and shows the warning, rather than proceeding
  and failing later.
- **Non-Chromium browser lacking a required API**: the warning still appears; the
  wording refers to Chrome/Edge as the supported browsers but the guard is based on
  feature presence, not on sniffing a specific browser brand.
- **Check itself must not depend on an unsupported API**: the detection code must
  run on the old browser without throwing, or it would reproduce the silent
  failure it is meant to prevent.
- **Component embedded where its container is small**: the warning message must
  still be legible (it should not be clipped to nothing).
- **API present but the config table is malformed**: this feature covers only
  browser capability; existing config-parsing behaviour is unchanged.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Before performing rendering that relies on modern JS/DOM APIs, the
  system MUST check that the APIs GramFrame requires are present in the current
  browser.
- **FR-002**: The check MUST run early enough that, on an unsupported browser, the
  component never reaches the code that would throw — the analyst MUST NOT see a
  partially-rendered or broken component.
- **FR-003**: When the check fails, the system MUST display a human-readable
  warning in place of the GramFrame instead of failing silently or throwing an
  uncaught error.
- **FR-004**: The warning message MUST state that a newer version of Chrome/Edge is
  required, MUST name the minimum supported version, and MUST ask the user to
  update their browser.
- **FR-005**: When the check passes, the component MUST render and behave exactly
  as it does today, with no warning and no perceptible delay.
- **FR-006**: On a page with multiple GramFrames, an unsupported browser MUST show
  the warning for each one (no GramFrame area may be left silently blank).
- **FR-007**: The detection logic itself MUST NOT rely on any API that is absent on
  the browsers it is meant to catch, so the check runs without throwing on those
  browsers.
- **FR-008**: The set of required APIs checked MUST include, at minimum, the
  APIs that caused the original silent failure (e.g. `Element.replaceChildren`)
  and any other post-baseline APIs the component depends on.
- **FR-009**: The minimum supported version named in the warning MUST correspond to
  the actual APIs the component requires (i.e. the highest browser version needed
  by any required API).

### Key Entities *(include if data involved)*

- **Required-API set**: The list of JS/DOM capabilities the component depends on
  that are newer than the legacy baseline (Chrome/Edge 84). Presence of all of
  them is the pass condition; absence of any is the fail condition.
- **Compatibility warning**: The user-facing message shown in place of the
  component when the check fails — stating the minimum browser version and asking
  the user to update.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a browser missing a required API, 100% of GramFrame areas show the
  warning message instead of failing silently.
- **SC-002**: The warning names the minimum supported Chrome/Edge version and tells
  the user to update.
- **SC-003**: On an unsupported browser, the component never throws an uncaught
  error and never shows a partially-rendered component.
- **SC-004**: On a supported browser, no warning appears and the component behaves
  identically to today, with no measurable regression.
- **SC-005**: The detection runs without error on the legacy browsers it targets
  (it does not itself require an unsupported API).
- **SC-006**: The minimum version stated in the warning matches the highest browser
  version any required API needs.

## Assumptions

- The original failure was caused by `Element.replaceChildren` (added in
  Chrome/Edge 86) being absent on Chrome 84. The minimum supported version stated
  in the warning should be derived from the actual required-API set; based on
  current usage this is expected to be around version 86, but the exact number is
  whatever the highest-versioned required API demands.
- The required-API set is determined by auditing the modern DOM/JS APIs the
  component uses without a fallback (e.g. `replaceChildren`, and any others found).
  The exact list is an implementation detail; the requirement is that the set
  covers the APIs whose absence would otherwise cause a silent failure.
- The check is feature-detection based (testing for the presence of the APIs), not
  user-agent-string sniffing, so it is robust across browser brands and future
  versions; the warning text still refers to Chrome/Edge because those are the
  supported/target browsers for the training material.
- The warning replaces the component's own area (where the config table / rendered
  component would appear); it does not need to block or alter the rest of the host
  page.
- Wording is along the lines of: "To view this interactive analysis component, at
  least version XX of Chrome/Edge is required. Please update your browser." Exact
  copy is a design detail.
- This feature does not add polyfills or attempt to make the component work on
  unsupported browsers; it only detects and warns.
