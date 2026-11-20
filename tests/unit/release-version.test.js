// @vitest-environment node
/**
 * Unit lane for the release decision `release.yml` makes on every merge to
 * main. A wrong rule here mints a wrong version on main, which cannot be
 * un-published, so the rules are pinned here rather than learnt there.
 */
import { describe, it, expect } from 'vitest'
import {
  bumpVersion,
  classifyPullRequest,
  conventionalBump,
  decideRelease,
  parseVersion
} from '../../scripts/release-version.js'

/**
 * Evidence for one release, with shippable defaults.
 * @param {Partial<import('../../scripts/release-version.js').Evidence>} overrides
 * @returns {import('../../scripts/release-version.js').Evidence}
 */
function evidence(overrides = {}) {
  return {
    packageVersion: '0.3.2',
    lastTag: 'v0.3.2',
    changedFiles: ['src/main.js'],
    commits: [{ subject: 'Merge pull request #1 from x/y' }],
    pullRequests: [{ number: 1, title: 'Tidy the axes', labels: [] }],
    ...overrides
  }
}

describe('versions', () => {
  it('parses with or without the v', () => {
    expect(parseVersion('v1.2.3')).toEqual([1, 2, 3])
    expect(parseVersion('1.2.3')).toEqual([1, 2, 3])
    expect(parseVersion('1.2')).toBeNull()
    expect(parseVersion('1.2.3-beta')).toBeNull()
  })

  it('bumps and resets the lower parts', () => {
    expect(bumpVersion('0.3.2', 'patch')).toBe('0.3.3')
    expect(bumpVersion('0.3.2', 'minor')).toBe('0.4.0')
    expect(bumpVersion('0.3.2', 'major')).toBe('1.0.0')
  })
})

describe('conventionalBump', () => {
  it('reads the type', () => {
    expect(conventionalBump('feat: region zoom')).toBe('minor')
    expect(conventionalBump('feat(player): bookmarks')).toBe('minor')
    expect(conventionalBump('fix: drag release')).toBe('patch')
    expect(conventionalBump('feat!: new config format')).toBe('major')
    expect(conventionalBump('fix: x', 'Body\n\nBREAKING CHANGE: the API moved')).toBe('major')
  })

  it('ignores plain English', () => {
    expect(conventionalBump('Restore an incomplete stored Doppler curve')).toBeNull()
    expect(conventionalBump('Note: this is not a type')).toBe('patch')
  })
})

describe('classifyPullRequest', () => {
  it('puts a label above the title', () => {
    expect(classifyPullRequest({ number: 1, title: 'fix: x', labels: ['enhancement'] }).bump).toBe('minor')
  })

  it('takes the strongest of several labels', () => {
    expect(classifyPullRequest({ number: 1, title: 'x', labels: ['bug', 'release:major'] }).bump).toBe('major')
  })

  it('lets a skip label win', () => {
    expect(classifyPullRequest({ number: 1, title: 'feat: x', labels: ['major', 'no-release'] }).bump).toBe('skip')
  })

  it('treats an added feature spec as minor', () => {
    const pr = { number: 1, title: 'Region zoom', labels: [], files: ['specs/170-region-zoom/spec.md', 'src/x.js'] }
    expect(classifyPullRequest(pr)).toEqual({ bump: 'minor', why: 'adds feature spec `specs/170-region-zoom/spec.md`' })
  })

  it('defaults to patch', () => {
    expect(classifyPullRequest({ number: 1, title: 'Tidy the axes', labels: [] }).bump).toBe('patch')
  })
})

describe('decideRelease', () => {
  it('patches by default', () => {
    expect(decideRelease(evidence())).toMatchObject({ release: true, version: '0.3.3', bump: 'patch' })
  })

  it('takes the largest bump across PRs', () => {
    const d = decideRelease(evidence({
      pullRequests: [
        { number: 1, title: 'Fix', labels: ['bug'] },
        { number: 2, title: 'feat: bookmarks', labels: [] },
        { number: 3, title: 'Tidy', labels: [] }
      ]
    }))
    expect(d).toMatchObject({ version: '0.4.0', bump: 'minor', reason: '#2 (Conventional Commits title)' })
  })

  it('names a stated reason over the default at the same rank', () => {
    const d = decideRelease(evidence({
      pullRequests: [{ number: 1, title: 'Tidy', labels: [] }, { number: 2, title: 'x', labels: ['bug'] }]
    }))
    expect(d.reason).toBe('#2 (label `bug`)')
  })

  it('counts a commit pushed straight to main', () => {
    const d = decideRelease(evidence({ pullRequests: [], commits: [{ subject: 'feat: direct push' }] }))
    expect(d.version).toBe('0.4.0')
  })

  it('skips when nothing that ships changed', () => {
    const d = decideRelease(evidence({ changedFiles: ['docs/Release-Process.md', 'tests/x.spec.js', '.github/workflows/test.yml'] }))
    expect(d.release).toBe(false)
  })

  it('skips when every PR opts out, but not when only some do', () => {
    expect(decideRelease(evidence({ pullRequests: [{ number: 1, title: 'x', labels: ['no-release'] }] })).release).toBe(false)
    const mixed = decideRelease(evidence({
      pullRequests: [{ number: 1, title: 'feat: x', labels: ['no-release'] }, { number: 2, title: 'y', labels: [] }]
    }))
    expect(mixed).toMatchObject({ release: true, version: '0.3.3' })
  })

  it('skips on [skip release] in the head commit', () => {
    expect(decideRelease(evidence({ commits: [{ subject: 'Docs only [skip release]' }] })).release).toBe(false)
  })

  it('honours a version already set by hand', () => {
    const d = decideRelease(evidence({ packageVersion: '1.0.0' }))
    expect(d).toMatchObject({ release: true, version: '1.0.0', bump: 'manual' })
  })

  it('releases package.json as it stands when there is no tag yet', () => {
    expect(decideRelease(evidence({ lastTag: null }))).toMatchObject({ release: true, version: '0.3.2' })
  })

  it('lets a manual run force the bump, even with nothing shipped', () => {
    const d = decideRelease(evidence({ forcedBump: 'minor', changedFiles: ['docs/x.md'] }))
    expect(d).toMatchObject({ release: true, version: '0.4.0', bump: 'minor' })
  })
})
