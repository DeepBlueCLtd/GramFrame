#!/usr/bin/env node
/**
 * Assert that the shipped bundle stays within the browser floor the runtime
 * compatibility guard advertises (R9-06, issue #258).
 *
 * `vite.config.js` pins `build.target` to `chrome${MIN_BROWSER_VERSION}`, so
 * esbuild lowers anything newer. This check is the belt to that braces: a
 * bundler upgrade, a `target` regression, or a hand-edited artifact would all
 * silently reintroduce something the floor cannot handle, and the worst case is
 * the component's worst failure mode -- a parse error kills the whole IIFE
 * before `browserCompatibility.js` can run, so the analyst gets a blank page
 * with no message at all, on exactly the machine the guard exists for.
 *
 * Deliberately pattern-based rather than a real parse: Node cannot be asked to
 * parse "as Chrome 86", and the failure classes that matter are a short, known
 * list.
 *
 * Usage: node scripts/check-bundle-floor.js [path-to-bundle]
 */

import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MIN_BROWSER_VERSION } from '../src/core/browserCompatibility.js'

/**
 * A feature newer than the component's long-standing baseline.
 * @typedef {Object} PostBaselineFeature
 * @property {string} name - What it is, in the message the developer will read
 * @property {number} minVersion - Chrome/Edge version that introduced it
 * @property {'syntax' | 'api'} kind - How it fails below that version
 * @property {RegExp} pattern - Conservative match against bundle source
 */

/**
 * Features to look for, with the Chrome/Edge version each needs.
 *
 * `kind: 'syntax'` is the catastrophic class: a parse error stops the entire
 * IIFE, so the guard never runs and nothing is shown. `kind: 'api'` is
 * narrower -- the script parses and the guard still runs, but the call throws
 * at the moment it is reached.
 *
 * Only entries whose `minVersion` exceeds the floor are enforced, so raising
 * `MIN_BROWSER_VERSION` relaxes this check automatically instead of needing a
 * second edit here. Patterns are deliberately conservative: a false failure in
 * a gate costs more than a narrow net, so anything that cannot be matched
 * without ambiguity is left out rather than guessed at -- an `Error` `cause`
 * option is indistinguishable from any object literal with a `cause` key, and
 * a RegExp `d` flag from a quoted slash.
 * @type {PostBaselineFeature[]}
 */
export const POST_BASELINE_FEATURES = [
  // Syntax — a parse error takes the whole bundle down with it.
  { name: 'logical assignment (??=)', minVersion: 85, kind: 'syntax', pattern: /\?\?=/ },
  { name: 'logical assignment (||=)', minVersion: 85, kind: 'syntax', pattern: /\|\|=/ },
  { name: 'logical assignment (&&=)', minVersion: 85, kind: 'syntax', pattern: /&&=/ },
  { name: 'class static initialisation block', minVersion: 94, kind: 'syntax', pattern: /\bstatic\s*\{/ },
  { name: 'ergonomic brand check (#x in obj)', minVersion: 91, kind: 'syntax', pattern: /#[A-Za-z_$][\w$]*\s+in\s/ },

  // APIs — the script parses, the guard runs, and the call throws when reached.
  { name: 'Array.prototype.at', minVersion: 92, kind: 'api', pattern: /\.at\s*\(\s*-?\d/ },
  { name: 'Object.hasOwn', minVersion: 93, kind: 'api', pattern: /\bObject\s*\.\s*hasOwn\s*\(/ },
  { name: 'structuredClone', minVersion: 98, kind: 'api', pattern: /\bstructuredClone\s*\(/ },
  { name: 'Array.prototype.findLast', minVersion: 97, kind: 'api', pattern: /\.findLast(Index)?\s*\(/ },
  { name: 'String.prototype.replaceAll', minVersion: 85, kind: 'api', pattern: /\.replaceAll\s*\(/ },
  { name: 'Promise.any', minVersion: 85, kind: 'api', pattern: /\bPromise\s*\.\s*any\s*\(/ }
]

/**
 * Which post-baseline features a floor actually enforces.
 * @param {number} floor - The advertised minimum Chrome/Edge version
 * @returns {PostBaselineFeature[]} Features newer than the floor
 */
export function enforcedFeatures(floor) {
  return POST_BASELINE_FEATURES.filter(feature => feature.minVersion > floor)
}

/**
 * Find the features a source uses that its floor cannot support.
 * @param {string} source - Bundle source
 * @param {number} floor - The advertised minimum Chrome/Edge version
 * @returns {PostBaselineFeature[]} Violations, empty when the source is within the floor
 */
export function findFloorViolations(source, floor) {
  return enforcedFeatures(floor).filter(feature => feature.pattern.test(source))
}

/**
 * Run the check over a bundle file and report.
 * @param {string} bundlePath - Absolute path to the bundle
 * @param {string} repoRoot - Repository root, for readable paths
 * @returns {number} Process exit code
 */
function run(bundlePath, repoRoot) {
  if (!existsSync(bundlePath)) {
    console.error(`✖ Bundle not found: ${relative(repoRoot, bundlePath)}`)
    console.error('  Run `yarn build:standalone` first.')
    return 1
  }

  const bundle = readFileSync(bundlePath, 'utf8')
  const violations = findFloorViolations(bundle, MIN_BROWSER_VERSION)

  console.log(`Browser floor: Chrome/Edge ${MIN_BROWSER_VERSION} (derived from REQUIRED_APIS)`)
  console.log(`Bundle:        ${relative(repoRoot, bundlePath)} (${bundle.length} bytes)`)
  console.log(`Checked:       ${enforcedFeatures(MIN_BROWSER_VERSION).length} post-floor features`)

  if (violations.length > 0) {
    console.error('')
    console.error('✖ The bundle uses syntax or APIs newer than the advertised browser floor:')
    for (const violation of violations) {
      const line = bundle.slice(0, bundle.search(violation.pattern)).split('\n').length
      const effect = violation.kind === 'syntax'
        ? 'parse error — the whole bundle fails to load'
        : 'throws when the call is reached'
      console.error(`  - ${violation.name} (needs Chrome ${violation.minVersion}; ${effect}) — around line ${line}`)
    }
    console.error('')
    console.error('  A parse error stops the whole IIFE before the compatibility guard runs, so')
    console.error('  the analyst sees a blank page with no message at all. Either avoid the')
    console.error('  feature, or raise MIN_BROWSER_VERSION in src/core/browserCompatibility.js')
    console.error('  if the deployment really has moved on.')
    return 1
  }

  console.log('')
  console.log('✔ Bundle stays within the advertised browser floor.')
  return 0
}

// CLI entry point. Importing this module (the unit lane does) must not run it.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)))
  const target = process.argv[2]
    ? join(repoRoot, process.argv[2])
    : join(repoRoot, 'dist', 'gramframe.bundle.js')
  process.exit(run(target, repoRoot))
}
