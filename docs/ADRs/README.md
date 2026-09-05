# Architecture Decision Records

Each ADR records one decision, why it was taken, and what it cost. They are
historical: a superseded ADR stays in place with a pointer to its replacement
rather than being edited into agreement with today's code.

| ADR | Decision | Status |
|-----|----------|--------|
| [001](ADR-001-SVG-Based-Rendering.md) | SVG-based rendering | Accepted |
| [002](ADR-002-Multiple-Coordinate-Systems.md) | Multiple coordinate systems | Accepted |
| [003](ADR-003-Responsive-Design-ResizeObserver.md) | Responsive design via ResizeObserver | Accepted |
| [004](ADR-004-Centralized-State-Management.md) | Centralized state management | Accepted |
| [005](ADR-005-HTML-Table-Configuration.md) | HTML table configuration | Accepted |
| [006](ADR-006-Hot-Module-Reload-Support.md) | Hot module reload support | Accepted |
| [007](ADR-007-JSDoc-TypeScript-Integration.md) | JSDoc + TypeScript checking | Accepted |
| [008](ADR-008-Modular-Mode-System.md) | Modular mode system | Accepted |
| [009](ADR-009-Legacy-Configuration-Structure.md) | Legacy configuration structure | Accepted |
| [010](ADR-010-Unminified-Production-Build.md) | Unminified production build | Accepted |
| [011](ADR-011-Feature-Renderer-Cross-Mode-Coordination.md) | FeatureRenderer cross-mode coordination | Accepted |
| [012](ADR-012-Scale-Adjusted-Font-Sizing.md) | Scale-adjusted font sizing | Accepted |
| [013](ADR-013-File-Protocol-Compatibility.md) | `file://` protocol compatibility | Proposed |
| [014](ADR-014-Mode-State-Registration-Seam.md) | Mode state registration seam | Accepted |
| [015](ADR-015-Viewport-Based-Zoom.md) | Viewport (viewBox) based zoom | Superseded by 016 |
| [016](ADR-016-Image-Resize-Zoom.md) | Zoom by resizing the image element | Accepted |
| [017](ADR-017-Mode-Capability-Interfaces.md) | Mode capability interfaces | Accepted |
| [018](ADR-018-Table-Split.md) | Splitting `components/table.js` | Accepted |
| [019](ADR-019-Audio-Sourced-Instances.md) | Audio-sourced instances — the spectrograph player | Accepted |

## The gap at 014, since filled

ADR-014 did not exist for a long time, and no decision was missing: the number
was simply skipped when ADR-015 was written. Spec 167 used it for the mode state
registration seam rather than leaving it permanently unused. References to 015
and 016 are unaffected — nothing was renumbered. A new ADR takes the next free
number after the highest in use.

## Writing a new ADR

Copy the shape of an existing one: Status, Context, Decision, Consequences
(positive and negative), Related Decisions. State what is actually built. If a
decision is later reversed, add a Status line pointing at the ADR that
supersedes it and leave the rest of the text intact.
