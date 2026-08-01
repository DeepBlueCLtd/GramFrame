/**
 * Browser Storage Adapter for GramFrame
 *
 * Persists user annotations (analysis markers, harmonic sets, doppler curves)
 * in browser storage. Trainers get localStorage (permanent); students get
 * sessionStorage (cleared on browser close).
 *
 * Student persistence is additionally capped at 24 hours (feature 157): on
 * load, a student-context record whose `savedAt` is older than
 * STUDENT_TTL_MS — or missing, unparseable, or in the future — is discarded
 * and its key removed (fail-safe toward clearing). Trainer-context records are
 * exempt and remain permanent regardless of age. See isAnnotationExpired().
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
 */

/// <reference path="../types.js" />

/** @type {number} */
const SCHEMA_VERSION = 1

/**
 * Fixed 24-hour student persistence policy. Student-context annotations older
 * than this (measured from their last-save `savedAt`) are discarded on load.
 * This is a fixed policy — not HTML-configurable — so it lives as a named
 * constant. Trainer-context records are never subject to it.
 *
 * Exported as a test-only seam: the expiry specs assert against it directly.
 * @type {number}
 */
export const STUDENT_TTL_MS = 24 * 60 * 60 * 1000

/** @type {string} */
const KEY_PREFIX = 'gramframe::'

/**
 * Storage key for the harmonic-pin visibility preference.
 *
 * Deliberately NOT page-scoped: the preference follows the analyst across the
 * topics of a training package. It is also deliberately kept in sessionStorage
 * for BOTH contexts (trainer and student) — unlike annotations — so it starts
 * every browser session at its default (pins shown) while staying put for the
 * rest of that session.
 * @type {string}
 */
const PIN_PREF_KEY = `${KEY_PREFIX}pref::harmonicPin`

/**
 * CSS selector matching the explicit trainer-persistence flag. Accepts the
 * id, class, or data-attribute form. Exported for unit testing.
 * @type {string}
 */
export const TRAINER_FLAG_SELECTOR = '#gf-persistent, .gf-persistent, [data-gf-persistent]'

/**
 * Determine whether a student-context annotation record has expired.
 *
 * A record is treated as expired (and therefore discarded on load) when its
 * `savedAt` timestamp cannot be proven fresh. This is deliberately fail-safe
 * toward clearing student data:
 *   - missing / unparseable `savedAt` (`Date.parse` → `NaN`) → expired,
 *   - a `savedAt` in the future (`nowMs - t < 0`) → expired (guards clock skew
 *     and hand-edited records),
 *   - a `savedAt` older than {@link STUDENT_TTL_MS} → expired.
 * Otherwise the record is within the 24-hour window and is NOT expired.
 *
 * Pure and side-effect-free: identical inputs always yield identical output.
 * Applies to student context only — trainer records never call this. Exported
 * as a test-only seam so the expiry rules can be tested without a browser.
 *
 * @param {string | undefined | null} savedAt - ISO-8601 timestamp of the last save
 * @param {number} nowMs - Current wall-clock time in ms (e.g. `Date.now()`)
 * @returns {boolean} True when the record should be discarded as expired
 */
export function isAnnotationExpired(savedAt, nowMs) {
  const t = Date.parse(/** @type {string} */ (savedAt))
  if (Number.isNaN(t)) {
    return true
  }
  const age = nowMs - t
  if (age < 0) {
    return true
  }
  return age > STUDENT_TTL_MS
}

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
    const text = anchors[i].textContent
    if (text && text.trim() === 'ANALYSIS') {
      return 'trainer'
    }
  }
  return 'student'
}

/**
 * Get the appropriate Storage object for the detected context.
 * Returns null if storage is unavailable.
 *
 * Exported as a test-only seam: within src/ it is used only by this module.
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
  } catch (error) {
    console.warn(`GramFrame: ${context} storage is unavailable — annotations will not persist:`, error)
    return null
  }
}

/**
 * Build a namespaced storage key from the current page path.
 *
 * Exported as a test-only seam: the storage specs build the same key to assert
 * on what was written.
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
 * Read the harmonic-pin visibility preference for this browser session.
 *
 * Defaults to `true` (pins shown) whenever nothing has been stored yet, storage
 * is unavailable, or the stored value is not one of the two recognised strings —
 * so a fresh session always starts with pins visible.
 * @returns {boolean} True when new/edited harmonic sets should show their pin
 */
