// @vitest-environment node
/**
 * Unit lane for the bundle browser-floor check (R9-06, issue #258).
 *
 * The check itself runs in CI against the built artifact; these cover the
 * logic behind it, so a pattern that never matches — or one that matches
 * ordinary code — is caught in two seconds rather than by a silent pass.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  POST_BASELINE_FEATURES,
  enforcedFeatures,
  findFloorViolations
} from '../../scripts/check-bundle-floor.js'
import { MIN_BROWSER_VERSION } from '../../src/core/browserCompatibility.js'

/**
 * Read a source file from the repository.
 * @param {string} relativePath - Path relative to the repository root
 * @returns {string} File contents
 */
function readSource(relativePath) {
  return readFileSync(fileURLToPath(new URL(`../../${relativePath}`, import.meta.url)), 'utf8')
}

/** One sample of each feature, to prove the pattern actually matches it. */
const SAMPLES = {
  'logical assignment (??=)': 'a ??= b',
  'logical assignment (||=)': 'a ||= b',
  'logical assignment (&&=)': 'a &&= b',
  'class static initialisation block': 'class A { static { this.x = 1 } }',
  'ergonomic brand check (#x in obj)': 'class A { static has(o) { return #x in o } }',
  'Array.prototype.at': 'const last = items.at(-1)',
  'Object.hasOwn': 'if (Object.hasOwn(o, "k")) {}',
  'structuredClone': 'const copy = structuredClone(value)',
  'Array.prototype.findLast': 'const hit = items.findLast(fn)',
  'String.prototype.replaceAll': 'const s = text.replaceAll("a", "b")',
  'Promise.any': 'await Promise.any(tasks)'
}

describe('the post-baseline feature table', () => {
  it('has a working pattern and a sample for every entry', () => {
    for (const feature of POST_BASELINE_FEATURES) {
      const sample = SAMPLES[feature.name]
      expect(sample, `no sample for "${feature.name}"`).toBeTruthy()
      expect(feature.pattern.test(sample), `pattern for "${feature.name}" does not match its own sample`).toBe(true)
    }
  })

  it('does not fire on the ordinary code this repository is made of', () => {
    // The floor check is a gate: a false positive blocks a release for nothing.
    // Run every pattern — not only the enforced ones — over real source.
    const sources = [
      readSource('src/main.js'),
      readSource('src/core/storage.js'),
      readSource('src/rendering/axes.js'),
      readSource('src/utils/coordinates.js')
    ].join('\n')

    for (const feature of POST_BASELINE_FEATURES) {
      expect(feature.pattern.test(sources), `"${feature.name}" false-positives on repository source`).toBe(false)
    }
  })

  it('names the failure mode of every entry', () => {
    for (const feature of POST_BASELINE_FEATURES) {
      expect(['syntax', 'api']).toContain(feature.kind)
      expect(feature.minVersion).toBeGreaterThan(0)
    }
  })
})

describe('enforcement follows the advertised floor', () => {
  it('enforces only what the floor cannot support', () => {
    for (const feature of enforcedFeatures(MIN_BROWSER_VERSION)) {
      expect(feature.minVersion).toBeGreaterThan(MIN_BROWSER_VERSION)
    }
  })

  it('relaxes as the floor rises and tightens as it falls', () => {
    // Raising MIN_BROWSER_VERSION must not need a second edit in the table.
    expect(enforcedFeatures(200)).toHaveLength(0)
    expect(enforcedFeatures(0)).toHaveLength(POST_BASELINE_FEATURES.length)
  })

  it('catches a violation and reports which feature', () => {
    const violations = findFloorViolations('const last = items.at(-1); const c = structuredClone(v)', MIN_BROWSER_VERSION)
    expect(violations.map(v => v.name).sort()).toEqual(['Array.prototype.at', 'structuredClone'])
  })

  it('passes clean source', () => {
    expect(findFloorViolations('const a = b ?? c; const d = e?.f', MIN_BROWSER_VERSION)).toHaveLength(0)
  })
})

describe('the build target is pinned to the advertised floor', () => {
  it('vite.config.js derives its target rather than hardcoding one', () => {
    const config = readSource('vite.config.js')
    expect(config).toContain("import { MIN_BROWSER_VERSION } from './src/core/browserCompatibility.js'")
    expect(config).toContain('const buildTarget = `chrome${MIN_BROWSER_VERSION}`')
    // Both branches — the standalone IIFE and the standard build.
    expect(config.match(/target: buildTarget/g) || []).toHaveLength(2)
  })
})
