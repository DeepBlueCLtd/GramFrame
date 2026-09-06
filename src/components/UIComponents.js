/**
 * UI Components for GramFrame
 *
 * What is left of the shared UI helpers after the control-row redesign: one
 * re-export. The flex-layout builders that lived here went with it — they set
 * inline `display`, `flex-direction` and `gap` on elements the stylesheet now
 * governs, and an inline style cannot be overridden by a rule, so each one was
 * a small hole in the layout's own CSS. `createLEDDisplay` went too: its two
 * callers take it from `LEDDisplay.js` directly, and a pass-through nothing
 * passes through is just a second name for the same function.
 */

/// <reference path="../types.js" />

import { updateLEDDisplays } from './LEDDisplay.js'

// Re-exported because its importers take it from this module rather than
// reaching into the component module itself.
export { updateLEDDisplays }

// Frequency-rate input UI component removed - the backend frequencyRate is preserved
