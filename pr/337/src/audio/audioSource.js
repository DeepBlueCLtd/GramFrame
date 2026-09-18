/**
 * Getting the WAV's bytes into the page (spec 168, D2; research.md §3.1, §5.3).
 *
 * Over HTTP(S) a plain `fetch` does it. Over `file://` — the product's
 * air-gapped deployment — Chromium and Edge refuse `fetch` and `XMLHttpRequest`
 * for a sibling file and feed Web Audio silence from a media element, so the
 * only door left open is a `<script>` tag. The loader therefore falls back to a
 * *sidecar*: `<name>.wav.js`, produced by `scripts/wav2js.mjs`, which registers
 * the file's bytes as base64 on `window.GramFrameAudio`. It is looked for only
 * after `fetch` has failed, so pages served over HTTP never need it.
 */

/**
 * The global the sidecar writes to.
 * @typedef {Object<string, string>} SidecarRegistry
 */

/**
 * The basename the sidecar keys its entry by.
 * @param {string} src - The audio URL
 * @returns {string} The last path segment, without query or fragment
 */
function sidecarKey(src) {
  const path = src.split('#')[0].split('?')[0]
  return decodeURIComponent(path.split('/').pop() || path)
}

/**
 * Decode base64 into bytes.
 * @param {string} base64 - The sidecar's payload
 * @returns {ArrayBuffer} The bytes
 */
function base64ToArrayBuffer(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Load the sidecar for `src` and return its bytes.
 * @param {string} src - The audio URL
 * @param {Document} doc - Where to inject the script
 * @returns {Promise<ArrayBuffer>} The WAV bytes
 */
function loadSidecar(src, doc) {
  const key = sidecarKey(src)
  const registry = /** @type {SidecarRegistry|undefined} */ (/** @type {any} */ (window).GramFrameAudio)
  if (registry && typeof registry[key] === 'string') {
    // Already on the page — an author may include the sidecar with a plain
    // <script> tag, or a second instance of the same file may have loaded it.
    return Promise.resolve(base64ToArrayBuffer(registry[key]))
  }

  const sidecarUrl = `${src.split('#')[0]}.js`
  return new Promise((resolve, reject) => {
    const script = doc.createElement('script')
    script.async = true
    script.src = sidecarUrl
    /** @returns {void} */
    const cleanup = () => {
      script.onload = null
      script.onerror = null
      if (script.parentNode) script.parentNode.removeChild(script)
    }
    script.onload = () => {
      cleanup()
      const loaded = /** @type {SidecarRegistry|undefined} */ (/** @type {any} */ (window).GramFrameAudio)
      if (loaded && typeof loaded[key] === 'string') {
        resolve(base64ToArrayBuffer(loaded[key]))
      } else {
        reject(new Error(
          `${sidecarUrl} loaded but did not register "${key}". ` +
          'Regenerate it with: node scripts/wav2js.mjs <file.wav>'
        ))
      }
    }
    script.onerror = () => {
      cleanup()
      reject(new Error(
        `Could not load ${src} (fetch is unavailable on this page — file:// or a network error) ` +
        `and no sidecar was found at ${sidecarUrl}. ` +
        'For file:// distribution generate one with: node scripts/wav2js.mjs <file.wav>'
      ))
    }
    doc.head.appendChild(script)
  })
}

/**
 * Whether a buffer starts with the RIFF/WAVE signature.
 * @param {ArrayBuffer} bytes - Candidate
 * @returns {boolean} True for a WAV header
 */
function looksLikeWav(bytes) {
  if (bytes.byteLength < 12) return false
  const head = new Uint8Array(bytes, 0, 12)
  let text = ''
  for (let i = 0; i < head.length; i++) text += String.fromCharCode(head[i])
  return text.startsWith('RIFF') && text.slice(8) === 'WAVE'
}

/**
 * Fetch the audio file's bytes, falling back to the sidecar.
 *
 * The fallback runs on any fetch failure — a thrown `fetch` (file://, network),
 * a non-2xx status, or a 2xx whose body is not a WAV. The last case is a dev
 * server's single-page fallback answering a missing file with the index page;
 * the sidecar is tried, and if it is absent too the fetched bytes are handed
 * on so the decoder's own message says what was actually received.
 * @param {string} src - The audio URL
 * @param {{doc?: Document}} [options] - Injection target (tests)
 * @returns {Promise<ArrayBuffer>} The WAV bytes
 */
export async function loadAudioBytes(src, options = {}) {
  const doc = options.doc || document
  /** @type {ArrayBuffer|null} */
  let fetched = null
  try {
    const response = await fetch(src)
    if (response.ok) {
      fetched = await response.arrayBuffer()
      if (looksLikeWav(fetched)) {
        return fetched
      }
      console.warn(`GramFrame: fetch of ${src} returned ${fetched.byteLength} bytes that are not a WAV; trying the sidecar`)
    } else {
      console.warn(`GramFrame: fetch of ${src} returned ${response.status}; trying the sidecar`)
    }
  } catch (error) {
    console.warn(`GramFrame: fetch of ${src} failed (${error instanceof Error ? error.message : String(error)}); trying the sidecar`)
  }
  try {
    return await loadSidecar(src, doc)
  } catch (sidecarError) {
    if (fetched) {
      return fetched // let the decoder report what the server actually sent
    }
    throw sidecarError
  }
}
