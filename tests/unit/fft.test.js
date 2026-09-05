import { describe, test, expect } from 'vitest'
import { createFFT, isPowerOfTwo } from '../../src/audio/fft.js'

/**
 * @fileoverview The radix-2 FFT (spec 168): the textbook identities that
 * prove it is a Fourier transform, plus the size guard.
 */

describe('isPowerOfTwo', () => {
  test('accepts powers of two from 2 up', () => {
    ;[2, 4, 8, 1024, 8192].forEach(n => expect(isPowerOfTwo(n)).toBe(true))
  })
  test('rejects everything else', () => {
    ;[0, 1, 3, 6, 1000, 1023, 1.5, -4, NaN].forEach(n => expect(isPowerOfTwo(n)).toBe(false))
  })
})

describe('createFFT', () => {
  test('refuses a non-power-of-two size', () => {
    expect(() => createFFT(1000)).toThrow(/power of two/)
  })

  test('an impulse transforms to a flat spectrum', () => {
    const fft = createFFT(16)
    const re = new Float32Array(16); const im = new Float32Array(16)
    re[0] = 1
    fft.forward(re, im)
    for (let k = 0; k < 16; k++) {
      expect(re[k]).toBeCloseTo(1, 5)
      expect(im[k]).toBeCloseTo(0, 5)
    }
  })

  test('a pure tone lands in its own bin with magnitude N/2', () => {
    const N = 64
    const bin = 5
    const fft = createFFT(N)
    const re = new Float32Array(N); const im = new Float32Array(N)
    for (let n = 0; n < N; n++) re[n] = Math.cos(2 * Math.PI * bin * n / N)
    fft.forward(re, im)
    const mags = Array.from(re, (r, k) => Math.hypot(r, im[k]))
    expect(mags[bin]).toBeCloseTo(N / 2, 3)
    expect(mags[N - bin]).toBeCloseTo(N / 2, 3)
    mags.forEach((m, k) => {
      if (k !== bin && k !== N - bin) expect(m).toBeLessThan(1e-3)
    })
  })

  test("Parseval: energy is preserved (sum |X|^2 = N * sum |x|^2)", () => {
    const N = 256
    const fft = createFFT(N)
    const re = new Float32Array(N); const im = new Float32Array(N)
    let seed = 7
    for (let n = 0; n < N; n++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; re[n] = seed / 0x7fffffff - 0.5 }
    const timeEnergy = re.reduce((s, v) => s + v * v, 0)
    fft.forward(re, im)
    let freqEnergy = 0
    for (let k = 0; k < N; k++) freqEnergy += re[k] * re[k] + im[k] * im[k]
    expect(freqEnergy / N).toBeCloseTo(timeEnergy, 3)
  })

  test('is deterministic: the same input gives identical output twice', () => {
    const fft = createFFT(32)
    const make = () => { const a = new Float32Array(32); for (let i = 0; i < 32; i++) a[i] = Math.sin(i * 0.7) + Math.cos(i * 1.9); return a }
    const re1 = make(); const im1 = new Float32Array(32); fft.forward(re1, im1)
    const re2 = make(); const im2 = new Float32Array(32); fft.forward(re2, im2)
    expect(Array.from(re1)).toEqual(Array.from(re2))
    expect(Array.from(im1)).toEqual(Array.from(im2))
  })

  test('refuses arrays of the wrong length', () => {
    const fft = createFFT(8)
    expect(() => fft.forward(new Float32Array(4), new Float32Array(8))).toThrow(/length/)
  })
})
