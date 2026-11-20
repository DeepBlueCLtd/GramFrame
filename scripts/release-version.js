#!/usr/bin/env node
/**
 * Decide whether a merge to main ships a release, and at what version.
 *
 * `release.yml` gathers the evidence — the files changed since the last tag,
 * the commit messages, and the pull requests merged — and this script reads it.
 * The deciding is here rather than in YAML so the rules are unit-tested
 * (`tests/unit/release-version.test.js`) instead of discovered on main.
 *
 * The rules, strongest first:
 *
 * 1. A label on a merged PR says it outright: `release:major` / `major` /
 *    `breaking`, `release:minor` / `minor` / `feature` / `enhancement`,
 *    `release:patch` / `patch` / `bug` / `fix`. `release:skip` / `no-release`
 *    leaves that PR out of the reckoning.
 * 2. A Conventional Commits cue in a PR title or a commit subject:
 *    `type!:` or a `BREAKING CHANGE:` footer is major, `feat:` is minor,
 *    any other type is patch.
 * 3. A PR that adds a feature spec (`specs/<n>-<name>/spec.md`) is minor —
 *    this repository's own sign that a feature, not a fix, landed.
 * 4. Otherwise patch.
 *
 * The release takes the largest bump any PR asks for. It is skipped when
 * nothing that ships changed (docs, tests and CI alone change no byte of the
 * bundle), when every PR opted out, or when the head commit says
 * `[skip release]`. A `package.json` version already ahead of the last tag is
 * a hand-chosen version and is released as it stands.
 *
 * Usage: node scripts/release-version.js <evidence.json>
 * Prints the decision as JSON on stdout.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/** @typedef {'major' | 'minor' | 'patch'} Bump */

/**
 * @typedef {Object} PullRequest
 * @property {number} number
 * @property {string} title
 * @property {string} [body]
 * @property {string[]} labels
 * @property {string[]} [files] - Files the PR changed, when known
 */

/**
 * @typedef {Object} Commit
 * @property {string} subject
 * @property {string} [body]
 */

/**
 * @typedef {Object} Evidence
 * @property {string} packageVersion - `version` in package.json at the head commit
 * @property {string | null} lastTag - The newest `vX.Y.Z` tag, or null for none
 * @property {string[]} changedFiles - Files changed since the last tag
 * @property {Commit[]} commits - Commits since the last tag
 * @property {PullRequest[]} pullRequests - PRs merged since the last tag
 * @property {'auto' | Bump} [forcedBump] - A manual run's override
 */

/**
 * @typedef {Object} PullRequestVerdict
 * @property {number} number
 * @property {string} title
 * @property {Bump | 'skip'} bump
 * @property {string} why
 */

/**
 * @typedef {Object} Decision
 * @property {boolean} release
 * @property {string} version - The version to release (empty when not releasing)
 * @property {Bump | 'manual' | 'none'} bump
 * @property {string} reason
 * @property {PullRequestVerdict[]} pullRequests
 */

/** Paths whose change can alter what a release ships. */
const SHIPPED_PATHS = [
  /^src\//,
  /^package\.json$/,
  /^yarn\.lock$/,
  /^vite\.config\.js$/,
  /^test-release\.html$/,
  /^sample\/demo-gram\.png$/
]

/** @type {Record<Bump, number>} */
const RANK = { patch: 1, minor: 2, major: 3 }

/** @type {Record<string, Bump | 'skip'>} */
const LABELS = {
  'release:major': 'major',
  major: 'major',
  breaking: 'major',
  'breaking change': 'major',
  'release:minor': 'minor',
  minor: 'minor',
  feature: 'minor',
  enhancement: 'minor',
  'release:patch': 'patch',
  patch: 'patch',
  bug: 'patch',
  fix: 'patch',
  'release:skip': 'skip',
  'no-release': 'skip',
  'skip-release': 'skip'
}

const CONVENTIONAL = /^(\w+)(\([^)]*\))?(!)?:\s/
const BREAKING_FOOTER = /^BREAKING[ -]CHANGE:/m
const FEATURE_SPEC = /^specs\/\d+-[^/]+\/spec\.md$/

/**
 * Parse `X.Y.Z` (an optional leading `v` allowed).
 * @param {string} version
 * @returns {[number, number, number] | null}
 */
export function parseVersion(version) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(version.trim())
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null
}

/**
 * Compare two parsed versions.
 * @param {[number, number, number]} a
 * @param {[number, number, number]} b
 * @returns {number} Negative, zero or positive
 */
function compare(a, b) {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2]
}

/**
 * The version one bump above `version`.
 * @param {string} version
 * @param {Bump} bump
 * @returns {string}
 */
export function bumpVersion(version, bump) {
  const parsed = parseVersion(version)
  if (!parsed) throw new Error(`Not a semantic version: ${version}`)
  const [major, minor, patch] = parsed
  if (bump === 'major') return `${major + 1}.0.0`
  if (bump === 'minor') return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}

/**
 * What a Conventional Commits message asks for, if it is one.
 * @param {string} subject
 * @param {string} [body]
 * @returns {Bump | null}
 */
