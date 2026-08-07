// @vitest-environment node
/**
 * Unit lane for the pure storage seams added by the August 2026 bug-hunt
 * fixes: field-by-field validation of restored records (BH-1, BH-16), the
 * gram fingerprint (BH-6, BH-23), and the expiry clock-skew tolerance (BH-33).
 */
import { describe, it, expect } from 'vitest'
import {
  sanitizeStoredAnnotations,
  buildGramFingerprint,
  isAnnotationExpired,
  hasPersistableAnnotations,
  STUDENT_TTL_MS,
  CLOCK_SKEW_TOLERANCE_MS
} from '../../src/core/storage.js'

/** A fully valid stored record, for mutating per test. */
const validRecord = () => ({
  version: 1,
  savedAt: '2026-08-01T00:00:00.000Z',
  analysis: {
    markers: [
      { id: 'm1', color: '#ff6b6b', time: 10, freq: 500, symbol: 'circle' }
    ]
  },
  harmonics: {
    harmonicSets: [
      { id: 'h1', color: '#2ecc71', anchorTime: 30, spacing: 12.5, symbol: 'cross', showPin: true }
    ]
  },
  doppler: {
    fPlus: { time: 40, freq: 900 },
    fMinus: { time: 20, freq: 880 },
    fZero: { time: 30, freq: 890 },
    color: '#ff0000'
  }
})

describe('sanitizeStoredAnnotations (BH-1, BH-16)', () => {
  it('passes a fully valid record through unchanged', () => {
    const { annotations, dropped } = sanitizeStoredAnnotations(validRecord())
    expect(dropped).toBe(0)
    expect(annotations.analysis.markers).toHaveLength(1)
    expect(annotations.harmonics.harmonicSets).toHaveLength(1)
    expect(annotations.doppler.fPlus).toEqual({ time: 40, freq: 900 })
  })

  it('discards a harmonic set with spacing 0 — the page-brick record', () => {
    const rec = validRecord()
    rec.harmonics.harmonicSets[0].spacing = 0
    const { annotations, dropped } = sanitizeStoredAnnotations(rec)
    expect(annotations.harmonics.harmonicSets).toHaveLength(0)
    expect(dropped).toBe(1)
  })

  it('discards negative, NaN, Infinity and string spacings alike', () => {
    for (const spacing of [-1, NaN, Infinity, '12k']) {
      const rec = validRecord()
      // @ts-ignore deliberate corruption
      rec.harmonics.harmonicSets[0].spacing = spacing
      const { annotations } = sanitizeStoredAnnotations(rec)
      expect(annotations.harmonics.harmonicSets).toHaveLength(0)
    }
  })

  it('discards markers with non-finite positions or missing ids, keeping the valid rest', () => {
    const rec = validRecord()
    rec.analysis.markers.push(
      // @ts-ignore deliberate corruption
      { id: 'bad1', color: '#fff', time: NaN, freq: 100 },
      // @ts-ignore deliberate corruption
      { id: '', color: '#fff', time: 1, freq: 100 },
      // @ts-ignore deliberate corruption
      { id: 'bad3', color: '#fff', time: 1, freq: '12k' },
      { id: 'good', color: '#fff', time: 2, freq: 200 }
    )
    const { annotations, dropped } = sanitizeStoredAnnotations(rec)
    expect(annotations.analysis.markers.map(m => m.id)).toEqual(['m1', 'good'])
    expect(dropped).toBe(3)
  })

  it('treats a non-array harmonicSets as empty rather than half-applying', () => {
    const rec = validRecord()
    // @ts-ignore deliberate corruption
    rec.harmonics.harmonicSets = { not: 'an array' }
    const { annotations, dropped } = sanitizeStoredAnnotations(rec)
    expect(annotations.harmonics.harmonicSets).toEqual([])
    expect(annotations.analysis.markers).toHaveLength(1) // valid slices still restore
    expect(dropped).toBeGreaterThan(0)
  })

  it('nulls corrupt doppler points individually and keeps the valid ones', () => {
    const rec = validRecord()
    // @ts-ignore deliberate corruption
    rec.doppler.fPlus = { time: 'noon', freq: 900 }
    const { annotations, dropped } = sanitizeStoredAnnotations(rec)
    expect(annotations.doppler.fPlus).toBeNull()
    expect(annotations.doppler.fMinus).toEqual({ time: 20, freq: 880 })
    expect(dropped).toBe(1)
  })

  it('survives entirely alien input without throwing', () => {
    for (const junk of [null, undefined, 42, 'garbage', [], { analysis: 7 }]) {
      const { annotations } = sanitizeStoredAnnotations(junk)
      expect(annotations.analysis.markers).toEqual([])
      expect(annotations.harmonics.harmonicSets).toEqual([])
      expect(annotations.doppler.fPlus).toBeNull()
    }
  })

  // Marker labels (feature 231): an ADDITIVE field, so a record without one is
  // valid and a bad one costs the label, never the marker.
  it('restores a marker label unchanged', () => {
    const rec = validRecord()
    rec.analysis.markers[0].label = 'Contact A'
    const { annotations, dropped } = sanitizeStoredAnnotations(rec)
    expect(dropped).toBe(0)
    expect(annotations.analysis.markers[0].label).toBe('Contact A')
  })

  it('leaves a legacy label-less marker unlabelled without dropping it', () => {
    const { annotations, dropped } = sanitizeStoredAnnotations(validRecord())
    expect(dropped).toBe(0)
    expect(annotations.analysis.markers).toHaveLength(1)
    expect(annotations.analysis.markers[0]).not.toHaveProperty('label')
  })

  it('strips an unusable label but keeps the marker', () => {
    for (const label of [42, {}, [], null, '', '   ']) {
      const rec = validRecord()
      // @ts-ignore deliberate corruption
      rec.analysis.markers[0].label = label
      const { annotations, dropped } = sanitizeStoredAnnotations(rec)
      expect(annotations.analysis.markers).toHaveLength(1)
      expect(annotations.analysis.markers[0]).not.toHaveProperty('label')
      expect(dropped).toBe(0) // the marker itself is still usable
    }
  })

  it('trims and caps an over-long stored label', () => {
    const rec = validRecord()
    rec.analysis.markers[0].label = `  ${'x'.repeat(200)}  `
    const { annotations } = sanitizeStoredAnnotations(rec)
    expect(annotations.analysis.markers[0].label).toHaveLength(32)
  })
})

