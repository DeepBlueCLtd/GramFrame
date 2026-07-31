#!/usr/bin/env node
/**
 * Debt-ratchet hygiene check (specs/164-quality-ratchets).
 *
 * Compares the measured counts against the committed baselines in
 * hygiene-baseline.json and exits non-zero on any regression:
 *
 *   1. Circular dependencies in src/ (madge)
 *   2. Modules with unused exports (ts-unused-exports)
 *   3. `waitForTimeout` occurrences in tests/ (containment until Phase 2)
 *   4. `instance.state` reach-ins under src/ (spec 167 Story 5)
 *   5. Class-field declarations on GramFrame (spec 167 Story 5)
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

/**
 * Recursively collect every `.js` file under `src/`.
 * @param {string} dir
 * @returns {string[]}
 */
function collectSourceFiles(dir) {
  const files = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      files.push(...collectSourceFiles(full))
    } else if (full.endsWith('.js')) {
      files.push(full)
    }
  }
  return files
}

// --- 4 & 5. Instance surface (spec 167 Story 5) -----------------------------

const sourceFiles = collectSourceFiles(join(repoRoot, 'src'))

// Lines rather than occurrences, matching the baseline command in
// specs/167-structural-refactor/quickstart.md (`grep -rn … | wc -l`).
const reachInCounts = []
let reachInTotal = 0
for (const file of sourceFiles) {
  const count = readFileSync(file, 'utf8')
    .split('\n')
    .filter(line => line.includes('instance.state')).length
  if (count) {
    reachInCounts.push(`${relative(repoRoot, file)}: ${count}`)
    reachInTotal += count
  }
}
results.push({
  name: 'instance.state reach-ins (src/)',
  baseline: baseline.instanceStateReachIns,
  current: reachInTotal,
  detail: reachInCounts.sort((a, b) => Number(b.split(': ')[1]) - Number(a.split(': ')[1])),
})

// Class-field declarations between `export class GramFrame` and its
// constructor — the flat instance surface Story 5 groups into sub-objects.
const mainSource = readFileSync(join(repoRoot, 'src/main.js'), 'utf8').split('\n')
const classStart = mainSource.findIndex(line => line.startsWith('export class GramFrame'))
const ctorStart = mainSource.findIndex((line, i) => i > classStart && line.startsWith('  constructor'))
if (classStart === -1 || ctorStart === -1) {
  console.error('✖ Could not locate `export class GramFrame` and its constructor in src/main.js — the instanceFields ratchet cannot be measured.')
  process.exit(1)
}
const fieldDeclarations = mainSource
  .slice(classStart, ctorStart + 1)
  .filter(line => /^ {2}[a-zA-Z_]\w*\s*(;|=)/.test(line))
results.push({
  name: 'GramFrame class fields (src/main.js)',
  baseline: baseline.instanceFields,
  current: fieldDeclarations.length,
  detail: fieldDeclarations.map(line => line.trim()),
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
