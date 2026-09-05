import { describe, test, expect, vi } from 'vitest'
import { BaseDragHandler } from '../../src/modes/shared/BaseDragHandler.js'
import { IDLE_CURSOR, featureCursor } from '../../src/utils/cursors.js'

const FEATURE_HOVER_CURSOR = featureCursor('hover')
const FEATURE_DRAG_CURSOR = featureCursor('drag')

/**
 * @fileoverview Unit tests for the drag engine's hover contract (regression
 * for the harmonic-hover bug).
 *
 * `resolveTarget` is allowed to have side effects — the harmonics `create` and
 * doppler `place` kinds mint their feature inside it, on mousedown. Hover is
 * not a mousedown: `updateCursorForHover` must therefore prefer the
 * side-effect-free `resolveHoverTarget` when the mode supplies one, and must
 * never start a drag. When the fallback to `resolveTarget` broke this (the
 * engine used the minting resolver for hover), every mousemove over the gram
 * created a harmonic set.
 */

/**
 * Build a minimal fake GramFrame instance for the handler.
 * @returns {any} Fake instance
 */
function makeInstance() {
  return {
    state: { drag: { active: false } },
    notifyStateListeners: () => {}
  }
}

/**
 * A target descriptor like a mode resolver would return.
 * @returns {any} Drag target
 */
const someTarget = () => ({ kind: 'move', id: 'set-1', type: 'harmonicSet', position: null, data: {} })

