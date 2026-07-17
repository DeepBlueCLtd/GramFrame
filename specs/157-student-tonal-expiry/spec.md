# Feature Specification: Student Tonal Expiry (24-Hour Persistence Limit)

**Feature Branch**: `157-student-tonal-expiry`
**Created**: 2026-07-17
**Status**: Draft
**Input**: User description: "GH issue 184 — Reduce persistence of tonals for students"

## Background *(context)*

GramFrame persists a user's tonal annotations (analysis markers, harmonic sets, doppler curves) in browser storage so they survive page reloads. Two audiences are distinguished automatically:

- **Trainer/instructor pages** — annotations persist permanently (they build teaching material).
- **Student pages** — annotations persist only for the current browser session.

The problem reported for the P9/10 course: students may remain logged in for **several weeks** without closing the browser or shutting down the PC. Because student annotations currently survive for the whole browser session, they can accumulate for that entire period. When students are later **assessed**, they can navigate back to grams they previously annotated and read off the tonals they marked earlier — undermining the integrity of the assessment.

Instructors can work around this today only by forcing everyone to log off every few days. The requested improvement is to cap student annotation persistence at **24 hours**, with the existing ability for instructors to force an immediate reset by having students start a fresh session (log out and back in / close the browser).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Old student annotations do not resurface during assessment (Priority: P1)

A student annotated several grams during earlier lessons. Days later, during an assessment, they revisit those same grams hoping to reuse their earlier markings. Because more than 24 hours have passed since those annotations were last saved, the grams open clean — the earlier tonals are gone.

**Why this priority**: This is the core purpose of the issue — protecting assessment integrity. Without it, the feature delivers no value.

**Independent Test**: Create student-context annotations, simulate the passage of more than 24 hours since they were saved, reload the gram page, and confirm no annotations are restored and none remain in storage.

**Acceptance Scenarios**:

1. **Given** a student page with saved annotations whose last-saved time is more than 24 hours ago, **When** the page is reloaded, **Then** no annotations are displayed and the stored entry is removed.
2. **Given** a student page with saved annotations whose last-saved time is within the last 24 hours, **When** the page is reloaded, **Then** those annotations are restored and displayed as before.
3. **Given** a student page whose browser has stayed open continuously for more than 24 hours, **When** the student navigates back to a previously annotated gram (a page load), **Then** annotations older than 24 hours are not restored.

---

### User Story 2 - Instructors can force an immediate reset (Priority: P2)

An instructor wants all previously marked tonals cleared before an assessment without waiting for the 24-hour window. They ask students to start a fresh session (log out and log back in, or close and reopen the browser).

**Why this priority**: Provides instructors an immediate override, matching the workaround described in the issue. Builds on existing session-scoped behavior rather than introducing new mechanics.

**Independent Test**: Save student annotations, start a fresh browser session, reload the gram page, and confirm no annotations are restored.

**Acceptance Scenarios**:

1. **Given** a student page with saved annotations, **When** the student begins a fresh browser session and reopens the gram, **Then** no previously saved annotations are restored (regardless of the 24-hour window).

---

### User Story 3 - Trainer annotations remain permanent (Priority: P1)

An instructor building course material annotates grams on trainer pages and expects those annotations to remain available indefinitely across days and weeks.

**Why this priority**: The change must not regress the trainer workflow. Loss of trainer material would be a serious defect, so this is guarded at P1.

**Independent Test**: Create trainer-context annotations, simulate the passage of well over 24 hours, reload the trainer page, and confirm annotations are still restored.

**Acceptance Scenarios**:

1. **Given** a trainer page with saved annotations whose last-saved time is more than 24 hours ago, **When** the page is reloaded, **Then** all annotations are restored and displayed.

---

### Edge Cases

