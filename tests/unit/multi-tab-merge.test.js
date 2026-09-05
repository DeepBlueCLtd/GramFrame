// @vitest-environment node
/**
 * @fileoverview The multi-tab annotation merge (R9-18, issue #269).
 *
 * Two trainer tabs on the same page used to be last-writer-wins: each save
 * wrote the whole record from the saving tab's state, so markers added in one
 * tab were erased by the next save from the other, silently. `saveAnnotations`
 * now reads, merges and writes.
 *
 * These pin the merge rules themselves — the decisions that make the merge
 * predictable rather than merely non-destructive:
 *
 *   - union by id, so a feature either tab holds survives
 *   - a tombstone is unconditional, so a deletion beats a concurrent edit
 *   - a feature both tabs changed resolves to the more recently saved record's
 *     version, whole
 *   - the doppler curve is one object, so it is last-writer-wins as a whole
 */
import { describe, it, expect } from 'vitest'
import { mergeStoredAnnotations } from '../../src/core/storage.js'

/** No deletions. */
const noTombstones = () => ({ markers: {}, harmonicSets: {}, sidebandSets: {}, doppler: null })

/**
 * The ids in a list of features, sorted -- what most of these cases assert.
 * @param {any[]} features - Markers or pin sets
 * @returns {string[]} Their ids, sorted
 */
const ids = features => features.map((/** @type {any} */ f) => f.id).sort()

/**
 * Merge two records, asserting the result is there.
 *
 * `mergeStoredAnnotations` is typed `StoredAnnotations|null` because a merge of
 * two absent records is absent. Every case here supplies at least one record,
 * so a null return is itself a failure -- asserted once, here, rather than
 * guarded at each of the fifty-odd reads below (R9-10, issue #262).
 * @param {any} mine - What this tab would write
 * @param {any} theirs - What is already stored
 * @param {number} [now] - Current epoch milliseconds, for tombstone pruning
 * @returns {any} The merged record
 */
function merge(mine, theirs, now = undefined) {
  const merged = now === undefined
    ? mergeStoredAnnotations(mine, theirs)
    : mergeStoredAnnotations(mine, theirs, now)
  expect(merged).not.toBeNull()
  return merged
}

/**
 * A stored record, with only the parts a test cares about spelled out.
 * @param {any} [overrides] - Fields to set
 * @returns {any} A record
 */
function record(overrides = {}) {
  return {
    version: 1,
    savedAt: '2026-09-05T10:00:00.000Z',
    gram: { image: 'g.png', timeMin: 0, timeMax: 60, freqMin: 0, freqMax: 100 },
    analysis: { markers: [] },
    harmonics: { harmonicSets: [] },
    sidebands: { sidebandSets: [] },
    doppler: { fPlus: null, fMinus: null, fZero: null, color: null },
    tombstones: noTombstones(),
    ...overrides
  }
}

/**
 * A marker.
 * @param {string} id - Marker id
 * @param {any} [fields] - Overrides
 * @returns {any} A stored marker
 */
const marker = (id, fields = {}) => ({ id, color: '#ff0000', time: 10, freq: 50, symbol: 'cross', ...fields })

/** A curve, for the doppler cases. */
const curve = (freq = 30) => ({
  fPlus: { time: 1, freq }, fMinus: { time: 2, freq: freq - 10 }, fZero: { time: 1.5, freq: freq - 5 }, color: '#00ff00'
})

describe('union by id — the point of merging at all', () => {
  it('keeps both tabs\' markers', () => {
    const mine = record({ analysis: { markers: [marker('a')] } })
    const theirs = record({ analysis: { markers: [marker('b')] } })

    const merged = merge(mine, theirs)
    expect(ids(merged.analysis.markers)).toEqual(['a', 'b'])
  })

  it('keeps both tabs\' harmonic and sideband sets', () => {
    const mine = record({
      harmonics: { harmonicSets: [{ id: 'h1', spacing: 10 }] },
      sidebands: { sidebandSets: [{ id: 's1', spacing: 5 }] }
    })
    const theirs = record({
      harmonics: { harmonicSets: [{ id: 'h2', spacing: 20 }] },
      sidebands: { sidebandSets: [{ id: 's2', spacing: 8 }] }
    })

    const merged = merge(mine, theirs)
    expect(ids(merged.harmonics.harmonicSets)).toEqual(['h1', 'h2'])
    expect(ids(merged.sidebands.sidebandSets)).toEqual(['s1', 's2'])
  })

  it('does not duplicate a feature both tabs hold', () => {
    const mine = record({ analysis: { markers: [marker('a'), marker('b')] } })
    const theirs = record({ analysis: { markers: [marker('b'), marker('c')] } })

    const merged = merge(mine, theirs)
    expect(ids(merged.analysis.markers)).toEqual(['a', 'b', 'c'])
  })

  it('is symmetric in what survives, whichever side is "mine"', () => {
    const a = record({ savedAt: '2026-09-05T10:00:00.000Z', analysis: { markers: [marker('a')] } })
    const b = record({ savedAt: '2026-09-05T11:00:00.000Z', analysis: { markers: [marker('b')] } })

    const forward = ids(merge(a, b).analysis.markers)
    const backward = ids(merge(b, a).analysis.markers)
    expect(forward).toEqual(backward)
  })
})

