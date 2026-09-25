// @vitest-environment node
/**
 * Unit lane for `.specify/scripts/bash/update-agent-context.sh`, the script
 * `/speckit.plan` runs to fold a plan's Technical Context into CLAUDE.md.
 *
 * The script once deduped Active Technologies entries by exact substring, so
 * every rewording of the same stack added a line and CLAUDE.md collected
 * fifteen copies of one fact. These tests pin the rule that replaced it: an
 * entry is the fact it states, compared with case, spacing, punctuation and
 * the "(branch)" suffix ignored; a Storage line that says there is no storage
 * is not an entry; and trimming Recent Changes keeps a wrapped entry whole.
 *
 * The script guards its `main` behind a BASH_SOURCE check, so a test sources
 * it and calls `update_existing_agent_file` directly on a scratch file.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const script = join(repoRoot, '.specify', 'scripts', 'bash', 'update-agent-context.sh')
const hasBash = spawnSync('bash', ['-c', 'true']).status === 0

/**
 * Run `update_existing_agent_file` on `target` as though the plan on branch
 * `branch` had the given Technical Context, and return the file afterwards.
 * @param {string} target
 * @param {{lang?: string, framework?: string, storage?: string, branch?: string}} plan
 */
function update(target, { lang = '', framework = '', storage = '', branch = '999-test' }) {
  const result = spawnSync(
    'bash',
    [
      '-c',
      [
        `source "${script}"`,
        `NEW_LANG=${JSON.stringify(lang)}`,
        `NEW_FRAMEWORK=${JSON.stringify(framework)}`,
        `NEW_DB=${JSON.stringify(storage)}`,
        `CURRENT_BRANCH=${JSON.stringify(branch)}`,
        `update_existing_agent_file "${target}" 2026-01-01`
      ].join('\n')
    ],
    // The script resolves feature paths when sourced; a named feature keeps
    // that independent of whichever branch the test runs on.
    { cwd: repoRoot, env: { ...process.env, SPECIFY_FEATURE: '999-test' }, encoding: 'utf8' }
  )
  if (result.status !== 0) throw new Error(`script failed:\n${result.stdout}\n${result.stderr}`)
  return readFileSync(target, 'utf8')
}

/**
 * The lines of the section under `heading`, up to the next heading.
 * @param {string} text
 * @param {string} heading
 */
function section(text, heading) {
  const lines = text.split('\n')
  const start = lines.indexOf(heading)
  const body = []
  for (let i = start + 1; i < lines.length && !/^##\s/.test(lines[i]); i++) body.push(lines[i])
  return body
}

const STACK = 'JavaScript (ES2020+), JSDoc-typed, no compilation step'
const DEPS = 'None at runtime (zero runtime dependencies); Vite 5 for build'

const FIXTURE = `# Test Guidelines

## Active Technologies
- ${STACK} + ${DEPS} (155-first)
- Browser Web Storage for annotations: \`localStorage\` for trainers (155-first)

## Recent Changes
- 172-newest: one line
- 171-wrapped: the head of a wrapped entry
  and its continuation line
- 170-oldest: the entry that trimming drops
  with its own continuation line

## Later
- untouched
`

describe.skipIf(!hasBash)('update-agent-context.sh: Active Technologies stays a set of facts', () => {
  /** @type {string} */
  let dir = ''
  /** @type {string} */
  let target = ''
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'agent-context-'))
    target = join(dir, 'CLAUDE.md')
    writeFileSync(target, FIXTURE)
  })
  afterEach(() => rmSync(dir, { recursive: true, force: true }))

  it('adds nothing when the plan restates the stack verbatim on a new branch', () => {
    const after = update(target, { lang: STACK, framework: DEPS, branch: '173-next' })
    const entries = section(after, '## Active Technologies').filter(l => l.startsWith('- '))
    expect(entries).toHaveLength(2)
    // and Recent Changes is left alone: the feature added no technology, so
    // there is nothing to record, and the hand-written entries all survive
    expect(section(after, '## Recent Changes')).toEqual(section(FIXTURE, '## Recent Changes'))
  })

  it('adds nothing when only case, spacing or punctuation differ', () => {
    const after = update(target, {
      lang: 'javascript  ES2020+ jsdoc typed no-compilation step',
      framework: 'none at runtime (zero runtime dependencies) vite 5 for build',
      branch: '173-next'
    })
    const entries = section(after, '## Active Technologies').filter(l => l.startsWith('- '))
    expect(entries).toHaveLength(2)
  })

  it('adds a genuinely new fact, tagged with its branch', () => {
    const after = update(target, { lang: 'WebAssembly (Rust 1.80)', branch: '173-next' })
    const entries = section(after, '## Active Technologies').filter(l => l.startsWith('- '))
    expect(entries).toHaveLength(3)
    expect(entries[2]).toBe('- WebAssembly (Rust 1.80) (173-next)')
  })

  it.each(['N/A', 'N/A — expand state is in-memory only', 'None', 'Unchanged — Web Storage as before'])(
    'does not record a Storage line that says there is none: %s',
    storage => {
      const after = update(target, { storage, branch: '173-next' })
      const entries = section(after, '## Active Technologies').filter(l => l.startsWith('- '))
      expect(entries).toHaveLength(2)
      // and no Recent Changes entry is minted for it either
      expect(section(after, '## Recent Changes').join('\n')).not.toContain('173-next')
    }
  )

  it('records a real Storage line once, however it is spelled later', () => {
    const first = update(target, { storage: 'IndexedDB for decoded audio', branch: '173-next' })
    expect(section(first, '## Active Technologies').filter(l => l.startsWith('- '))).toHaveLength(3)
    const second = update(target, { storage: 'indexeddb, for decoded audio', branch: '174-after' })
    expect(section(second, '## Active Technologies').filter(l => l.startsWith('- '))).toHaveLength(3)
  })

  it('trims Recent Changes to three whole entries, continuation lines included', () => {
    const after = update(target, { lang: 'WebAssembly (Rust 1.80)', branch: '173-next' })
    const changes = section(after, '## Recent Changes').filter(l => l !== '')
    expect(changes).toEqual([
      '- 173-next: Added WebAssembly (Rust 1.80)',
      '- 172-newest: one line',
      '- 171-wrapped: the head of a wrapped entry',
      '  and its continuation line'
    ])
    expect(after).not.toContain('with its own continuation line')
    expect(section(after, '## Later')).toContain('- untouched')
  })
})