- **Boundary**: Annotations saved exactly at the 24-hour mark are treated consistently (see FR-002 — the window is "more than 24 hours"). Just under 24 hours restores; just over discards.
- **Missing or unreadable timestamp**: A stored student entry with no valid last-saved time, or an unparseable value, is treated as expired and discarded (fail safe toward clearing).
- **Future / skewed timestamp**: If the recorded last-saved time is in the future (e.g., the system clock was changed), the entry is treated as expired and discarded rather than kept indefinitely.
- **Re-saving refreshes the window**: If a student edits and re-saves annotations on a gram, the 24-hour countdown restarts from the new save — actively worked-on grams stay available; untouched ones age out.
- **Multiple grams on one page**: Each stored entry ages independently based on its own last-saved time.
- **Storage unavailable**: If browser storage cannot be read, the page opens with no restored annotations (existing behavior, no error surfaced to the student).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST record, for each stored student annotation set, the time it was last saved, so its age can be evaluated on load.
- **FR-002**: When a gram page loads in student context, the system MUST treat a stored annotation set as expired if more than 24 hours have elapsed since it was last saved.
- **FR-003**: Expired student annotation sets MUST NOT be restored or displayed, and MUST be removed from storage during the load.
- **FR-004**: Student annotation sets that are within the 24-hour window MUST continue to be restored and displayed on reload, exactly as they are today.
- **FR-005**: Saving or modifying a student's annotations MUST reset the 24-hour window by updating the recorded last-saved time.
- **FR-006**: Trainer-context annotations MUST continue to persist indefinitely; the 24-hour expiry MUST NOT apply to them.
- **FR-007**: The 24-hour expiry MUST be enforced on page load even when the browser session has not ended (i.e., a browser or tab left open beyond 24 hours still results in expiry the next time the annotated gram is loaded).
- **FR-008**: A fresh browser session MUST continue to start with no restored student annotations, preserving the instructor's ability to force an immediate reset by having students log out and back in / reopen the browser.
- **FR-009**: A stored student entry whose last-saved time is missing, unparseable, or in the future MUST be treated as expired and discarded.

### Key Entities *(include if feature involves data)*

- **Stored Annotation Set**: The persisted collection of a page's tonal annotations (analysis markers, harmonic sets, doppler curve) together with a **last-saved timestamp** and the persistence context (student vs trainer). The timestamp and context together determine, on load, whether the set is restored or discarded.
- **Persistence Context**: The trainer-vs-student classification already derived for each page. Trainer context = indefinite persistence; student context = 24-hour expiry plus session scope.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A student who annotated a gram more than 24 hours earlier sees that gram open with no previously marked tonals when they revisit it.
- **SC-002**: A student who annotated a gram within the last 24 hours (same browser session) still sees those annotations restored on reload — no loss of recent work.
- **SC-003**: Trainer annotations remain visible after an arbitrary elapsed time (days or weeks) with a 100% restoration rate — zero regression to the trainer workflow.
- **SC-004**: Instructors can guarantee a clean slate for all students before an assessment by directing a fresh-session restart, with no previously marked tonals surviving that restart.
- **SC-005**: No student-facing errors or warnings are produced when stored annotations expire or are discarded — the gram simply opens clean.

## Assumptions

- Expiry is evaluated on page load (and when annotations are read from storage), not via a background timer; a gram left open in the browser is not forcibly cleared mid-view, but the age check applies the next time it is loaded. This matches the assessment scenario, where revisiting a gram is a page load.
- The 24-hour window is measured from the **last time the annotation set was saved**, not from first creation, so ongoing work refreshes the window. This is a reasonable default given the issue's wording ("persistent for 24 hours"); actively worked-on grams should not disappear while a student is still using them.
- The 24-hour duration is a fixed policy value defined by this feature (per the issue); it is not exposed as an end-user setting.
- Existing session-scoped behavior for student pages is retained; the 24-hour cap is an additional constraint that can only shorten, never extend, how long student annotations survive.
- Trainer/student context detection is unchanged and out of scope for this feature; this feature only changes how long student-context data survives.
- The stored data format already carries (or can carry) a save timestamp, so this feature does not require students to re-annotate existing grams; entries lacking a usable timestamp are simply treated as expired.