export function conventionalBump(subject, body = '') {
  if (BREAKING_FOOTER.test(body)) return 'major'
  const match = CONVENTIONAL.exec(subject.trim())
  if (!match) return null
  if (match[3]) return 'major'
  return match[1].toLowerCase() === 'feat' ? 'minor' : 'patch'
}

/**
 * What one pull request asks for, and why.
 * @param {PullRequest} pr
 * @returns {{ bump: Bump | 'skip', why: string }}
 */
export function classifyPullRequest(pr) {
  const labelled = pr.labels
    .map(label => ({ label, bump: LABELS[label.toLowerCase()] }))
    .filter(entry => entry.bump)
  const skip = labelled.find(entry => entry.bump === 'skip')
  if (skip) return { bump: 'skip', why: `label \`${skip.label}\`` }
  const strongest = labelled.reduce(
    /** @param {{ label: string, bump: Bump | 'skip' } | null} best */
    (best, entry) => (!best || RANK[/** @type {Bump} */ (entry.bump)] > RANK[/** @type {Bump} */ (best.bump)] ? entry : best),
    null
  )
  if (strongest) return { bump: strongest.bump, why: `label \`${strongest.label}\`` }

  const conventional = conventionalBump(pr.title, pr.body)
  if (conventional) return { bump: conventional, why: 'Conventional Commits title' }

  const spec = (pr.files ?? []).find(file => FEATURE_SPEC.test(file))
  if (spec) return { bump: 'minor', why: `adds feature spec \`${spec}\`` }

  return { bump: 'patch', why: 'default' }
}

/**
 * Decide the release.
 * @param {Evidence} evidence
 * @returns {Decision}
 */
export function decideRelease(evidence) {
  const { packageVersion, lastTag, changedFiles, commits, pullRequests } = evidence
  const forced = evidence.forcedBump && evidence.forcedBump !== 'auto' ? evidence.forcedBump : null
  const base = lastTag ? parseVersion(lastTag) : null
  const pkg = parseVersion(packageVersion)
  if (!pkg) throw new Error(`package.json version is not X.Y.Z: ${packageVersion}`)

  /** @param {string} reason @returns {Decision} */
  const noRelease = reason => ({ release: false, version: '', bump: 'none', reason, pullRequests: [] })

  const head = commits[commits.length - 1]
  if (!forced && head && /\[skip release\]/i.test(`${head.subject}\n${head.body ?? ''}`)) {
    return noRelease('the head commit says [skip release]')
  }

  // A first release: whatever package.json says.
  if (!base) {
    return { release: true, version: packageVersion, bump: 'manual', reason: 'no earlier release tag', pullRequests: [] }
  }

  // Someone chose the version by hand: honour it rather than bump past it.
  if (compare(pkg, base) > 0 && !forced) {
    return {
      release: true,
      version: packageVersion,
      bump: 'manual',
      reason: `package.json already reads ${packageVersion}, ahead of ${lastTag}`,
      pullRequests: []
    }
  }

  if (!forced && !changedFiles.some(file => SHIPPED_PATHS.some(path => path.test(file)))) {
    return noRelease(`nothing that ships changed since ${lastTag}`)
  }

  const verdicts = pullRequests.map(pr => ({ number: pr.number, title: pr.title, ...classifyPullRequest(pr) }))
  const counted = verdicts.filter(v => v.bump !== 'skip')
  if (!forced && verdicts.length > 0 && counted.length === 0) {
    return noRelease('every merged pull request is labelled to skip a release')
  }

  /** @type {Bump} */
  let bump = 'patch'
  let reason = 'default patch release'
  if (forced) {
    bump = forced
    reason = `bump chosen by hand (${forced})`
  } else {
    // Commits pushed straight to main have no PR; their messages still count.
    const fromCommits = commits
      .map(c => conventionalBump(c.subject, c.body))
      .filter(/** @returns {b is Bump} */ b => b !== null)
    for (const v of counted) {
      const b = /** @type {Bump} */ (v.bump)
      // A stated reason beats the default at the same rank, so a patch
      // release driven by a `bug` label says so.
      if (RANK[b] > RANK[bump] || (RANK[b] === RANK[bump] && v.why !== 'default' && reason === 'default patch release')) {
        bump = b
        reason = `#${v.number} (${v.why})`
      }
    }
    for (const b of fromCommits) {
      if (RANK[b] > RANK[bump]) {
        bump = b
        reason = 'a Conventional Commits message'
      }
    }
  }

  const fromVersion = compare(pkg, base) > 0 ? packageVersion : base.join('.')
  return { release: true, version: bumpVersion(fromVersion, bump), bump, reason, pullRequests: verdicts }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const file = process.argv[2]
  if (!file) {
    console.error('Usage: node scripts/release-version.js <evidence.json>')
    process.exit(2)
  }
  /** @type {Evidence} */
  const evidence = JSON.parse(readFileSync(file, 'utf8'))
  process.stdout.write(`${JSON.stringify(decideRelease(evidence), null, 2)}\n`)
}
