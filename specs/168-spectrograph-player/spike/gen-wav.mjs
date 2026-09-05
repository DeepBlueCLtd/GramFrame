// Synthesise a deterministic test WAV: 300 Hz tone + 2 harmonics, a slow chirp,
// and low-level noise. 16-bit PCM mono. Usage: node gen-wav.mjs out.wav seconds sampleRate [stereo]
import { writeFileSync } from 'node:fs'
const [,, out = 'tone.wav', secondsArg = '30', rateArg = '22050', stereoArg = ''] = process.argv
const seconds = Number(secondsArg), rate = Number(rateArg), channels = stereoArg ? 2 : 1
const n = Math.round(seconds * rate)
const data = Buffer.alloc(n * channels * 2)
let seed = 12345
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 - 0.5 }
for (let i = 0; i < n; i++) {
  const t = i / rate
  let v = 0.4 * Math.sin(2 * Math.PI * 300 * t)
        + 0.2 * Math.sin(2 * Math.PI * 600 * t)
        + 0.1 * Math.sin(2 * Math.PI * 900 * t)
        + 0.25 * Math.sin(2 * Math.PI * (1500 + 1500 * (t / seconds)) * t) // chirp 1500->3000 Hz
        + 0.03 * rnd()
  const s = Math.max(-1, Math.min(1, v))
  const int = Math.round(s * 32767)
  for (let c = 0; c < channels; c++) data.writeInt16LE(int, (i * channels + c) * 2)
}
const header = Buffer.alloc(44)
header.write('RIFF', 0); header.writeUInt32LE(36 + data.length, 4); header.write('WAVE', 8)
header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20)
header.writeUInt16LE(channels, 22); header.writeUInt32LE(rate, 24)
header.writeUInt32LE(rate * channels * 2, 28); header.writeUInt16LE(channels * 2, 32); header.writeUInt16LE(16, 34)
header.write('data', 36); header.writeUInt32LE(data.length, 40)
writeFileSync(out, Buffer.concat([header, data]))
console.log(`wrote ${out}: ${seconds}s @ ${rate} Hz, ${channels}ch, ${(44 + data.length) / 1e6} MB`)
