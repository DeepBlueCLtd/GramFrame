/**
 * Shared on-screen guidance describing the global mouse-wheel navigation
 * interactions.
 *
 * Wheel zoom/pan and wheel-button drag work in every interaction mode, so the
 * same lines are surfaced in each mode's guidance panel (spec 160, FR-012).
 * @type {string[]}
 */
export const WHEEL_NAV_GUIDANCE = [
  'Ctrl + scroll to zoom in/out around the pointer',
  'Scroll to pan (when zoomed in)',
  'Wheel-button drag to pan (when zoomed in)'
]
