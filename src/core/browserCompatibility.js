/**
 * Browser-compatibility guard for GramFrame.
 *
 * GramFrame relies on a small number of modern DOM/JS APIs that are newer than
 * the legacy baseline (Chrome/Edge 84). On an out-of-date browser these calls
 * throw during rendering and the component silently fails, leaving the analyst
 * with a blank or half-rendered area and no explanation.
 *
 * This module feature-detects the required APIs *before* any rendering happens
 * and, when the browser is unsupported, replaces the component's area with a
 * plain, readable "please update your browser" message instead.
 *
 * IMPORTANT: the detection code in this file must not itself use any API that
 * is absent on the browsers it is meant to catch, or it would reproduce the
 * very silent failure it exists to prevent. It therefore sticks to long-baseline
 * DOM APIs only (document.createElement, textContent, appendChild, ...).
 */

/// <reference path="../types.js" />

/**
 * @typedef {Object} RequiredApi
 * @property {string} name - Human-readable API identifier (for debugging/tests)
 * @property {number} minVersion - Minimum Chrome/Edge version that ships this API
 * @property {function(): boolean} test - Presence test; must not throw on legacy browsers
 */

/**
 * The set of modern JS/DOM capabilities GramFrame depends on without a fallback.
 *
 * Presence of all of them is the pass condition; absence of any is the fail
 * condition. To add a newly-relied-upon API, append an entry here with the
 * Chrome/Edge version that introduced it — the minimum supported version in the
 * warning is derived from the highest `minVersion` in this list.
 *
 * @type {RequiredApi[]}
 */
export const REQUIRED_APIS = [
  {
    // Element.replaceChildren() shipped in Chrome/Edge 86. Its absence on
    // Chrome 84 is the original silent failure this feature guards against
    // (used by src/utils/secureHTML.js and src/components/HarmonicPanel.js).
    name: 'Element.prototype.replaceChildren',
    minVersion: 86,
    test: function () {
      return typeof Element !== 'undefined' &&
        !!Element.prototype &&
        typeof Element.prototype.replaceChildren === 'function'
    }
  }
]

/**
 * Minimum supported Chrome/Edge version, derived from the required-API set: it
 * is the highest browser version any required API needs. Stated in the warning
 * so an analyst (or their IT support) knows exactly what to update to.
 * @type {number}
 */
export const MIN_BROWSER_VERSION = REQUIRED_APIS.reduce(function (max, api) {
  return api.minVersion > max ? api.minVersion : max
}, 0)

/**
 * Names of any required APIs that are missing in the current browser.
 * @returns {string[]} Missing API names (empty when the browser is supported)
 */
export function getMissingApis() {
  var missing = []
  for (var i = 0; i < REQUIRED_APIS.length; i++) {
    var api = REQUIRED_APIS[i]
    var present = false
    try {
      present = !!api.test()
    } catch (e) {
      present = false
    }
    if (!present) {
      missing.push(api.name)
    }
  }
  return missing
}

/**
 * Feature-detect whether the current browser has every API GramFrame requires.
 * Partial support (some APIs present, others missing) counts as unsupported.
 * @returns {boolean} True when all required APIs are present
 */
export function isBrowserSupported() {
  return getMissingApis().length === 0
}

/**
 * The user-facing compatibility message. Names the minimum supported version
 * and asks the user to update. The wording refers to Chrome/Edge because those
 * are the supported/target browsers for the training material, even though the
 * underlying guard is feature-detection based rather than brand sniffing.
 * @returns {string} Human-readable warning message
 */
export function getCompatibilityMessage() {
  return 'To view this interactive analysis component, at least version ' +
    MIN_BROWSER_VERSION + ' of Chrome or Edge is required. ' +
    'Please update your browser.'
}

/**
 * Build the warning element shown in place of the component on an unsupported
 * browser. Uses only long-baseline DOM APIs so it renders on the legacy
 * browsers this feature targets.
 * @returns {HTMLDivElement} The warning element
 */
export function createCompatibilityWarningElement() {
  var warning = document.createElement('div')
  warning.className = 'gram-frame-compat-warning'
  warning.setAttribute('role', 'alert')

  var heading = document.createElement('strong')
  heading.className = 'gram-frame-compat-warning-heading'
  heading.textContent = 'This interactive component needs a newer browser'

  var message = document.createElement('p')
  message.className = 'gram-frame-compat-warning-message'
  message.textContent = getCompatibilityMessage()

  warning.appendChild(heading)
  warning.appendChild(message)

  return warning
}

/**
 * Replace a GramFrame config table with the compatibility warning, in place, so
 * the analyst sees the message exactly where the component would have appeared.
 * @param {HTMLElement} configTable - The config table to replace
 * @returns {HTMLDivElement|null} The inserted warning element, or null if the
 *   table could not be replaced
 */
export function showCompatibilityWarning(configTable) {
  if (!configTable || !configTable.parentNode) {
    return null
  }
  var warning = createCompatibilityWarningElement()
  configTable.parentNode.replaceChild(warning, configTable)
  return warning
}
