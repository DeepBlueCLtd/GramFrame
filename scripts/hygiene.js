#!/usr/bin/env node
/**
 * Debt-ratchet hygiene check (spec 164, GF-33/GF-27).
 *
 * Compares three measured counts against the committed baselines in
 * hygiene-baselines.json and exits non-zero if any count EXCEEDS its
 * baseline:
 *   - circular dependencies in the src/ import graph (madge)
 *   - modules with unused exports (ts-unused-exports)
 *   - waitForTimeout occurrences under tests/
 *
 * Counts below baseline pass with a reminder to lower the baseline in the
 * same PR, so the ratchet only ever tightens.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import madge from 'madge'
import { analyzeTsConfig } from 'ts-unused-exports'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const baselines = JSON.parse(readFileSync(join(root, 'hygiene-baselines.json'), 'utf8'))

/** Recursively collect .js files under a directory. */
function jsFilesUnder(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...jsFilesUnder(full))
    else if (entry.endsWith('.js')) out.push(full)
  }
  return out
}

function countWaitForTimeout() {
  let count = 0
  const perFile = []
  for (const file of jsFilesUnder(join(root, 'tests'))) {
    const matches = readFileSync(file, 'utf8').match(/waitForTimeout/g)
    if (matches) {
      count += matches.length
      perFile.push(`${file.slice(root.length + 1)}: ${matches.length}`)
    }
  }
  return { count, perFile }
}

const failures = []
const notes = []

function check(name, actual, baseline, detail) {
  if (actual > baseline) {
    failures.push(`${name}: ${actual} exceeds baseline ${baseline}${detail ? `\n${detail}` : ''}`)
  } else if (actual < baseline) {
    notes.push(`${name}: ${actual} is BELOW baseline ${baseline} — lower the baseline in hygiene-baselines.json in this PR`)
  } else {
    notes.push(`${name}: ${actual} (at baseline)`)
  }
}

const graph = await madge(join(root, 'src/index.js'))
const cycles = graph.circular()
check(
  'circular dependencies',
  cycles.length,
  baselines.circularDependencies,
  cycles.map((c, i) => `  ${i + 1}) ${c.join(' > ')}`).join('\n')
)

const unused = analyzeTsConfig(join(root, 'tsconfig.json'))
const unusedModules = Object.keys(unused.unusedExports ?? unused)
check(
  'modules with unused exports',
  unusedModules.length,
  baselines.unusedExportModules,
  unusedModules.map((m) => `  ${m}`).join('\n')
)

const wft = countWaitForTimeout()
check('waitForTimeout occurrences in tests/', wft.count, baselines.waitForTimeout, wft.perFile.map((l) => `  ${l}`).join('\n'))

for (const note of notes) console.log(`✓ ${note}`)
if (failures.length) {
  for (const failure of failures) console.error(`✗ ${failure}`)
  console.error('\nHygiene ratchet failed: this change increases tracked debt. Remove the regression (preferred) — do not raise a baseline without review sign-off.')
  process.exit(1)
}
console.log('Hygiene ratchet passed.')
