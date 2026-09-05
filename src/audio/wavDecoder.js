/**
 * RIFF/WAVE decoder for the spectrograph player (spec 168, FR-005).
 *
 * The component decodes its own audio rather than calling
 * `AudioContext.decodeAudioData` for two reasons the spike measured
 * (research.md §1.5): the Web Audio path resamples every file to the context's
 * rate — a 22,050 Hz recording came back at 44,100 Hz, silently halving the
 * frequency resolution of every bin — and it needs an `AudioContext`, which
 * the player otherwise has no use for. A WAV header is 44 bytes of documented
 * layout; reading it is cheaper than working around either.
 *
 * Accepts PCM 8/16/24/32-bit and IEEE float 32-bit, plain or wrapped in
 * WAVE_FORMAT_EXTENSIBLE, mono or multi-channel (mixed to mono by averaging).
 * Anything else throws with a message naming what was found, which FR-007
 * surfaces beside the config table.
 *
 * Pure: no DOM, no globals. Exercised in the Vitest lane.
 */

/**
 * A decoded recording.
 * @typedef {Object} DecodedAudio
 * @property {Float32Array} samples - Mono samples in [-1, 1]
 * @property {number} sampleRate - Samples per second
 * @property {number} channels - Channel count as stored in the file (before mixing)
 * @property {number} duration - Seconds, `samples.length / sampleRate`
 */

/** WAVE format tags this decoder understands. */
const FORMAT_PCM = 1
const FORMAT_IEEE_FLOAT = 3
const FORMAT_EXTENSIBLE = 0xFFFE

/**
 * Read a four-character chunk id.
 * @param {DataView} view - The file
 * @param {number} offset - Byte offset of the id
 * @returns {string} The id, e.g. `'RIFF'`
 */
function fourCC(view, offset) {
  return String.fromCharCode(
    view.getUint8(offset), view.getUint8(offset + 1),
    view.getUint8(offset + 2), view.getUint8(offset + 3)
  )
}

/**
 * Decode a WAV file.
 * @param {ArrayBuffer} buffer - The file's bytes
 * @returns {DecodedAudio} The decoded, mono-mixed recording
 * @throws {Error} When the file is not a WAV this decoder supports
 */
