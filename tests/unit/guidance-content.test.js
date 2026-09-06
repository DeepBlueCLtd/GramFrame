import { describe, test, expect } from 'vitest'
import { resolveGuidance, withNavigationGuidance } from '../../src/utils/guidanceContent.js'
import { NAVIGATION_GUIDANCE } from '../../src/utils/navigationGuidance.js'

/**
 * The guidance column's content rules.
 *
 * A mode returns its guidance in one of two shapes and each line in one of two,
 * which is four combinations for a renderer that lives in a DOM module the unit
 * lane cannot load. `resolveGuidance` is where the deciding happens, so this is
 * where it is checked.
 */

describe('resolveGuidance', () => {
  test('the single-section form becomes one untitled section', () => {
    const resolved = resolveGuidance({
      items: [
        { trigger: 'Click', outcome: 'to add a persistent cross' },
        { trigger: 'Right-click', outcome: 'a cross to delete it' }
      ]
    })

    expect(resolved).toHaveLength(1)
    expect(resolved[0].title).toBe('')
    expect(resolved[0].qualifier).toBe('')
    expect(resolved[0].lines).toEqual([
      { trigger: 'Click', outcome: 'to add a persistent cross' },
      { trigger: 'Right-click', outcome: 'a cross to delete it' }
    ])
  })

  test('a title and a qualifier survive the single-section form', () => {
    const resolved = resolveGuidance({
      title: 'In every mode',
      items: [{ trigger: 'Scroll', outcome: 'to pan when zoomed in' }]
    })

    expect(resolved[0].title).toBe('In every mode')
    expect(resolved[0].qualifier).toBe('')
  })

  test('the multi-section form keeps its sections in order', () => {
    const resolved = resolveGuidance({
      sections: [
        { items: [{ trigger: 'Drag', outcome: 'to pan the view when zoomed in' }] },
        { title: 'In every mode', qualifier: 'always', items: NAVIGATION_GUIDANCE }
      ]
    })

    expect(resolved).toHaveLength(2)
    expect(resolved[0].title).toBe('')
    expect(resolved[0].lines[0].trigger).toBe('Drag')
    expect(resolved[1].title).toBe('In every mode')
    expect(resolved[1].qualifier).toBe('always')
    expect(resolved[1].lines).toHaveLength(NAVIGATION_GUIDANCE.length)
  })

  test('a plain string is a line with no trigger, not a dropped line', () => {
    // Pan's version stamp is one of these: it has no gesture to lift out, so it
    // spans both tracks rather than being discarded for lacking a trigger.
    const resolved = resolveGuidance({ items: ['GramFrame v0.1.19'] })

    expect(resolved[0].lines).toEqual([{ trigger: '', outcome: 'GramFrame v0.1.19' }])
  })

  test('the shared navigation lines are all trigger/outcome pairs', () => {
    // They are rendered inside another mode's guidance, so a stray string here
    // would show up as a full-width line in the middle of a scannable column.
    const resolved = resolveGuidance({ items: NAVIGATION_GUIDANCE })

    expect(resolved[0].lines).toHaveLength(4)
    for (const line of resolved[0].lines) {
      expect(line.trigger).not.toBe('')
      expect(line.outcome).not.toBe('')
    }
  })

  test('nothing to say resolves to nothing to draw', () => {
    // Every one of these used to reach the renderer and cost the column a
    // heading's or a row's worth of empty space.
    expect(resolveGuidance(null)).toEqual([])
    expect(resolveGuidance(undefined)).toEqual([])
    expect(resolveGuidance({})).toEqual([])
    expect(resolveGuidance({ items: [] })).toEqual([])
    expect(resolveGuidance({ sections: [] })).toEqual([])
    expect(resolveGuidance({ sections: [{ items: [] }] })).toEqual([])
  })

  test('a titled section with no lines still draws its heading', () => {
    const resolved = resolveGuidance({ sections: [{ title: 'In every mode' }] })

    expect(resolved).toHaveLength(1)
    expect(resolved[0].title).toBe('In every mode')
    expect(resolved[0].lines).toEqual([])
  })

  test('malformed lines are dropped rather than drawn empty', () => {
    // Deliberately malformed, so cast past the type that forbids it: the point
    // is what happens to guidance arriving from outside those types.
    const resolved = resolveGuidance(/** @type {any} */ ({
      items: [
        null,
        { trigger: 'Click' },
        { outcome: 'to do the thing' },
        { trigger: 42, outcome: 7 },
        ''
      ]
    }))

    // A line needs at least one of the two halves to be worth a row.
    expect(resolved[0].lines).toEqual([
      { trigger: 'Click', outcome: '' },
      { trigger: '', outcome: 'to do the thing' }
    ])
  })

  test('a non-object content is refused rather than half-read', () => {
    expect(resolveGuidance(/** @type {any} */ ('some guidance'))).toEqual([])
    expect(resolveGuidance(/** @type {any} */ (42))).toEqual([])
  })
})

describe('withNavigationGuidance', () => {
  test("appends the cross-mode gestures beneath a mode's own lines", () => {
    const sections = withNavigationGuidance({
      title: 'Cross Cursor',
      items: [{ trigger: 'Click', outcome: 'to add a persistent cross' }]
    }).sections

    expect(sections).toHaveLength(2)
    // The column's header names the armed mode, so the mode's own rows come
    // first and the shared ones sit under their own heading beneath them.
    expect(sections[0].title).toBe('Cross Cursor')
    expect(sections[1]).toEqual({ title: 'In every mode', items: [...NAVIGATION_GUIDANCE] })
  })

  test('a mode with no guidance of its own still gets them', () => {
    const sections = withNavigationGuidance(null).sections
    expect(sections).toEqual([{ title: 'In every mode', items: [...NAVIGATION_GUIDANCE] }])
  })

  test('plain notes survive the round trip as plain notes', () => {
    const sections = withNavigationGuidance({
      sections: [{ title: 'Doppler', qualifier: 'three markers', items: ['Place f+ first', { trigger: 'Drag', outcome: 'to move one' }] }]
    }).sections

    expect(sections[0].qualifier).toBe('three markers')
    // A string in, a string out: a note has no trigger to lift into the track.
    expect(sections[0].items).toEqual(['Place f+ first', { trigger: 'Drag', outcome: 'to move one' }])
  })
})
