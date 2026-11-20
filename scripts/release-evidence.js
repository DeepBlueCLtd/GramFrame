#!/usr/bin/env node
/**
 * Gather what `release-version.js` decides from: the newest release tag, the
 * files and commits since it, and the pull requests merged since it with their
 * labels and files. I/O only — every rule lives in `release-version.js`.
 *
 * Pull requests are found from main's first-parent history: each merge or
 * squash commit is asked for its PR (`gh api .../commits/<sha>/pulls`), and a
 * PR's files are that commit's diff against its first parent, so no extra API
 * call is spent per PR. Without `gh` (a local run) PRs are left empty and the
 * decision falls back on commit messages.
 *
 * Usage: node scripts/release-evidence.js <head-sha> [forced-bump]
 * Prints the evidence as JSON on stdout.
 */

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

/**
 * Run a command and return its trimmed stdout.
 * @param {string} cmd
 * @param {string[]} args
 * @returns {string}
 */
function run(cmd, args) {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

/**
 * Non-empty lines of a command's output.
 * @param {string} cmd
 * @param {string[]} args
 * @returns {string[]}
 */
function lines(cmd, args) {
  const out = run(cmd, args)
  return out ? out.split('\n') : []
}

const head = process.argv[2] || 'HEAD'
const forced = /** @type {'auto' | 'major' | 'minor' | 'patch'} */ (process.argv[3] || 'auto')
const repo = process.env.GITHUB_REPOSITORY

const lastTag = lines('git', ['tag', '--list', 'v*', '--sort=-v:refname'])
  .find(tag => /^v\d+\.\d+\.\d+$/.test(tag)) ?? null
const range = lastTag ? `${lastTag}..${head}` : head

const changedFiles = lastTag ? lines('git', ['diff', '--name-only', lastTag, head]) : lines('git', ['ls-tree', '-r', '--name-only', head])

// Unit and record separators keep multi-line bodies intact.
const commits = run('git', ['log', '--reverse', '--format=%s%x1f%b%x1e', range])
  .split('\x1e')
  .map(record => record.replace(/^\n/, ''))
  .filter(Boolean)
  .map(record => {
    const [subject, body = ''] = record.split('\x1f')
    return { subject, body: body.trim() }
  })
  // Earlier release commits are bookkeeping, not changes.
  .filter(commit => !/^chore\(release\): v\d/.test(commit.subject))

/** @type {Map<number, import('./release-version.js').PullRequest>} */
const pullRequests = new Map()
if (repo) {
  for (const sha of lines('git', ['rev-list', '--first-parent', range])) {
    let found
    try {
      found = JSON.parse(run('gh', ['api', `repos/${repo}/commits/${sha}/pulls`]))
    } catch (error) {
      console.error(`Could not look up the PR for ${sha}: ${/** @type {Error} */ (error).message}`)
      continue
    }
    for (const pr of found) {
      if (!pr.merged_at || pullRequests.has(pr.number)) continue
      pullRequests.set(pr.number, {
        number: pr.number,
        title: pr.title,
        body: pr.body ?? '',
        labels: (pr.labels ?? []).map(/** @param {{ name: string }} l */ l => l.name),
        files: lines('git', ['diff', '--name-only', `${sha}^1`, sha])
      })
    }
  }
} else {
  console.error('GITHUB_REPOSITORY is not set: pull requests are not looked up.')
}

const packageVersion = JSON.parse(run('git', ['show', `${head}:package.json`]) || readFileSync('package.json', 'utf8')).version

process.stdout.write(`${JSON.stringify({
  packageVersion,
  lastTag,
  changedFiles,
  commits,
  pullRequests: [...pullRequests.values()],
  forcedBump: forced
}, null, 2)}\n`)
