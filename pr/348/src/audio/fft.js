/**
 * Radix-2 fast Fourier transform for the spectrograph player (spec 168).
 *
 * Iterative Cooley–Tukey, decimation in time, in place on a pair of
 * `Float32Array`s, with the bit-reversal permutation and the twiddle factors
 * computed once per size and reused for every frame. The spike measured this
 * at 1.9 s for the 15,502 frames of a three-minute 44.1 kHz file (research.md
 * §3.2) — comfortably inside SC-002 without a library, which is why none was
 * adopted (research.md §5).
 *
 * Deterministic: no allocation and no data-dependent branching inside
 * `forward`, so the same input always yields the same bins (FR-001 (j)).
 *
 * References: Cooley & Tukey, "An algorithm for the machine calculation of
 * complex Fourier series", Math. Comp. 19 (1965); the iterative formulation as
 * given in Press et al., *Numerical Recipes*, §12.2.
 *
 * Pure: no DOM, no globals. Exercised in the Vitest lane.
 */

/**
 * A transform bound to one size.
 * @typedef {Object} FFT
 * @property {number} size - Transform length, a power of two
 * @property {function(Float32Array, Float32Array): void} forward - In-place
 *   forward transform of `re`/`im`, each of length `size`. Unnormalised: the
 *   inverse would divide by `size`.
 */

/**
 * Whether a number is a power of two (and at least 2).
 * @param {number} n - Candidate
 * @returns {boolean} True for 2, 4, 8, …
 */
export function isPowerOfTwo(n) {
  return Number.isInteger(n) && n >= 2 && (n & (n - 1)) === 0
}

/**
 * Build a transform for one size.
 * @param {number} size - Power of two ≥ 2
 * @returns {FFT} The transform
 * @throws {Error} When `size` is not a power of two
 */
export function createFFT(size) {
  if (!isPowerOfTwo(size)) {
    throw new Error(`FFT size must be a power of two, got ${size}`)
  }
  const bits = Math.log2(size)

  // Bit-reversal permutation table.
  const reversed = new Uint32Array(size)
  for (let i = 0; i < size; i++) {
    let r = 0
    let x = i
    for (let b = 0; b < bits; b++) {
      r = (r << 1) | (x & 1)
      x >>= 1
    }
    reversed[i] = r
  }

  // Twiddle factors e^(-2πik/N) for k in [0, N/2).
  const half = size / 2
  const cos = new Float32Array(half)
  const sin = new Float32Array(half)
  for (let k = 0; k < half; k++) {
    const angle = -2 * Math.PI * k / size
    cos[k] = Math.cos(angle)
    sin[k] = Math.sin(angle)
  }

  /**
   * @param {Float32Array} re - Real parts, transformed in place
   * @param {Float32Array} im - Imaginary parts, transformed in place
   */
  function forward(re, im) {
    if (re.length !== size || im.length !== size) {
      throw new Error(`FFT of size ${size} given arrays of length ${re.length}/${im.length}`)
    }
    // Permute into bit-reversed order.
    for (let i = 0; i < size; i++) {
      const j = reversed[i]
      if (j > i) {
        let t = re[i]; re[i] = re[j]; re[j] = t
        t = im[i]; im[i] = im[j]; im[j] = t
      }
    }
    // Butterflies, doubling the span each stage.
    for (let span = 2; span <= size; span <<= 1) {
      const halfSpan = span >> 1
      const stride = size / span
      for (let start = 0; start < size; start += span) {
        for (let k = 0; k < halfSpan; k++) {
          const wr = cos[k * stride]
          const wi = sin[k * stride]
          const a = start + k
          const b = a + halfSpan
          const xr = re[b] * wr - im[b] * wi
          const xi = re[b] * wi + im[b] * wr
          re[b] = re[a] - xr
          im[b] = im[a] - xi
          re[a] += xr
          im[a] += xi
        }
      }
    }
  }

  return { size, forward }
}
