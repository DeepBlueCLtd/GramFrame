import { describe, it, expect } from 'vitest'
import { fitImageSize } from '../../src/utils/imageFit.js'

// The two images from issue #345: a wide gram and a snippet cut from it.
const LARGE = { width: 1677, height: 380 }
const SNIPPET = { width: 357, height: 366 }

describe('fitImageSize', () => {
  it('legacy: native below 1200 CSS px, capped at 1200 above it, whatever the room', () => {
    expect(fitImageSize(SNIPPET, 'legacy', { availableWidth: 200, pixelRatio: 1.5 })).toEqual(SNIPPET)
    expect(fitImageSize(LARGE, 'legacy', { availableWidth: 2000, pixelRatio: 1 })).toEqual({ width: 1200, height: 272 })
  })

  it('native: one image pixel per CSS pixel when it fits', () => {
    expect(fitImageSize(LARGE, 'native', { availableWidth: 1700, pixelRatio: 1.5 })).toEqual(LARGE)
    expect(fitImageSize(SNIPPET, 'native', { availableWidth: 1000, pixelRatio: 2 })).toEqual(SNIPPET)
  })

  it('native: shrinks to the available width, keeping the aspect ratio', () => {
    expect(fitImageSize(LARGE, 'native', { availableWidth: 1000, pixelRatio: 1 })).toEqual({ width: 1000, height: 227 })
  })

  it('screen: one image pixel per screen pixel', () => {
    expect(fitImageSize(SNIPPET, 'screen', { availableWidth: 1000, pixelRatio: 1.5 })).toEqual({ width: 238, height: 244 })
    expect(fitImageSize(SNIPPET, 'screen', { availableWidth: 1000, pixelRatio: 1 })).toEqual(SNIPPET)
  })

  it('screen: still shrinks to fit when even the screen-pixel size is too wide', () => {
    expect(fitImageSize(LARGE, 'screen', { availableWidth: 800, pixelRatio: 1.25 })).toEqual({ width: 800, height: 181 })
  })

  it('never enlarges, and keeps native when the room cannot be measured', () => {
    expect(fitImageSize(SNIPPET, 'native', { availableWidth: 0, pixelRatio: 1 })).toEqual(SNIPPET)
    expect(fitImageSize(SNIPPET, 'screen', { availableWidth: 0, pixelRatio: 0 })).toEqual(SNIPPET)
  })
})