describe('buildGramFingerprint (BH-6, BH-23)', () => {
  it('uses the image URL basename and the four config ranges', () => {
    const state = /** @type {any} */ ({
      imageDetails: { url: 'https://host/path/to/gram-042.png' },
      config: { timeMin: 0, timeMax: 60, freqMin: 0, freqMax: 20000 }
    })
    expect(buildGramFingerprint(state)).toEqual({
      image: 'gram-042.png',
      timeMin: 0,
      timeMax: 60,
      freqMin: 0,
      freqMax: 20000
    })
  })

  it('is host-independent: the same file at a different host fingerprints identically', () => {
    const a = /** @type {any} */ ({ imageDetails: { url: 'https://a/x/g.png' }, config: { timeMin: 0, timeMax: 1, freqMin: 0, freqMax: 2 } })
    const b = /** @type {any} */ ({ imageDetails: { url: 'file:///y/g.png' }, config: { timeMin: 0, timeMax: 1, freqMin: 0, freqMax: 2 } })
    expect(buildGramFingerprint(a)).toEqual(buildGramFingerprint(b))
  })
})

describe('isAnnotationExpired clock-skew tolerance (BH-33)', () => {
  const now = Date.parse('2026-08-01T12:00:00Z')

  it('tolerates a savedAt slightly in the future (NTP step-back)', () => {
    const oneMinuteAhead = new Date(now + 60 * 1000).toISOString()
    expect(isAnnotationExpired(oneMinuteAhead, now)).toBe(false)
  })

  it('still expires a savedAt beyond the tolerance window', () => {
    const wellAhead = new Date(now + CLOCK_SKEW_TOLERANCE_MS + 1000).toISOString()
    expect(isAnnotationExpired(wellAhead, now)).toBe(true)
  })

  it('keeps the 24-hour rule and the fail-safe cases', () => {
    expect(isAnnotationExpired(new Date(now - STUDENT_TTL_MS - 1000).toISOString(), now)).toBe(true)
    expect(isAnnotationExpired(new Date(now - 60 * 1000).toISOString(), now)).toBe(false)
    expect(isAnnotationExpired('not-a-date', now)).toBe(true)
    expect(isAnnotationExpired(null, now)).toBe(true)
  })
})

describe('hasPersistableAnnotations covers fZero (BH-32)', () => {
  it('an fZero-only state is persistable, matching what renders', () => {
    const state = /** @type {any} */ ({
      analysis: { markers: [] },
      harmonics: { harmonicSets: [] },
      doppler: { fPlus: null, fMinus: null, fZero: { time: 1, freq: 2 } }
    })
    expect(hasPersistableAnnotations(state)).toBe(true)
  })

  it('an empty state is not', () => {
    const state = /** @type {any} */ ({
      analysis: { markers: [] },
      harmonics: { harmonicSets: [] },
      doppler: { fPlus: null, fMinus: null, fZero: null }
    })
    expect(hasPersistableAnnotations(state)).toBe(false)
  })
})
