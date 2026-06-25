# UI Contract: Expand Toggle Control

The contract the demonstrator and Playwright tests rely on. Class names are proposed and
may be refined in implementation, but the *behavioural* contract is fixed.

## Presence / gating

- The toggle MUST be rendered **only** when `imageDetails.naturalWidth > naturalHeight`
  (landscape). For portrait or square images it MUST NOT be present in the DOM.
- One toggle per GramFrame instance. Multiple instances on a page each have their own.

## DOM / structure

- A `<button>` element with a stable class (e.g. `gram-frame-expand-toggle`) appended to
  the instance's `.gram-frame-main-panel` (which is `position: relative`).
- Positioned absolutely at the **top-left of the image region**, offset so it does NOT
  overlap the left (time) axis labels.
- MUST expose its state for testing/assistive tech, e.g. `aria-pressed="true|false"` and
  an `aria-label` ("Expand image" / "Collapse image"). Distinct expand (⤢) vs collapse
  (⤡) affordance.
- Semi-transparent so it does not obscure the spectrogram.

## Behaviour

| Trigger | Precondition | Effect |
|---------|--------------|--------|
| Click toggle | `imageExpanded === false` | Compute available width/height; set `renderWidth/Height`; relayout; set `imageExpanded = true`; re-render features; update button to collapse state (`aria-pressed="true"`). |
| Click toggle | `imageExpanded === true` | Restore `renderWidth/Height` to natural; relayout; set `imageExpanded = false`; re-render features; update button to expand state (`aria-pressed="false"`). |
| Window/container resize | `imageExpanded === true` | Recompute available width/height; relayout to keep the image filling the space. |
| Window/container resize | `imageExpanded === false` | No expand-specific behaviour (existing reflow only). |

## Invariants the tests assert (maps to Success Criteria)

- **SC-001**: when expanded, rendered image width == component inner image-region width ±2px.
- **SC-002**: when expanded, rendered image height == computed `availableHeight` ±2px.
- **SC-003**: axis tick-label font size identical before vs after expand.
- **SC-004**: a known data point reports the same freq/time before expand and after expand
  (coordinate fidelity), including with zoom applied.
- **SC-005**: toggle absent for portrait image; present for landscape image.
- **SC-006**: after collapse, rendered image width/height == original natural dimensions exactly.
- **SC-007**: a feature placed before expanding sits at its original screen position and
  reports its original data coordinates after expand→collapse.

## Out of scope (explicit)

- No persistence of `imageExpanded` (not stored in localStorage/sessionStorage).
- No change to the `gram-config` HTML configuration contract.
- No aspect-ratio locking.
