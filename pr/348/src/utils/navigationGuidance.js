/**
 * Shared on-screen guidance describing the navigation gestures that work in
 * every interaction mode.
 *
 * Wheel zoom/pan, the wheel-button drag and Shift + drag region zoom are all
 * resolved centrally, ahead of mode delegation, so they behave the same
 * whichever mode the analyst is in — so they are shown in every mode's guidance
 * (spec 160, FR-012; spec 170, FR-016), appended beneath the mode's own lines by
 * `withNavigationGuidance` in `utils/guidanceContent.js`. They used to appear
 * only under Pan, the initial mode, because the old control row had height for
 * them nowhere else; an analyst who armed Cross Cursor first never met them.
 *
 * That they apply everywhere rides the section TITLE rather than a line of its
 * own, so the note costs the column no row.
 * @type {import('./guidanceContent.js').GuidanceItem[]}
 */
export const NAVIGATION_GUIDANCE = [
  { trigger: 'Shift + drag', outcome: 'a box to zoom into that region' },
  { trigger: 'Ctrl + scroll', outcome: 'to zoom around the pointer' },
  { trigger: 'Scroll', outcome: 'to pan when zoomed in' },
  { trigger: 'Wheel-button drag', outcome: 'to pan when zoomed in' }
]
