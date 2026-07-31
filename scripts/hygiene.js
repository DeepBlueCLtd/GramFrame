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
 *   4. Strict-flag type errors under tsconfig.strict.json (spec 167 Story 1)
 *   5. `instance.state` reach-ins under src/ (spec 167 Story 5)
 *   6. Class-field declarations on GramFrame (spec 167 Story 5)
 *
 * A count below its baseline passes with a reminder to lower the baseline in
 * the same PR, so improvements get locked in as ordinary reviewed diffs.
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
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

// --- 4. Strict-flag type errors (spec 167 Story 1) --------------------------

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

/**
 * Type-check the project under an overlay tsconfig and return the raw output.
 *
 * `tsc --noEmit` exits non-zero whenever it reports an error, so the report
 * arrives on stdout of a thrown error in the normal (non-empty) case.
 * @param {string} project - Path to the tsconfig, relative to the repo root
 * @returns {string} Combined compiler output
 */
function runTsc(project) {
  const tscBin = join(repoRoot, 'node_modules', '.bin', 'tsc')
  try {
    return execFileSync(tscBin, ['--noEmit', '-p', project], { cwd: repoRoot, encoding: 'utf8' })
  } catch (err) {
    if (typeof err.stdout !== 'string') throw err
    return err.stdout
  }
}

/**
 * Count `error TS` lines in compiler output.
 * @param {string} output
 * @returns {string[]} The matching lines
 */
function errorLines(output) {
  return output.split('\n').filter(line => line.includes('error TS'))
}

/**
 * The compiler-output lines matching a pattern.
 * @param {string} output
 * @param {RegExp} pattern
 * @returns {string[]} The matching lines
 */
function errorLinesMatching(output, pattern) {
  return output.split('\n').filter(line => pattern.test(line))
}

// Temporary: this whole block disappears with tsconfig.strict.json once the
// three flags move into tsconfig.json itself (spec 167 T014). Absence of the
// overlay is the intended end state, not a misconfiguration, so skip silently.
const strictProject = 'tsconfig.strict.json'
if (existsSync(join(repoRoot, strictProject))) {
  const output = runTsc(strictProject)

  // A malformed overlay makes tsc report a *config* error and check nothing,
  // which would read as the burn-down finishing overnight. Mirror the madge
  // moduleCount guard and fail loudly instead.
  const configError = ['TS5052', 'TS6046', 'TS5023'].find(code => output.includes(code))
  if (configError) {
    console.error(`✖ ${strictProject} is malformed — tsc reported ${configError} and checked nothing.`)
    console.error(output.trim())
    console.error('  The strict error count is meaningless until the overlay parses. Fix the config, not the baseline.')
    process.exit(1)
  }

  // A syntax error stops tsc before it type-checks, so the count collapses to a
  // handful and reads as the burn-down finishing overnight. Observed for real:
  // one stray brace took the count from 455 to 1 and the ratchet said
  // "improved". Syntax errors are TS1xxx.
  if (/error TS1\d{3}:/.test(output)) {
    console.error(`✖ tsc reported a syntax error under ${strictProject} and stopped before type-checking.`)
    for (const line of errorLinesMatching(output, /error TS1\d{3}:/)) console.error(`    ${line}`)
    console.error('  The strict error count is meaningless until the source parses.')
    process.exit(1)
  }

  const errors = errorLines(output)
  const detail = []

  // The per-flag split costs two extra tsc runs, so it is only computed when
  // the count has moved — which is exactly when someone needs to see the shape.
  if (errors.length !== baseline.strictTypeErrors) {
    for (const flag of ['noImplicitAny', 'strictNullChecks']) {
      const probe = join(repoRoot, `tsconfig.hygiene-${flag}.json`)
      writeFileSync(probe, JSON.stringify({
        extends: './tsconfig.json',
        // strictPropertyInitialization is deliberately absent: it cannot be set
        // without strictNullChecks (TS5052) and adds no errors once it is.
        compilerOptions: { [flag]: true },
      }, null, 2))
      try {
        detail.push(`${flag}: ${errorLines(runTsc(relative(repoRoot, probe))).length}`)
      } finally {
        rmSync(probe, { force: true })
      }
    }
  }

  /** @type {Map<string, number>} */
  const byFile = new Map()
  for (const line of errors) {
    const file = line.split('(')[0]
    byFile.set(file, (byFile.get(file) ?? 0) + 1)
  }
  const topFiles = [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
  detail.push(...topFiles.map(([file, count]) => `${file}: ${count}`))

  results.push({
    name: `Strict type errors (${strictProject})`,
    baseline: baseline.strictTypeErrors,
    current: errors.length,
    detail,
  })
}

// --- 5 & 6. Instance surface (spec 167 Story 5) -----------------------------

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