export function loadPinPreference() {
  try {
    const raw = sessionStorage.getItem(PIN_PREF_KEY)
    if (raw === 'false') return false
    return true
  } catch (error) {
    console.warn('GramFrame: Could not read the harmonic-pin preference — using the default:', error)
    return true
  }
}

/**
 * Store the harmonic-pin visibility preference for the rest of this browser
 * session. A failure (private mode, quota) is reported to the caller and
 * logged; the in-memory state still holds for the current page.
 * @param {boolean} showPin - Whether pins should be shown
 * @returns {boolean} True if the preference was written
 */
export function savePinPreference(showPin) {
  try {
    sessionStorage.setItem(PIN_PREF_KEY, showPin ? 'true' : 'false')
    return true
  } catch (error) {
    console.warn('GramFrame: Could not save the harmonic-pin preference:', error)
    return false
  }
}

/**
 * Whether the state holds anything worth persisting.
 *
 * Used both to decide what to write and — by callers — to decide whether a
 * failed write is worth telling the analyst about: with nothing annotated,
 * there is nothing to lose yet.
 * @param {GramFrameState} state - Current component state
 * @returns {boolean} True when at least one annotation exists
 */
export function hasPersistableAnnotations(state) {
  const hasMarkers = !!(state.analysis && state.analysis.markers && state.analysis.markers.length > 0)
  const hasHarmonics = !!(state.harmonics && state.harmonics.harmonicSets && state.harmonics.harmonicSets.length > 0)
  const hasDoppler = !!(state.doppler && (state.doppler.fPlus !== null || state.doppler.fMinus !== null))
  return hasMarkers || hasHarmonics || hasDoppler
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

    if (!hasPersistableAnnotations(state)) {
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
          freq: m.freq,
          // `symbol` is an ADDITIVE field (feature 161). It MUST NOT trigger a
          // SCHEMA_VERSION bump: legacy records simply lack it and default to
          // 'cross' (no drawn symbol) on restore.
          symbol: m.symbol || 'cross'
        }))
      },
      harmonics: {
        harmonicSets: (state.harmonics && state.harmonics.harmonicSets || []).map(hs => ({
          id: hs.id,
          color: hs.color,
          anchorTime: hs.anchorTime,
          spacing: hs.spacing,
          // `symbol` is an ADDITIVE field (feature 157-harmonic-pin-symbols). It
          // MUST NOT trigger a SCHEMA_VERSION bump: the strict version guard in
          // loadAnnotations would otherwise discard all pre-existing v1 records.
          // Legacy records simply lack this key and default to 'cross' (the
          // symbol-less default, feature 161) on restore.
          symbol: hs.symbol || 'cross',
          // `showPin` is likewise ADDITIVE (harmonic-pin toggle) and MUST NOT
          // bump SCHEMA_VERSION. Records written before it simply lack the key
          // and restore as `true` (pin shown), matching their original look.
          showPin: hs.showPin !== false
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
  } catch (error) {
    console.warn('GramFrame: Failed to save annotations — they exist in memory only:', error)
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

    // Student 24-hour expiry gate (feature 157). Trainer context is permanent
    // and bypasses this entirely. A student record that cannot be proven fresh
    // (missing/unparseable/future/older-than-24h savedAt) is discarded.
    if (context === 'student' && isAnnotationExpired(data.savedAt, Date.now())) {
      console.info('GramFrame: Discarding student annotations — older than the 24-hour persistence limit')
      storage.removeItem(key)
      return null
    }

    return /** @type {StoredAnnotations} */ (data)
  } catch (error) {
    console.warn('GramFrame: Failed to load stored annotations — data discarded:', error)
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
  } catch (error) {
    console.warn('GramFrame: Failed to clear stored annotations:', error)
    return false
  }
}
