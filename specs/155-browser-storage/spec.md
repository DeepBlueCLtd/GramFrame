# Feature Specification: Store User Contributions in Browser Storage

**Feature Branch**: `155-browser-storage`
**Created**: 2026-03-27
**Status**: Draft
**Input**: User description: "Store user contributions in browser-storage" (GitHub Issue #159)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Trainer Annotations Persist Across Page Reloads (Priority: P1)

A trainer adds annotations (cursors, harmonics, doppler markers) to a spectrogram image. They click a link to view the Analysis page, then navigate back. Their annotations are still visible on the gram, exactly as they left them. The next time they open the same gram page (even days later), their annotations are restored automatically.

**Why this priority**: This is the core problem described in the issue. Trainers lose their work when navigating away from a gram page. Solving this eliminates the most frustrating workflow interruption.

**Independent Test**: Can be fully tested by adding annotations to a gram, reloading the page, and verifying annotations reappear. Delivers immediate value by preventing data loss.

**Acceptance Scenarios**:

1. **Given** a trainer has added cursors to a gram, **When** they reload the page, **Then** all cursors are restored in their original positions
2. **Given** a trainer has added harmonics to a gram, **When** they navigate away and return, **Then** harmonics are restored
3. **Given** a trainer has added doppler markers to a gram, **When** they close and reopen the browser, **Then** doppler markers are restored
4. **Given** a trainer opens a gram they annotated previously, **When** the page loads, **Then** annotations are silently restored without any prompt or confirmation dialog

---

### User Story 2 - Student Annotations Persist Within a Session (Priority: P2)

A student adds cursors to a spectrogram during a training exercise. They click a help link, then navigate back. Their annotations are still there for the duration of their browser session. When they close the browser entirely, their annotations are automatically cleared — so the next student using the same PC starts with a clean slate.

**Why this priority**: Students also lose work when navigating away, but their annotations are temporary by nature (training exercises). Session-scoped persistence solves the navigation problem without creating a shared-PC contamination risk.

**Independent Test**: Can be fully tested by adding annotations, navigating away and back within the same browser session, and verifying annotations persist. Then close and reopen the browser to verify annotations are gone.

**Acceptance Scenarios**:

1. **Given** a student has added cursors to a gram, **When** they navigate to another page and press back, **Then** cursors are restored
2. **Given** a student has added annotations, **When** they close the browser and reopen the same page, **Then** no annotations are present (clean slate)
3. **Given** a student on a shared PC, **When** a new student opens the same gram in a new browser session, **Then** they see no annotations from previous users

---

### User Story 3 - Trainer Clears Stored Annotations (Priority: P3)

A trainer wants to start fresh on a gram they previously annotated. They click a "Clear gram" button, and all stored annotations for that page are removed immediately. The gram returns to its unannotated state.

**Why this priority**: Once persistence is in place, trainers need a way to reset. Without this, outdated annotations could become confusing. Lower priority because it's a supporting action, not the core workflow.

**Independent Test**: Can be fully tested by adding annotations, verifying they persist, clicking "Clear gram", and confirming annotations are removed and do not reappear on reload.

**Acceptance Scenarios**:

1. **Given** a trainer page with stored annotations, **When** the trainer clicks "Clear gram", **Then** all annotations are removed from the display and from storage
2. **Given** a trainer has cleared a gram, **When** they reload the page, **Then** no annotations are restored
3. **Given** a student page, **When** the page loads, **Then** no "Clear gram" button is visible (students don't need it since their storage is session-scoped)

---

### Edge Cases

- What happens when browser storage is full or unavailable (e.g., private browsing mode)? The system should degrade gracefully — annotations work normally but are not persisted, and no errors are shown to the user.
- What happens when stored data has an unrecognised schema version? The stored data should be discarded silently and a console warning logged, so the user starts fresh.
- What happens when the same gram page is open in multiple browser tabs? Each tab should read the latest stored state on load; concurrent editing across tabs is not a goal.
- What happens when a gram page has no annotations yet? No storage entry should be created until the user makes their first annotation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST automatically save all user annotations (cursors, harmonics, dopplers) whenever an annotation is added, moved, or removed
- **FR-002**: System MUST automatically restore saved annotations when a gram page is loaded, without requiring user action or displaying a prompt
- **FR-003**: System MUST distinguish between trainer and student contexts by detecting the presence of a link with the exact text "ANALYSIS" on the page
- **FR-004**: System MUST use permanent browser storage for trainer pages, so annotations survive browser restarts
- **FR-005**: System MUST use session-scoped browser storage for student pages, so annotations are cleared when the browser is closed
- **FR-006**: System MUST use the current page path as the storage key, prefixed with a namespace to avoid collisions with other storage consumers
- **FR-007**: System MUST include a schema version in stored data to enable safe migration; unrecognised versions cause stored data to be discarded with a console warning
- **FR-008**: System MUST provide a "Clear gram" button on trainer pages that removes all stored annotations for the current page and resets the display
- **FR-009**: System MUST NOT display the "Clear gram" button on student pages
- **FR-010**: System MUST degrade gracefully when browser storage is unavailable (e.g., private browsing, storage quota exceeded) — annotations function normally but are not persisted

### Key Entities

- **Annotation Set**: A collection of all user contributions for a single gram page, containing cursors, harmonics, and doppler markers, along with a schema version and timestamp
- **Storage Key**: A namespaced identifier derived from the current page path, used to store and retrieve the annotation set
- **User Context**: The determination of whether the current user is a trainer or student, based on page content (presence of "ANALYSIS" link)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Trainers can navigate away from a gram page and return to find 100% of their annotations restored, with no manual save/load steps required
- **SC-002**: Students on shared PCs never see annotations from a previous user's browser session
- **SC-003**: Annotations are saved within 1 second of any user interaction (add, move, remove)
- **SC-004**: Trainers can clear all annotations for a gram with a single click
- **SC-005**: The system functions correctly (without errors or broken UI) even when browser storage is unavailable

## Assumptions

- Trainer pages are reliably identified by the presence of an anchor element with exact text "ANALYSIS" (controlled by DITA audience filtering)
- The application is deployed as file-based pages (using `file://` protocol or a simple web server), so page path is a stable identifier
- No changes to the DITA source or OxygenXML publishing configuration are required
- TTL-based expiry of stored data is not needed (session-scoped storage for students and manual "Clear gram" for trainers are sufficient)
- A "Clear all" button (clearing annotations across all gram pages) is not needed for the initial implementation
- Browser storage capacity is sufficient for annotation data (annotation JSON payloads are small)
