# Research: Store User Contributions in Browser Storage

**Feature**: 155-browser-storage
**Date**: 2026-03-27

## R1: Storage API Selection (localStorage vs sessionStorage)

**Decision**: Use localStorage for trainer pages, sessionStorage for student pages.

**Rationale**: The issue explicitly identifies two user types with different persistence needs. Trainers need annotations to survive browser restarts (dedicated PCs). Students need annotations only for the current session to prevent contamination on shared PCs. The Web Storage API provides both storage types with identical interfaces, making a simple conditional selection sufficient.

**Alternatives considered**:
- IndexedDB: More powerful but overkill for small JSON payloads. Adds async complexity with no benefit.
- Cookies: Size-limited (4KB), sent with every HTTP request, poor fit for file:// deployments.
- Single storage type with TTL: Considered in the issue but rejected — session scoping for students is cleaner than expiry timers.

## R2: Trainer vs Student Detection

**Decision**: Detect trainer context by checking for an anchor element with exact text "ANALYSIS" on the page.

**Rationale**: The issue comment confirms that trainer pages already contain an `<a>` element with text "ANALYSIS" (controlled by DITA `audience="-trainee"` filter). This is a reliable, zero-configuration discriminator that requires no changes to the publishing pipeline.

**Alternatives considered**:
- URL pattern matching: Fragile, depends on deployment structure.
- Config table parameter: Would require DITA source changes (explicitly ruled out).
- Manual user toggle: Adds friction, easily forgotten.

## R3: Storage Key Strategy

**Decision**: Use `gramframe::` prefix + `window.location.pathname` as the storage key.

**Rationale**: The pathname is stable across sessions for file:// deployments. The `gramframe::` prefix avoids collisions with other localStorage consumers. For pages with multiple GramFrame instances, an instance index suffix will be appended (e.g., `gramframe::/path/to/page.html::0`).

**Alternatives considered**:
- Full URL (including hash/query): Could cause key fragmentation if URLs change slightly.
- Image URL as key: More specific but breaks if image path changes.
- Custom user-defined key via config table: Adds complexity for page authors.

## R4: Save Trigger Strategy

**Decision**: Save on every state change using the existing state listener pattern.

**Rationale**: GramFrame already has a `notifyStateListeners()` mechanism that fires on every state mutation. Registering a storage-save listener is the simplest integration point. State changes are infrequent (user interactions), so write frequency is not a concern. JSON.stringify of annotation data is sub-millisecond.

**Alternatives considered**:
- Debounced save: Unnecessary — state changes are already discrete user actions, not continuous.
- Save on page unload (beforeunload): Unreliable, especially on mobile browsers and file:// pages.
- Manual save button: Contradicts the spec requirement for automatic persistence.

## R5: Restore Timing

**Decision**: Restore saved state after DOM setup is complete but before the first render cycle.

**Rationale**: The GramFrame constructor follows a clear sequence: state init → DOM setup → mode infrastructure → event listeners → initial render. Restoring state after mode infrastructure is ready but before the first `notifyStateListeners()` call ensures annotations appear on first render without a visible flash.

**Alternatives considered**:
- Restore before mode init: Modes need their initial state structure in place; restoring too early could cause errors.
- Restore after full init: Would cause a visible flash as annotations appear after initial empty render.

## R6: Schema Versioning

**Decision**: Include a `version: 1` field in stored data. On load, if version is missing or unrecognised, discard data and log a console warning.

**Rationale**: As the annotation data structure evolves, old stored data may become incompatible. A version field enables future migration logic. For now, version mismatch simply discards data — safe and simple.

**Alternatives considered**:
- No versioning: Risks silent data corruption if structure changes.
- Full migration system: Premature for v1 — can be added when a second version is needed.

## R7: Graceful Degradation

**Decision**: Wrap all storage operations in try/catch. If storage is unavailable, annotations work normally but are not persisted. No user-visible error.

**Rationale**: Private browsing modes, storage quota exceeded, and security policies can all prevent storage access. The feature should be additive — its absence should never break the core annotation experience.

**Alternatives considered**:
- Feature detection with user notification: Adds UI complexity for an edge case. Users in private browsing likely expect no persistence.
- Fallback to in-memory storage: Provides no benefit over the existing behaviour (annotations already live in memory).

## R8: Multiple Instances on Same Page

**Decision**: Append a zero-based instance index to the storage key when multiple GramFrame instances exist on the same page.

**Rationale**: The spec and constitution require support for multiple independent instances per page. Each instance needs its own storage slot. The instance index corresponds to the order of `gram-config` tables in the DOM, which is stable across page loads.

**Alternatives considered**:
- Use image URL as differentiator: Could work but adds complexity if two instances use the same image.
- Require explicit instance IDs in config: Adds burden on page authors.