export function decodeWav(buffer) {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 12) {
    throw new Error('Not a WAV file: too short to hold a RIFF header')
  }
  const view = new DataView(buffer)
  if (fourCC(view, 0) !== 'RIFF' || fourCC(view, 8) !== 'WAVE') {
    throw new Error(`Not a WAV file: expected a RIFF/WAVE header, found "${fourCC(view, 0)}"/"${fourCC(view, 8)}"`)
  }

  /** @type {{formatTag: number, channels: number, sampleRate: number, bitsPerSample: number}|null} */
  let format = null
  /** @type {{offset: number, length: number}|null} */
  let data = null

  // Walk the chunk list. Chunks are word-aligned: an odd-length chunk is
  // followed by one pad byte that its declared size does not include.
  let offset = 12
  while (offset + 8 <= view.byteLength) {
    const id = fourCC(view, offset)
    const size = view.getUint32(offset + 4, true)
    const body = offset + 8
    if (id === 'fmt ') {
      if (size < 16) {
        throw new Error(`Malformed WAV: "fmt " chunk is ${size} bytes, expected at least 16`)
      }
      let formatTag = view.getUint16(body, true)
      const channels = view.getUint16(body + 2, true)
      const sampleRate = view.getUint32(body + 4, true)
      const bitsPerSample = view.getUint16(body + 14, true)
      if (formatTag === FORMAT_EXTENSIBLE) {
        // The real format is the first two bytes of the sub-format GUID,
        // at byte 24 of the chunk body (after cbSize and validBitsPerSample).
        if (size < 26) {
          throw new Error('Malformed WAV: WAVE_FORMAT_EXTENSIBLE header is truncated')
        }
        formatTag = view.getUint16(body + 24, true)
      }
      format = { formatTag, channels, sampleRate, bitsPerSample }
    } else if (id === 'data') {
      // A streaming encoder may write 0 or 0xFFFFFFFF for an unknown length;
      // in either case the data runs to the end of the file.
      const available = view.byteLength - body
      const length = (size === 0 || size === 0xFFFFFFFF || size > available) ? available : size
      data = { offset: body, length }
    }
    offset = body + size + (size % 2)
  }

  if (!format) {
    throw new Error('Malformed WAV: no "fmt " chunk')
  }
  if (!data) {
    throw new Error('Malformed WAV: no "data" chunk')
  }
  if (format.channels < 1) {
    throw new Error('Malformed WAV: channel count is 0')
  }
  if (format.sampleRate < 1) {
    throw new Error('Malformed WAV: sample rate is 0')
  }

  const { formatTag, channels, sampleRate, bitsPerSample } = format
  const isFloat = formatTag === FORMAT_IEEE_FLOAT
  if (formatTag !== FORMAT_PCM && !isFloat) {
    throw new Error(`Unsupported WAV format tag ${formatTag}: only PCM (1) and IEEE float (3) are supported`)
  }
  if (isFloat && bitsPerSample !== 32) {
    throw new Error(`Unsupported WAV: ${bitsPerSample}-bit float; only 32-bit float is supported`)
  }
  if (!isFloat && ![8, 16, 24, 32].includes(bitsPerSample)) {
    throw new Error(`Unsupported WAV: ${bitsPerSample}-bit PCM; only 8, 16, 24 and 32-bit PCM are supported`)
  }

  const bytesPerSample = bitsPerSample / 8
  const frameBytes = bytesPerSample * channels
  const frameCount = Math.floor(data.length / frameBytes)
  if (frameCount === 0) {
    throw new Error('Malformed WAV: the "data" chunk holds no complete sample frame')
  }

  const samples = new Float32Array(frameCount)
  const scale = 1 / channels
  let pos = data.offset

  // One loop per format rather than a per-sample switch: the 16-bit case is
  // the common one and runs ~3× faster without the branch inside it.
  if (isFloat) {
    for (let i = 0; i < frameCount; i++) {
      let sum = 0
      for (let c = 0; c < channels; c++) { sum += view.getFloat32(pos, true); pos += 4 }
      samples[i] = sum * scale
    }
  } else if (bitsPerSample === 16) {
    const k = scale / 32768
    for (let i = 0; i < frameCount; i++) {
      let sum = 0
      for (let c = 0; c < channels; c++) { sum += view.getInt16(pos, true); pos += 2 }
      samples[i] = sum * k
    }
  } else if (bitsPerSample === 8) {
    // 8-bit WAV is unsigned, centred on 128.
    const k = scale / 128
    for (let i = 0; i < frameCount; i++) {
      let sum = 0
      for (let c = 0; c < channels; c++) { sum += view.getUint8(pos) - 128; pos += 1 }
      samples[i] = sum * k
    }
  } else if (bitsPerSample === 24) {
    const k = scale / 8388608
    for (let i = 0; i < frameCount; i++) {
      let sum = 0
      for (let c = 0; c < channels; c++) {
        // Little-endian 24-bit two's complement, sign-extended via << 8 >> 8.
        const raw = view.getUint8(pos) | (view.getUint8(pos + 1) << 8) | (view.getUint8(pos + 2) << 16)
        sum += (raw << 8) >> 8
        pos += 3
      }
      samples[i] = sum * k
    }
  } else {
    const k = scale / 2147483648
    for (let i = 0; i < frameCount; i++) {
      let sum = 0
      for (let c = 0; c < channels; c++) { sum += view.getInt32(pos, true); pos += 4 }
      samples[i] = sum * k
    }
  }

  return { samples, sampleRate, channels, duration: frameCount / sampleRate }
}
