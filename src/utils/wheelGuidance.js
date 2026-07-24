/**
 * Shared on-screen guidance describing the global mouse-wheel navigation
 * interactions.
 *
 * Wheel zoom/pan and wheel-button drag work in every interaction mode. Rather
 * than repeat these lines in each mode's guidance, they are shown once as the
 * "Mouse-Wheel" section of the initial (Pan) mode's guidance, noting that they
 * apply everywhere (spec 160, FR-012).
 * @type {string[]}
 */
export const WHEEL_NAV_GUIDANCE = [
  'Available in all modes',
  'Ctrl + scroll to zoom around the pointer',
  'Scroll to pan when zoomed in',
  'Wheel-button drag to pan when zoomed in'
]
