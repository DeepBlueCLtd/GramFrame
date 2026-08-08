/**
 * Shared on-screen guidance describing the global mouse-wheel navigation
 * interactions.
 *
 * Wheel zoom/pan and wheel-button drag work in every interaction mode. Rather
 * than repeat these lines in each mode's guidance, they are shown once as the
 * "Mouse-Wheel" section of the initial (Pan) mode's guidance (spec 160,
 * FR-012). That they apply everywhere rides the section TITLE rather than a
 * bullet of its own — see `PanMode.getGuidanceText` — so the note costs the
 * control row no height.
 * @type {string[]}
 */
export const WHEEL_NAV_GUIDANCE = [
  'Ctrl + scroll to zoom around the pointer',
  'Scroll to pan when zoomed in',
  'Wheel-button drag to pan when zoomed in'
]
