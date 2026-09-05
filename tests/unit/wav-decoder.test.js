import { describe, test, expect } from 'vitest'
import { decodeWav } from '../../src/audio/wavDecoder.js'

/**
 * @fileoverview The WAV decoder (spec 168, FR-005): every supported sample
 * format decodes to the same normalised mono signal, stereo is mixed by
 * averaging, and every malformed or unsupported file names its problem.
 */

/**
 * Build a WAV in memory.
 * @param {Object} opts - Layout
 * @param {number} opts.channels - Channel count
 * @param {number} opts.sampleRate - Sample rate
 * @param {number} opts.bits - Bits per sample
 * @param {'pcm'|'float'|'extensible-pcm'} [opts.kind='pcm'] - Format tag family
 * @param {number[][]} opts.frames - One array per frame, one value per channel, in [-1, 1]
 * @param {boolean} [opts.zeroDataSize] - Write 0 as the data chunk size (streaming encoders)
 * @returns {ArrayBuffer} The file
 */
function buildWav({ channels, sampleRate, bits, kind = 'pcm', frames, zeroDataSize = false }) {
  const bytesPerSample = bits / 8
  const fmtSize = kind === 'extensible-pcm' ? 40 : 16
  const dataSize = frames.length * channels * bytesPerSample
  const buffer = new ArrayBuffer(12 + 8 + fmtSize + 8 + dataSize + (dataSize % 2))
  const view = new DataView(buffer)
  const ascii = (/** @type {number} */ offset, /** @type {string} */ text) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i))
  }
  ascii(0, 'RIFF'); view.setUint32(4, buffer.byteLength - 8, true); ascii(8, 'WAVE')
  ascii(12, 'fmt '); view.setUint32(16, fmtSize, true)
  const tag = kind === 'float' ? 3 : kind === 'extensible-pcm' ? 0xFFFE : 1
  view.setUint16(20, tag, true)
  view.setUint16(22, channels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * channels * bytesPerSample, true)
  view.setUint16(32, channels * bytesPerSample, true)
  view.setUint16(34, bits, true)
  if (kind === 'extensible-pcm') {
    view.setUint16(36, 22, true)   // cbSize
    view.setUint16(38, bits, true) // valid bits
    view.setUint32(40, 0, true)    // channel mask
    view.setUint16(44, 1, true)    // sub-format: PCM
  }
  const dataOffset = 20 + fmtSize
  ascii(dataOffset, 'data'); view.setUint32(dataOffset + 4, zeroDataSize ? 0 : dataSize, true)
  let pos = dataOffset + 8
  for (const frame of frames) {
    for (const value of frame) {
      if (kind === 'float') { view.setFloat32(pos, value, true) } else if (bits === 8) { view.setUint8(pos, Math.round(value * 127) + 128) } else if (bits === 16) { view.setInt16(pos, Math.round(value * 32767), true) } else if (bits === 24) {
        const int = Math.round(value * 8388607)
        view.setUint8(pos, int & 0xFF); view.setUint8(pos + 1, (int >> 8) & 0xFF); view.setUint8(pos + 2, (int >> 16) & 0xFF)
      } else { view.setInt32(pos, Math.round(value * 2147483647), true) }
      pos += bytesPerSample
    }
  }
  return buffer
}

const SIGNAL = [0, 0.5, -0.5, 1, -1, 0.25]

describe('decodeWav — sample formats (FR-005)', () => {
  test.each([
    ['8-bit PCM', 8, 'pcm', 0.01],
    ['16-bit PCM', 16, 'pcm', 1e-4],
    ['24-bit PCM', 24, 'pcm', 1e-6],
    ['32-bit PCM', 32, 'pcm', 1e-8],
    ['32-bit float', 32, 'float', 1e-7],
    ['16-bit PCM inside WAVE_FORMAT_EXTENSIBLE', 16, 'extensible-pcm', 1e-4]
  ])('%s decodes to the normalised signal', (_label, bits, kind, tolerance) => {
    const wav = buildWav({ channels: 1, sampleRate: 8000, bits, kind: /** @type {any} */ (kind), frames: SIGNAL.map(v => [v]) })
    const decoded = decodeWav(wav)
    expect(decoded.sampleRate).toBe(8000)
    expect(decoded.channels).toBe(1)
    expect(decoded.samples.length).toBe(SIGNAL.length)
    expect(decoded.duration).toBeCloseTo(SIGNAL.length / 8000, 9)
    SIGNAL.forEach((v, i) => expect(Math.abs(decoded.samples[i] - v)).toBeLessThan(tolerance))
  })

  test('stereo is mixed to mono by averaging, and reports 2 channels', () => {
    const wav = buildWav({ channels: 2, sampleRate: 44100, bits: 16, frames: [[1, 0], [0.5, -0.5], [-1, -1]] })
    const decoded = decodeWav(wav)
    expect(decoded.channels).toBe(2)
    expect(decoded.samples.length).toBe(3)
    expect(decoded.samples[0]).toBeCloseTo(0.5, 3)
    expect(decoded.samples[1]).toBeCloseTo(0, 3)
    expect(decoded.samples[2]).toBeCloseTo(-1, 3)
  })

  test('a zero data-chunk size (streaming encoder) reads to the end of the file', () => {
    const wav = buildWav({ channels: 1, sampleRate: 8000, bits: 16, frames: SIGNAL.map(v => [v]), zeroDataSize: true })
    expect(decodeWav(wav).samples.length).toBe(SIGNAL.length)
  })
})

describe('decodeWav — refusals (FR-007)', () => {
  test('not a RIFF/WAVE file', () => {
    const bytes = new TextEncoder().encode('OggS this is not a wav file at all').buffer
    expect(() => decodeWav(/** @type {ArrayBuffer} */ (bytes))).toThrow(/Not a WAV file/)
  })

  test('too short to be a WAV', () => {
    expect(() => decodeWav(new ArrayBuffer(4))).toThrow(/too short/)
  })

  test('an unsupported format tag names the tag', () => {
    const wav = buildWav({ channels: 1, sampleRate: 8000, bits: 16, frames: [[0]] })
    new DataView(wav).setUint16(20, 85, true) // MP3 inside a WAV container
    expect(() => decodeWav(wav)).toThrow(/format tag 85/)
  })

  test('an unsupported PCM width names the width', () => {
    const wav = buildWav({ channels: 1, sampleRate: 8000, bits: 16, frames: [[0]] })
    new DataView(wav).setUint16(34, 12, true)
    expect(() => decodeWav(wav)).toThrow(/12-bit PCM/)
  })

  test('a float file that is not 32-bit is refused', () => {
    const wav = buildWav({ channels: 1, sampleRate: 8000, bits: 32, kind: 'float', frames: [[0]] })
    new DataView(wav).setUint16(34, 64, true)
    expect(() => decodeWav(wav)).toThrow(/64-bit float/)
  })

  test('a missing data chunk is reported', () => {
    const wav = buildWav({ channels: 1, sampleRate: 8000, bits: 16, frames: [[0]] })
    const view = new DataView(wav)
    // Rename the data chunk so the walker never finds one
    'junk'.split('').forEach((c, i) => view.setUint8(36 + i, c.charCodeAt(0)))
    expect(() => decodeWav(wav)).toThrow(/no "data" chunk/)
  })
})
