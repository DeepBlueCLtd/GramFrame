/**
 * Browser Storage Adapter for GramFrame
 *
 * Persists user annotations (analysis markers, harmonic sets, doppler curves)
 * in browser storage. Trainers get localStorage (permanent); students get
 * sessionStorage (cleared on browser close).
 *
 * Context detection: pages with an anchor containing exact text "ANALYSIS"
 * are trainer pages; all others are student pages.
 */

/// <reference path="../types.js" />

/** @type {number} */
const SCHEMA_VERSION = 1

/** @type {string} */
const KEY_PREFIX = 'gramframe::'

/**
 * Detect whether the current page is a trainer or student context.
 * Trainer pages contain an anchor element with exact text "ANALYSIS".
 * @returns {'trainer' | 'student'}
 */
export function detectUserContext() {
  const anchors = document.querySelectorAll('a')
  for (let i = 0; i < anchors.length; i++) {
    if (anchors[i].textContent && anchors[i].textContent.trim() === 'ANALYSIS') {
      return 'trainer'
    }
  }
  return 'student'
}

/**
 * Get the appropriate Storage object for the detected context.
 * Returns null if storage is unavailable.
 * @param {'trainer' | 'student'} context
 * @returns {Storage | null}
 */
export function getStorage(context) {
  try {
    const storage = context === 'trainer' ? localStorage : sessionStorage
    // Probe write/read to confirm availability
    const testKey = '__gramframe_test__'
    storage.setItem(testKey, '1')
    storage.removeItem(testKey)
    return storage
  } catch {
    return null
  }
}

/**
 * Build a namespaced storage key from the current page path.
 * @param {number} [instanceIndex] - Zero-based index when multiple instances exist on the same page
 * @returns {string}
 */
export function buildStorageKey(instanceIndex) {
  const pathname = window.location.pathname
  if (instanceIndex != null && instanceIndex > 0) {
    return `${KEY_PREFIX}${pathname}::${instanceIndex}`
  }
  return `${KEY_PREFIX}${pathname}`
}

/**
 * Extract annotation data from GramFrame state and save to storage.
 * Only writes when there is at least one annotation present.
 * @param {GramFrameState} state - Current component state
 * @param {number} [instanceIndex] - Instance index for multi-instance pages
 * @returns {boolean} True if saved successfully
 */
export function saveAnnotations(state, instanceIndex) {
  try {
    const context = detectUserContext()
    const storage = getStorage(context)
    if (!storage) return false

    const hasMarkers = state.analysis && state.analysis.markers && state.analysis.markers.length > 0
    const hasHarmonics = state.harmonics && state.harmonics.harmonicSets && state.harmonics.harmonicSets.length > 0
    const hasDoppler = state.doppler && (state.doppler.fPlus !== null || state.doppler.fMinus !== null)

    if (!hasMarkers && !hasHarmonics && !hasDoppler) {
      // No annotations — remove any existing entry rather than storing empty data
      const key = buildStorageKey(instanceIndex)
      storage.removeItem(key)
      return true
    }

    /** @type {StoredAnnotations} */
    const data = {
      version: SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
      analysis: {
        markers: (state.analysis && state.analysis.markers || []).map(m => ({
          id: m.id,
          color: m.color,
          time: m.time,
          freq: m.freq
        }))
      },
      harmonics: {
        harmonicSets: (state.harmonics && state.harmonics.harmonicSets || []).map(hs => ({
          id: hs.id,
          color: hs.color,
          anchorTime: hs.anchorTime,
          spacing: hs.spacing
        }))
      },
      doppler: {
        fPlus: state.doppler && state.doppler.fPlus ? { time: state.doppler.fPlus.time, freq: state.doppler.fPlus.freq } : null,
        fMinus: state.doppler && state.doppler.fMinus ? { time: state.doppler.fMinus.time, freq: state.doppler.fMinus.freq } : null,
        fZero: state.doppler && state.doppler.fZero ? { time: state.doppler.fZero.time, freq: state.doppler.fZero.freq } : null,
        color: state.doppler && state.doppler.color || null
      }
    }

    const key = buildStorageKey(instanceIndex)
    storage.setItem(key, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

/**
 * Load and validate stored annotations from browser storage.
 * Returns null if no data exists, parsing fails, or version is unrecognised.
 * @param {number} [instanceIndex] - Instance index for multi-instance pages
 * @returns {StoredAnnotations | null}
 */
export function loadAnnotations(instanceIndex) {
  try {
    const context = detectUserContext()
    const storage = getStorage(context)
    if (!storage) return null

    const key = buildStorageKey(instanceIndex)
    const raw = storage.getItem(key)
    if (!raw) return null

    const data = JSON.parse(raw)

    if (!data || data.version !== SCHEMA_VERSION) {
      console.warn('GramFrame: Discarding stored annotations — unrecognised schema version:', data && data.version)
      storage.removeItem(key)
      return null
    }

    return /** @type {StoredAnnotations} */ (data)
  } catch {
    console.warn('GramFrame: Failed to load stored annotations — data discarded')
    return null
  }
}

/**
 * Remove stored annotations for the current page.
 * @param {number} [instanceIndex] - Instance index for multi-instance pages
 * @returns {boolean} True if cleared successfully
 */
export function clearAnnotations(instanceIndex) {
  try {
    const context = detectUserContext()
    const storage = getStorage(context)
    if (!storage) return false

    const key = buildStorageKey(instanceIndex)
    storage.removeItem(key)
    return true
  } catch {
    return false
  }
}
