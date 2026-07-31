#!/usr/bin/env node
/**
 * Debt-ratchet hygiene check (specs/164-quality-ratchets).
 *
 * Compares three measured counts against the committed baselines in
 * hygiene-baseline.json and exits non-zero on any regression:
 *
 *   1. Circular dependencies in src/ (madge)
 *   2. Modules with unused exports (ts-unused-exports)
 *   3. `waitForTimeout` occurrences in tests/ (containment until Phase 2)
 *
 * A count below its baseline passes with a reminder to lower the baseline in
 * the same PR, so improvements get locked in as ordinary reviewed diffs.
 */

import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import madge from 'madge'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const baselinePath = join(repoRoot, 'hygiene-baseline.json')
const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))

/** @type {{name: string, baseline: number, current: number, detail: string[]}[]} */
const results = []

// --- 1. Circular dependencies (madge) --------------------------------------

const graph = await madge(join(repoRoot, 'src/index.js'), { fileExtensions: ['js'] })
const moduleCount = Object.keys(graph.obj()).length
if (moduleCount < 10) {
  // A parse failure makes madge silently return a near-empty graph with zero
  // cycles, which would read as a huge improvement. Treat it as an error.
  console.error(`✖ madge resolved only ${moduleCount} module(s) from src/index.js — the import graph looks broken (parse error?).`)
  process.exit(1)
}
const cycles = graph.circular()
results.push({
  name: 'Circular dependencies (madge, src/)',
  baseline: baseline.circularDependencies,
  current: cycles.length,
  detail: cycles.map((cycle, i) => `${i + 1}) ${cycle.join(' > ')}`),
})

// --- 2. Modules with unused exports (ts-unused-exports) ---------------------

const tueBin = join(repoRoot, 'node_modules', '.bin', 'ts-unused-exports')
let tueOutput
try {
  // Exits 1 whenever any unused export exists, so a non-zero exit still
  // carries the report on stdout.
  tueOutput = execFileSync(tueBin, ['tsconfig.json'], { cwd: repoRoot, encoding: 'utf8' })
} catch (err) {
  if (typeof err.stdout !== 'string' || err.stdout === '') throw err
  tueOutput = err.stdout
}
const tueModules = tueOutput
  .split('\n')
  .filter(line => line.includes(': '))
  .map(line => relative(repoRoot, line.trim()))
results.push({
  name: 'Modules with unused exports (ts-unused-exports)',
  baseline: baseline.unusedExportModules,
  current: tueModules.length,
  detail: tueModules,
})

// --- 3. waitForTimeout occurrences in tests/ --------------------------------

/**
 * Recursively collect every file under a directory. Deliberately not filtered
 * by extension so parked `.disabled` specs stay inside the ratchet too.
 * @param {string} dir
 * @returns {string[]}
 */
function collectTestFiles(dir) {
  const files = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      files.push(...collectTestFiles(full))
    } else {
      files.push(full)
    }
  }
  return files
}

const timeoutCounts = []
let timeoutTotal = 0
for (const file of collectTestFiles(join(repoRoot, 'tests'))) {
  const matches = readFileSync(file, 'utf8').match(/waitForTimeout/g)
  if (matches) {
    timeoutCounts.push(`${relative(repoRoot, file)}: ${matches.length}`)
    timeoutTotal += matches.length
  }
}
results.push({
  name: 'waitForTimeout occurrences (tests/)',
  baseline: baseline.waitForTimeoutOccurrences,
  current: timeoutTotal,
  detail: timeoutCounts,
})

// --- Report -----------------------------------------------------------------

let failed = false
let improvable = false
for (const { name, baseline: base, current, detail } of results) {
  if (current > base) {
    failed = true
    console.error(`\n✖ ${name}: ${current} (baseline ${base}) — regression!`)
    for (const line of detail) console.error(`    ${line}`)
    console.error('  Compare the list above with your diff to find the addition, and remove it.')
  } else if (current < base) {
    improvable = true
    console.log(`✔ ${name}: ${current} (baseline ${base}) — improved`)
  } else {
    console.log(`✔ ${name}: ${current} (baseline ${base})`)
  }
}

if (failed) {
  console.error('\nHygiene check failed: a debt count rose above its committed baseline.')
  console.error(`Baselines live in ${relative(repoRoot, baselinePath)}; they only ever go down.`)
  process.exit(1)
}
if (improvable) {
  console.log(`\nA count is below its baseline — lower it in ${relative(repoRoot, baselinePath)} in this PR to lock in the improvement.`)
}
console.log('\nHygiene check passed.')