describe('a deletion beats a concurrent edit', () => {
  it('a marker one tab deleted does not come back from the other', () => {
    // The whole reason tombstones exist: without them "absent" and "deleted"
    // are the same state and a union resurrects everything ever removed.
    const mine = record({
      analysis: { markers: [] },
      tombstones: { ...noTombstones(), markers: { a: '2026-09-05T10:30:00.000Z' } }
    })
    const theirs = record({ analysis: { markers: [marker('a')] } })

    expect(merge(mine, theirs).analysis.markers).toEqual([])
  })

  it('stays deleted even when the other tab edited it and saved later', () => {
    // The documented cost of the rule: an edit made concurrently with a
    // deletion is lost, because resurrecting a feature because someone
    // recoloured it elsewhere is the more surprising outcome.
    const mine = record({
      savedAt: '2026-09-05T10:00:00.000Z',
      analysis: { markers: [] },
      tombstones: { ...noTombstones(), markers: { a: '2026-09-05T09:59:00.000Z' } }
    })
    const theirs = record({
      savedAt: '2026-09-05T12:00:00.000Z',
      analysis: { markers: [marker('a', { color: '#0000ff' })] }
    })

    expect(merge(mine, theirs).analysis.markers).toEqual([])
  })

  it('carries the tombstone forward so a third save cannot resurrect it', () => {
    const mine = record({
      analysis: { markers: [] },
      tombstones: { ...noTombstones(), markers: { a: '2026-09-05T10:30:00.000Z' } }
    })
    const theirs = record({ analysis: { markers: [marker('a')] } })

    const merged = merge(mine, theirs)
    expect(merged.tombstones.markers.a).toBe('2026-09-05T10:30:00.000Z')
    // ...and merging that result with a tab that still holds the marker keeps
    // it deleted.
    expect(merge(merged, theirs).analysis.markers).toEqual([])
  })

  it('keeps the earlier time when both tabs deleted the same feature', () => {
    const mine = record({ tombstones: { ...noTombstones(), markers: { a: '2026-09-05T11:00:00.000Z' } } })
    const theirs = record({ tombstones: { ...noTombstones(), markers: { a: '2026-09-05T10:00:00.000Z' } } })

    expect(merge(mine, theirs).tombstones.markers.a).toBe('2026-09-05T10:00:00.000Z')
  })

  it('forgets a tombstone once it is older than the TTL', () => {
    const now = Date.parse('2026-09-20T00:00:00.000Z')
    const mine = record({ tombstones: { ...noTombstones(), markers: { old: '2026-09-01T00:00:00.000Z' } } })
    const theirs = record({ tombstones: { ...noTombstones(), markers: { recent: '2026-09-19T00:00:00.000Z' } } })

    const merged = merge(mine, theirs, now)
    expect(Object.keys(merged.tombstones.markers)).toEqual(['recent'])
  })

  it('keeps a tombstone whose time cannot be read', () => {
    // Forgetting a deletion resurrects work the analyst threw away, which is
    // the worse of the two mistakes.
    const mine = record({ tombstones: { ...noTombstones(), markers: { a: 'not a date' } } })
    const theirs = record({ analysis: { markers: [marker('a')] } })

    const merged = merge(mine, theirs, Date.parse('2027-01-01T00:00:00.000Z'))
    expect(merged.analysis.markers).toEqual([])
  })
})

