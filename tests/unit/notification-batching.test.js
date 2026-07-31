import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { dispatch, flushDispatch, markAnnotationsChanged } from '../../src/core/state.js'

/**
 * @fileoverview Unit tests for the state-notification dispatcher (spec 166,
 * US4), covering the parts that are observable without a browser: how many
 * deep copies a delivery makes, that none is made with nobody listening, and
 * how the two coalescing tiers combine.
 *
 * Clone counting works by giving the state object a `toJSON` hook. The
 * dispatcher deep-copies with `JSON.parse(JSON.stringify(state))`, and
 * `JSON.stringify` calls `toJSON` when present — so the hook counts copies
 * exactly, without the dispatcher knowing it is being watched.
 */

/**
 * Build a fake instance whose state counts how many times it is deep-copied.
 * @param {Array<Function>} [listeners] - Listeners to register
 * @returns {{instance: any, cloneCount: () => number}} Instance and clone counter
 */
function makeInstance(listeners = []) {
  let clones = 0
  const state = {
    mode: 'pan',
    value: 0,
    toJSON() {
      clones++
      const { toJSON: _omit, ...plain } = this
      return plain
    }
  }
  return {
    instance: { state, stateListeners: listeners },
    cloneCount: () => clones
  }
}

/**
 * Let queued microtasks run.
 * @returns {Promise<void>}
 */
function settleMicrotasks() {
  return Promise.resolve().then(() => {})
}

describe('notification dispatcher', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb) => setTimeout(cb, 16))
    vi.stubGlobal('cancelAnimationFrame', (handle) => clearTimeout(handle))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('N2: exactly one deep copy per delivery', async () => {
    const seen = []
    const { instance, cloneCount } = makeInstance([(state) => seen.push(state)])

    dispatch(instance)
    await settleMicrotasks()

    expect(seen.length).toBe(1)
    expect(cloneCount()).toBe(1)
  })

  test('N2: one copy serves every listener, however many there are', async () => {
    const received = []
    const listeners = [1, 2, 3].map(() => (state) => received.push(state))
    const { instance, cloneCount } = makeInstance(listeners)

    dispatch(instance)
    await settleMicrotasks()

    expect(received.length).toBe(3)
    expect(cloneCount()).toBe(1)
    // All three see the same copy, and it is not the live state
    expect(received[0]).toBe(received[1])
    expect(received[0]).not.toBe(instance.state)
  })

  test('N2: no copy at all when nothing is listening', async () => {
    const { instance, cloneCount } = makeInstance([])

    dispatch(instance)
    await settleMicrotasks()

    expect(cloneCount()).toBe(0)
  })

  test('N3: repeated dispatches in one task coalesce into one delivery', async () => {
    let deliveries = 0
    const { instance, cloneCount } = makeInstance([() => deliveries++])

    for (let i = 0; i < 20; i++) {
      instance.state.value = i
      dispatch(instance)
    }
    await settleMicrotasks()

    expect(deliveries).toBe(1)
    expect(cloneCount()).toBe(1)
  })

  test('N3: the delivery carries the settled state, not an intermediate one', async () => {
    const seen = []
    const { instance } = makeInstance([(state) => seen.push(state.value)])

    instance.state.value = 1
    dispatch(instance)
    instance.state.value = 2
    dispatch(instance)
    instance.state.value = 3
    dispatch(instance)
    await settleMicrotasks()

    expect(seen).toEqual([3])
  })

  test('N4: frame-tier dispatches wait for the frame, not the microtask', async () => {
    let deliveries = 0
    const { instance } = makeInstance([() => deliveries++])

    dispatch(instance, { frame: true })
    await settleMicrotasks()
    expect(deliveries).toBe(0)

    await new Promise((resolve) => setTimeout(resolve, 32))
    expect(deliveries).toBe(1)
  })

  test('a frame-tier dispatch is upgraded by a default-tier one, never delayed', async () => {
    let deliveries = 0
    const { instance } = makeInstance([() => deliveries++])

    dispatch(instance, { frame: true })
    dispatch(instance) // e.g. a mode switch during a drag
    await settleMicrotasks()

    // Delivered on the microtask, not held back to the frame
    expect(deliveries).toBe(1)

    // ...and the superseded frame callback does not deliver a second time
    await new Promise((resolve) => setTimeout(resolve, 32))
    expect(deliveries).toBe(1)
  })

  test('a frame-tier dispatch never downgrades an already-scheduled default one', async () => {
    let deliveries = 0
    const { instance } = makeInstance([() => deliveries++])

    dispatch(instance)
    dispatch(instance, { frame: true })
    await settleMicrotasks()

    expect(deliveries).toBe(1)
  })

  test('N6: flushDispatch delivers synchronously, and only once', async () => {
    let deliveries = 0
    const { instance } = makeInstance([() => deliveries++])

    dispatch(instance)
    flushDispatch(instance)
    expect(deliveries).toBe(1) // synchronous, before any await

    // The scheduled callback finds nothing left to do
    await settleMicrotasks()
    expect(deliveries).toBe(1)
  })

  test('flushDispatch on an instance with nothing pending is a no-op', () => {
    let deliveries = 0
    const { instance } = makeInstance([() => deliveries++])

    flushDispatch(instance)
    expect(deliveries).toBe(0)
  })

  test('a listener that throws does not stop the others', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    let reached = 0
    const { instance } = makeInstance([
      () => { throw new Error('boom') },
      () => { reached++ }
    ])

    dispatch(instance)
    await settleMicrotasks()

    expect(reached).toBe(1)
    expect(errors).toHaveBeenCalled()
    errors.mockRestore()
  })

  test('markAnnotationsChanged bumps the revision the storage gate keys on', () => {
    const { instance } = makeInstance([])
    instance.state.annotationRevision = 0

    markAnnotationsChanged(instance)
    markAnnotationsChanged(instance)

    expect(instance.state.annotationRevision).toBe(2)
  })
})
