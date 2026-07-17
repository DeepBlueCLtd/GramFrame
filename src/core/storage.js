/**
 * Browser Storage Adapter for GramFrame
 *
 * Persists user annotations (analysis markers, harmonic sets, doppler curves)
 * in browser storage. Trainers get localStorage (permanent); students get
 * sessionStorage (cleared on browser close).
 *
 * Context detection: a page is treated as a trainer page if ANY of the
 * following is present anywhere on the page:
 *   - an element with id "gf-persistent",
 *   - an element with class "gf-persistent",
 *   - an element carrying the data-gf-persistent attribute, OR
 *   - (legacy) an anchor whose exact text is "ANALYSIS".
 * All other pages are student pages.
 *
 * The class and data-attribute forms exist so the flag can be emitted from a
 * DITA-OT / Oxygen WebHelp publishing pipeline. DITA-OT topic-scopes and
 * uniquifies every @id in its HTML output, so an authored id="gf-persistent"
 * is rewritten to something page-specific and getElementById() never matches.
 * @outputclass, by contrast, is passed straight through to the HTML @class
 * verbatim and un-mangled (this is exactly how table.gram-config is already
 * detected), and classes are not uniquified — so .gf-persistent is reliably
 * emittable from DITA and stable on every page.
 *
 * Student expiry: student-context annotations (sessionStorage) additionally
 * expire 24 hours after they were last saved. On load, a student record older
 * than STUDENT_TTL_MS — or one whose savedAt timestamp is missing, unparseable,
 * or in the future — is discarded (fail-safe toward clearing), protecting the
 * integrity of later assessments. Trainer-context annotations (localStorage)
 * are never aged out and persist indefinitely.
 */

/// <reference path="../types.js" />

/** @type {number} */
const SCHEMA_VERSION = 1

/**
 * Fixed 24-hour student persistence policy. Student-context annotation sets are
 * treated as expired once more than this many milliseconds have elapsed since
 * they were last saved. This is a fixed policy value (per GH issue 184), not an
 * end-user setting. Trainer-context annotations are exempt (permanent).
 * @type {number}
 */
export const STUDENT_TTL_MS = 24 * 60 * 60 * 1000

/** @type {string} */
const KEY_PREFIX = 'gramframe::'

/**
 * CSS selector matching the explicit trainer-persistence flag. Accepts the
 * id, class, or data-attribute form. Exported for unit testing.
 * @type {string}
 */
export const TRAINER_FLAG_SELECTOR = '#gf-persistent, .gf-persistent, [data-gf-persistent]'

/**
 * Detect whether the current page is a trainer or student context.
 * A page is treated as trainer context if EITHER condition holds:
 *   - an explicit persistence flag (id, class, or data-attribute) is present
 *     anywhere on the page (see TRAINER_FLAG_SELECTOR), OR
 *   - (legacy) an anchor element with exact text "ANALYSIS" is present.
 * All other pages are student context.
 * @returns {'trainer' | 'student'}
 */
export function detectUserContext() {
  // Explicit persistence flag: id, class, or data-attribute form.
  if (document.querySelector(TRAINER_FLAG_SELECTOR)) {
    return 'trainer'
  }
  // Legacy detection: an anchor whose exact text is "ANALYSIS"
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
 * Determine whether a student-context annotation set has expired.
 *
 * A record is expired (returns true) when its last-saved timestamp is missing,
 * unparseable, in the future, or older than STUDENT_TTL_MS. This is a pure,
 * side-effect-free predicate — identical output for identical inputs. It is
 * only applied to student-context records; trainer records never call it.
 * @param {string | undefined | null} savedAt - ISO-8601 last-saved timestamp from the stored record
 * @param {number} nowMs - Current wall-clock time in milliseconds (e.g. Date.now())
 * @returns {boolean} True if the record should be treated as expired and discarded
 */
export function isAnnotationExpired(savedAt, nowMs) {
  const t = Date.parse(/** @type {string} */ (savedAt))
  if (Number.isNaN(t)) {
    // Missing or unparseable timestamp — cannot prove freshness, fail safe.
    return true
  }
  const age = nowMs - t
  if (age < 0) {
    // Future timestamp (e.g. clock skew) — treat as expired rather than keep indefinitely.
    return true
  }
  return age > STUDENT_TTL_MS
}

/**
 * Load and validate stored annotations from browser storage.
 * Returns null if no data exists, parsing fails, or version is unrecognised.
 * For student context, also returns null (and removes the stale key) when the
 * stored record has expired per the 24-hour policy (see isAnnotationExpired).
 * Trainer context bypasses the expiry gate entirely (permanent persistence).
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

    // Student-context 24-hour expiry gate. Trainer records are permanent and
    // skip this branch entirely (FR-006). Fail safe toward clearing (FR-009).
    if (context === 'student' && isAnnotationExpired(data.savedAt, Date.now())) {
      console.info('GramFrame: Discarding expired student annotations — last saved:', data.savedAt)
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