describe('a feature both tabs changed resolves to the newer record, whole', () => {
  it('takes the more recently saved version', () => {
    const mine = record({
      savedAt: '2026-09-05T12:00:00.000Z',
      analysis: { markers: [marker('a', { color: '#111111', freq: 11 })] }
    })
    const theirs = record({
      savedAt: '2026-09-05T10:00:00.000Z',
      analysis: { markers: [marker('a', { color: '#222222', freq: 22 })] }
    })

    const [merged] = merge(mine, theirs).analysis.markers
    expect(merged.color).toBe('#111111')
    expect(merged.freq).toBe(11)
  })

  it('takes the other side when it is the newer one', () => {
    const mine = record({
      savedAt: '2026-09-05T10:00:00.000Z',
      analysis: { markers: [marker('a', { color: '#111111' })] }
    })
    const theirs = record({
      savedAt: '2026-09-05T12:00:00.000Z',
      analysis: { markers: [marker('a', { color: '#222222' })] }
    })

    expect(merge(mine, theirs).analysis.markers[0].color).toBe('#222222')
  })

  it('does not mix fields from the two versions', () => {
    // Field-level merging would need per-field times this format does not
    // carry; a half-and-half feature is worse than either whole one.
    const mine = record({
      savedAt: '2026-09-05T12:00:00.000Z',
      analysis: { markers: [marker('a', { color: '#111111', freq: 11, label: 'mine' })] }
    })
    const theirs = record({
      savedAt: '2026-09-05T10:00:00.000Z',
      analysis: { markers: [marker('a', { color: '#222222', freq: 22, label: 'theirs' })] }
    })

    expect(merge(mine, theirs).analysis.markers[0]).toEqual(
      marker('a', { color: '#111111', freq: 11, label: 'mine' })
    )
  })

  it('treats a record with no usable savedAt as the older one', () => {
    const mine = record({ savedAt: 'nonsense', analysis: { markers: [marker('a', { color: '#111111' })] } })
    const theirs = record({ savedAt: '2026-09-05T10:00:00.000Z', analysis: { markers: [marker('a', { color: '#222222' })] } })

    expect(merge(mine, theirs).analysis.markers[0].color).toBe('#222222')
  })
})

describe('the doppler curve is one object', () => {
  it('keeps the curve when only one tab has one', () => {
    const mine = record({ doppler: curve(30) })
    const theirs = record()

    expect(merge(mine, theirs).doppler.fPlus.freq).toBe(30)
  })

  it('takes the more recently saved curve when both have one', () => {
    const mine = record({ savedAt: '2026-09-05T12:00:00.000Z', doppler: curve(30) })
    const theirs = record({ savedAt: '2026-09-05T10:00:00.000Z', doppler: curve(40) })

    expect(merge(mine, theirs).doppler.fPlus.freq).toBe(30)
  })

  it('clears the curve when either tab deleted it', () => {
    const mine = record({ tombstones: { ...noTombstones(), doppler: '2026-09-05T10:30:00.000Z' } })
    const theirs = record({ savedAt: '2026-09-05T12:00:00.000Z', doppler: curve(40) })

    expect(merge(mine, theirs).doppler.fPlus).toBeNull()
  })
})

describe('legacy and degenerate records', () => {
  it('merges a record written before tombstones existed as having deleted nothing', () => {
    const legacy = { version: 1, savedAt: '2026-08-01T00:00:00.000Z', analysis: { markers: [marker('old')] }, harmonics: { harmonicSets: [] }, doppler: {} }
    const mine = record({ analysis: { markers: [marker('new')] } })

    const merged = merge(mine, legacy)
    expect(ids(merged.analysis.markers)).toEqual(['new', 'old'])
    expect(merged.tombstones).toEqual(noTombstones())
  })

  it('tolerates a damaged tombstone section rather than dropping every deletion', () => {
    const mine = record({ tombstones: /** @type {any} */ ('not an object') })
    const theirs = record({ analysis: { markers: [marker('a')] } })

    expect(ids(merge(mine, theirs).analysis.markers)).toEqual(['a'])
  })

  it('returns the other side when one is missing', () => {
    const mine = record({ analysis: { markers: [marker('a')] } })
    expect(merge(mine, null)).toBe(mine)
    expect(merge(null, mine)).toBe(mine)
  })

  it('survives a record with sections missing entirely', () => {
    const sparse = { version: 1, savedAt: '2026-09-05T11:00:00.000Z' }
    const mine = record({ analysis: { markers: [marker('a')] } })

    const merged = merge(mine, /** @type {any} */ (sparse))
    expect(ids(merged.analysis.markers)).toEqual(['a'])
    expect(merged.sidebands.sidebandSets).toEqual([])
  })
})
