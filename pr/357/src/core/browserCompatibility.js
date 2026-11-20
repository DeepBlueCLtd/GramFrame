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
 * Several of this module's exports (REQUIRED_APIS, getMissingApis,
 * getCompatibilityMessage, createCompatibilityWarningElement) have no importer
 * in src/ — they are deliberate test-only seams, exercised by
 * tests/browser-compatibility.spec.js. The unused-export ratchet reports over
 * src/ only, so they show there rather than being credited to that spec.
 * MIN_BROWSER_VERSION is different: vite.config.js derives the build target
 * from it and tests/unit/bundle-floor.test.js checks the derivation (R9-06).
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
  },
  {
    // The spectrograph player (spec 168, FR-008) plays through an <audio>
    // element. Present since Chrome 3; listed so a browser without it gets the
    // warning rather than a player that cannot play.
    name: 'HTMLAudioElement',
    minVersion: 3,
    test: function () {
      return typeof HTMLAudioElement === 'function' || typeof HTMLAudioElement === 'object'
    }
  },
  {
    // The player encodes the analysed spectrogram as a PNG through a canvas
    // (spec 168, D6). Present since Chrome 1.
    name: 'HTMLCanvasElement.prototype.toDataURL',
    minVersion: 1,
    test: function () {
      return typeof HTMLCanvasElement !== 'undefined' &&
        !!HTMLCanvasElement.prototype &&
        typeof HTMLCanvasElement.prototype.toDataURL === 'function'
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
    } catch (_e) {
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
 * Error-message signatures a JS engine produces when code calls a method or
 * constructor the browser does not provide. Explicit feature detection can only
 * catch APIs we thought to list; this lets us also recognise the *class* of
 * "a required method is missing" at the point an even-older browser actually
 * throws it, so we can still show the compatibility warning rather than a blank
 * or broken area. Deliberately narrow: it matches missing-callable signatures
 * only, so a genuine logic bug (e.g. "cannot read properties of undefined")
 * does NOT get mislabelled as a browser problem.
 * @type {RegExp}
 */
var MISSING_CALLABLE_MESSAGE = /is not a function|is not a constructor|doesn't support|does not support|undefined is not a function/i

/**
 * Heuristic: does this error look like it was caused by the browser lacking a
 * required method/constructor (as opposed to a config-parsing or logic error)?
 * Used as a reactive safety net around component construction so that older
 * browsers missing an API we did not explicitly feature-detect still get the
 * "please update your browser" warning instead of failing silently.
 * @param {unknown} error - The thrown value to classify
 * @returns {boolean} True when the error resembles a missing-API failure
 */
export function looksLikeMissingApiError(error) {
  if (!error) {
    return false
  }
  // Treat the thrown value loosely; error shapes vary across engines.
  var err = /** @type {any} */ (error)
  // A missing method/constructor is reported as a TypeError across engines.
  var isTypeError = (typeof TypeError !== 'undefined' && err instanceof TypeError) ||
    err.name === 'TypeError'
  var message = err.message ? String(err.message) : String(err)
  return !!isTypeError && MISSING_CALLABLE_MESSAGE.test(message)
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
