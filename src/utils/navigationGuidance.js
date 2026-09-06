/**
 * Shared on-screen guidance describing the navigation gestures that work in
 * every interaction mode.
 *
 * Wheel zoom/pan, the wheel-button drag and Shift + drag region zoom are all
 * resolved centrally, ahead of mode delegation, so they behave the same
 * whichever mode the analyst is in. Rather than repeat these lines in each
 * mode's guidance, they are shown once as the "Navigation" section of the
 * initial (Pan) mode's guidance (spec 160, FR-012; spec 170, FR-016). That they
 * apply everywhere rides the section TITLE rather than a line of its own — see
 * `PanMode.getGuidanceText` — so the note costs the control row no height.
 * @type {import('./guidanceContent.js').GuidanceItem[]}
 */
export const NAVIGATION_GUIDANCE = [
  { trigger: 'Shift + drag', outcome: 'a box to zoom into that region' },
  { trigger: 'Ctrl + scroll', outcome: 'to zoom around the pointer' },
  { trigger: 'Scroll', outcome: 'to pan when zoomed in' },
  { trigger: 'Wheel-button drag', outcome: 'to pan when zoomed in' }
]