describe('BaseDragHandler hover contract', () => {
  test('hover uses resolveHoverTarget and never calls resolveTarget', () => {
    const resolveTarget = vi.fn(someTarget)
    const resolveHoverTarget = vi.fn(() => null)
    const updateCursor = vi.fn()
    const handler = new BaseDragHandler(makeInstance(), {
      resolveTarget,
      resolveHoverTarget,
      onDragStart: vi.fn(),
      onDragMove: vi.fn(),
      onDragEnd: vi.fn(),
      updateCursor
    }, 'harmonics')

    handler.updateCursorForHover({ freq: 10, time: 5 })

    // The minting resolver must not run on a hover — that is the bug.
    expect(resolveTarget).not.toHaveBeenCalled()
    expect(resolveHoverTarget).toHaveBeenCalledTimes(1)
    expect(updateCursor).toHaveBeenCalledWith(IDLE_CURSOR)
  })

  test('hover over a found target shows the feature-hover cursor', () => {
    const updateCursor = vi.fn()
    const handler = new BaseDragHandler(makeInstance(), {
      resolveTarget: vi.fn(someTarget),
      resolveHoverTarget: vi.fn(someTarget),
      onDragStart: vi.fn(),
      onDragMove: vi.fn(),
      onDragEnd: vi.fn(),
      updateCursor
    }, 'harmonics')

    handler.updateCursorForHover({ freq: 10, time: 5 })

    expect(updateCursor).toHaveBeenCalledWith(FEATURE_HOVER_CURSOR)
  })

  test('hover falls back to resolveTarget when no hover resolver is supplied', () => {
    // The fallback is only safe for modes whose resolver is pure (analysis,
    // pan) — this pins the fallback so those modes keep their hover cursor.
    const resolveTarget = vi.fn(someTarget)
    const updateCursor = vi.fn()
    const handler = new BaseDragHandler(makeInstance(), {
      resolveTarget,
      onDragStart: vi.fn(),
      onDragMove: vi.fn(),
      onDragEnd: vi.fn(),
      updateCursor
    }, 'analysis')

    handler.updateCursorForHover({ freq: 10, time: 5 })

    expect(resolveTarget).toHaveBeenCalledTimes(1)
    expect(updateCursor).toHaveBeenCalledWith(FEATURE_HOVER_CURSOR)
  })

  test('hover never starts a drag or touches the drag projection', () => {
    const instance = makeInstance()
    const onDragStart = vi.fn()
    const handler = new BaseDragHandler(instance, {
      resolveTarget: vi.fn(someTarget),
      resolveHoverTarget: vi.fn(someTarget),
      onDragStart,
      onDragMove: vi.fn(),
      onDragEnd: vi.fn(),
      updateCursor: vi.fn()
    }, 'harmonics')

    handler.updateCursorForHover({ freq: 10, time: 5 })

    expect(handler.isDragging()).toBe(false)
    expect(onDragStart).not.toHaveBeenCalled()
    expect(instance.state.drag).toEqual({ active: false })
  })

  test('a mode sees the phase, not a cursor string, and can override per kind', () => {
    // Pan mode keeps the hand this way. The engine used to pass the CSS value
    // it would otherwise apply, so overriding modes had to sniff it
    // (`fallback === 'grabbing'`) and broke the moment that string changed.
    /** @type {any[]} */
    /** @type {any[]} */
    const seen = []
    const updateCursor = vi.fn()
    const handler = new BaseDragHandler(makeInstance(), {
      resolveTarget: vi.fn(someTarget),
      resolveHoverTarget: vi.fn(someTarget),
      onDragStart: vi.fn(),
      onDragMove: vi.fn(),
      onDragEnd: vi.fn(),
      updateCursor,
      cursorFor: (kind, phase) => {
        seen.push({ kind, phase })
        return phase === 'drag' ? 'grabbing' : null
      }
    }, 'pan')

    handler.updateCursorForHover({ freq: 10, time: 5 })
    expect(seen[seen.length - 1]).toEqual({ kind: 'move', phase: 'hover' })

    handler.startDrag({ freq: 10, time: 5 })
    expect(seen[seen.length - 1]).toEqual({ kind: 'move', phase: 'drag' })
    expect(updateCursor).toHaveBeenLastCalledWith('grabbing')

    handler.endDrag({ freq: 11, time: 6 })
    expect(seen[seen.length - 1]).toEqual({ kind: 'move', phase: 'idle' })
  })

  test('a null from cursorFor takes the default for that phase', () => {
    const updateCursor = vi.fn()
    const handler = new BaseDragHandler(makeInstance(), {
      resolveTarget: vi.fn(someTarget),
      resolveHoverTarget: vi.fn(someTarget),
      onDragStart: vi.fn(),
      onDragMove: vi.fn(),
      onDragEnd: vi.fn(),
      updateCursor,
      cursorFor: () => null
    }, 'harmonics')

    handler.startDrag({ freq: 10, time: 5 })

    expect(updateCursor).toHaveBeenLastCalledWith(FEATURE_DRAG_CURSOR)
  })

  test('hover with nothing under the pointer reports a null kind', () => {
    // So a mode's cursorFor can tell "resting over the gram" apart from
    // "resting after a drag of some kind ended".
    /** @type {any[]} */
    const seen = []
    const handler = new BaseDragHandler(makeInstance(), {
      resolveTarget: vi.fn(() => null),
      resolveHoverTarget: vi.fn(() => null),
      onDragStart: vi.fn(),
      onDragMove: vi.fn(),
      onDragEnd: vi.fn(),
      updateCursor: vi.fn(),
      cursorFor: (kind, phase) => { seen.push({ kind, phase }); return null }
    }, 'analysis')

    handler.updateCursorForHover({ freq: 10, time: 5 })

    expect(seen).toEqual([{ kind: null, phase: 'idle' }])
  })

  test('hover during an active drag is ignored entirely', () => {
    const resolveHoverTarget = vi.fn(() => null)
    const updateCursor = vi.fn()
    const handler = new BaseDragHandler(makeInstance(), {
      resolveTarget: vi.fn(someTarget),
      resolveHoverTarget,
      onDragStart: vi.fn(),
      onDragMove: vi.fn(),
      onDragEnd: vi.fn(),
      updateCursor
    }, 'harmonics')

    handler.startDrag({ freq: 10, time: 5 })
    updateCursor.mockClear()
    resolveHoverTarget.mockClear()

    handler.updateCursorForHover({ freq: 12, time: 6 })

    expect(resolveHoverTarget).not.toHaveBeenCalled()
    expect(updateCursor).not.toHaveBeenCalled()
  })
})
