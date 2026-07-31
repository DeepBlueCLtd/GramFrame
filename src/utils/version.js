/**
 * Version constant for GramFrame.
 *
 * The version is injected from package.json at dev-server start and at build
 * time by the `__GRAMFRAME_VERSION__` define in vite.config.js — nothing writes
 * to this file. It used to be rewritten in place by scripts/generate-version.js
 * on every build and test run, which left the working tree dirty (GF-37).
 *
 * Outside Vite (a unit-test run, or a consumer bundling the source directly)
 * the define is absent and the version reads 'DEV'.
 */

/** @type {string} */
export const VERSION = typeof __GRAMFRAME_VERSION__ === 'string' ? __GRAMFRAME_VERSION__ : 'DEV'

/**
 * Get the current version of GramFrame
 * @returns {string} Version string from package.json, or 'DEV' outside a build
 */
export function getVersion() {
  return VERSION
}
