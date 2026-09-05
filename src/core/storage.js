/**
 * Browser Storage Adapter for GramFrame
 *
 * Persists user annotations (analysis markers, harmonic sets, sideband sets,
 * doppler curves) in browser storage. Trainers get localStorage (permanent); students get
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

import { normalizeMarkerLabel } from '../utils/markerLabel.js'

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
 * How far in the future a `savedAt` may sit before the record is treated as
 * tampered-with rather than the product of ordinary clock adjustment. A strict
 * `age < 0` check meant an NTP correction stepping the clock back one
 * millisecond deleted fresh student work (BH-33); five minutes absorbs any
 * realistic correction while still expiring hand-edited future timestamps.
 * @type {number}
 */
export const CLOCK_SKEW_TOLERANCE_MS = 5 * 60 * 1000

/**
 * Determine whether a student-context annotation record has expired.
 *
 * A record is treated as expired (and therefore discarded on load) when its
 * `savedAt` timestamp cannot be proven fresh. This is deliberately fail-safe
 * toward clearing student data:
 *   - missing / unparseable `savedAt` (`Date.parse` → `NaN`) → expired,
 *   - a `savedAt` more than {@link CLOCK_SKEW_TOLERANCE_MS} in the future →
 *     expired (guards hand-edited records, while tolerating small backwards
 *     clock steps such as NTP corrections — BH-33),
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
  if (age < -CLOCK_SKEW_TOLERANCE_MS) {
    return true
  }
  return age > STUDENT_TTL_MS
}

/**
 * What trainer/student detection found on the page, and why. The `reason` is
 * the diagnostic: it names the element that made the page a trainer page (or
 * says nothing did), so a page that unexpectedly came out as student can be
 * explained from the console rather than by reading the markup (issue #229).
 * @typedef {Object} UserContextDetection
 * @property {'trainer' | 'student'} context - The detected context
 * @property {'flag' | 'legacy-anchor' | 'none'} matchedBy - What decided it
 * @property {string} reason - Human-readable account of the decision
 */

/**
 * Detect whether the current page is a trainer or student context, and say
 * what decided it.
 * A page is treated as trainer context if EITHER condition holds:
 *   - an explicit persistence flag (id, class, or data-attribute) is present
 *     anywhere on the page (see TRAINER_FLAG_SELECTOR), OR
 *   - (legacy) an anchor element with exact text "ANALYSIS" is present.
 * All other pages are student context.
 *
 * Detection runs once, when the instance is constructed, and is never
 * re-evaluated: a flag that arrives later (a navigation built by script after
 * `DOMContentLoaded`) or that lives inside the `gram-config` table (removed
 * when the table is replaced) is not seen, and the page silently becomes a
 * student page — no "Clear gram" button, and session-only storage. The
 * `reason` exists so that outcome is visible when it happens (issue #229).
 * @returns {UserContextDetection}
 */
export function describeUserContext() {
  // Explicit persistence flag: id, class, or data-attribute form.
  const flag = document.querySelector(TRAINER_FLAG_SELECTOR)
  if (flag) {
    return {
      context: 'trainer',
      matchedBy: 'flag',
      reason: `matched the persistence flag on <${describeFlagElement(flag)}>`
    }
  }
  // Legacy detection: an anchor whose exact text is "ANALYSIS"
  const anchors = document.querySelectorAll('a')
  for (let i = 0; i < anchors.length; i++) {
    const text = anchors[i].textContent
    if (text && text.trim() === 'ANALYSIS') {
      return {
        context: 'trainer',
        matchedBy: 'legacy-anchor',
        reason: 'matched the legacy "ANALYSIS" anchor (no gf-persistent flag on the page)'
      }
    }
  }
  return {
    context: 'student',
    matchedBy: 'none',
    reason: 'no gf-persistent flag (id, class or data-attribute) and no "ANALYSIS" anchor was on the page when the component initialised'
  }
}

/**
 * Detect whether the current page is a trainer or student context.
 * See {@link describeUserContext} for the rules; this is the same decision
 * without the explanation.
 * @returns {'trainer' | 'student'}
 */
export function detectUserContext() {
  return describeUserContext().context
}

/**
 * Describe the flag element that decided trainer context, in the form it was
 * authored: tag name plus whichever of the three flag forms it carries.
 * @param {Element} el - The element TRAINER_FLAG_SELECTOR matched
 * @returns {string} e.g. `p class="gf-persistent"` or `span data-gf-persistent`
 */
function describeFlagElement(el) {
  const parts = [el.tagName.toLowerCase()]
  if (el.id === 'gf-persistent') parts.push('id="gf-persistent"')
  if (el.classList.contains('gf-persistent')) parts.push('class="gf-persistent"')
  if (el.hasAttribute('data-gf-persistent')) parts.push('data-gf-persistent')
  return parts.join(' ')
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
 *
 * Checks all three doppler markers, matching the mode's own
 * `hasPersistentFeatures` predicate: an fZero-only state renders, so it must
 * also persist rather than deleting the storage key on save (BH-32).
 * @param {GramFrameState} state - Current component state
 * @returns {boolean} True when at least one annotation exists
 */
export function hasPersistableAnnotations(state) {
  const hasMarkers = !!(state.analysis && state.analysis.markers && state.analysis.markers.length > 0)
  const hasHarmonics = !!(state.harmonics && state.harmonics.harmonicSets && state.harmonics.harmonicSets.length > 0)
  const hasSidebands = !!(state.sidebands && state.sidebands.sidebandSets && state.sidebands.sidebandSets.length > 0)
  const hasDoppler = !!(state.doppler && (state.doppler.fPlus !== null || state.doppler.fMinus !== null || state.doppler.fZero !== null))
  return hasMarkers || hasHarmonics || hasSidebands || hasDoppler
}

/**
 * A finite number — the only kind a stored coordinate is allowed to be.
 * Strings ("12k"), NaN and ±Infinity all fail.
 * @param {any} value - Candidate value
 * @returns {boolean} True when the value is a finite number
 */
function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * A non-empty string, for stored ids and colours.
 * @param {any} value - Candidate value
 * @returns {boolean} True when the value is a non-empty string
 */
function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0
}

/**
 * A stored doppler point: null, or an object with finite time and freq.
 * @param {any} point - Candidate point
 * @returns {boolean} True when the point is null or a valid coordinate pair
 */
function isValidStoredPoint(point) {
  if (point === null || point === undefined) return true
  return !!point && isFiniteNumber(point.time) && isFiniteNumber(point.freq)
}

/**
 * Validate a stored record field by field, returning a cleaned copy.
 *
 * Restore used to spread records into state unvalidated, so a corrupt or
 * hand-edited record half-applied silently — and a harmonic set with
 * `spacing: 0` hard-hung the page at every load (the pin loop runs
 * `h = Infinity; h <= Infinity; h++` forever). Every entry is now proven
 * usable before it reaches state: finite numbers where numbers are expected,
 * ids present, harmonic spacing strictly positive. Invalid entries are
 * discarded and counted; the valid remainder still restores (BH-1, BH-16).
 *
 * Pure and side-effect-free, exported as a test seam for the unit lane.
 * @param {any} data - Parsed record of unknown integrity
 * @returns {{annotations: StoredAnnotations, dropped: number}} Cleaned record and how many entries were discarded
 */
export function sanitizeStoredAnnotations(data) {
  let dropped = 0

  /** @type {StoredMarker[]} */
  let markers = []
  if (data && data.analysis && Array.isArray(data.analysis.markers)) {
    markers = data.analysis.markers.filter((/** @type {any} */ m) => {
      const valid = !!m && isNonEmptyString(m.id) && isNonEmptyString(m.color) &&
        isFiniteNumber(m.time) && isFiniteNumber(m.freq)
      if (!valid) dropped++
      return valid
    }).map((/** @type {any} */ m) => {
      // A hand-edited or corrupt record can carry a label of any type or
      // length. Normalising here — rather than discarding the whole marker —
      // keeps a usable position while bounding what reaches the gram; an
      // unusable label simply leaves the marker unlabelled (feature 231).
      const label = normalizeMarkerLabel(m.label)
      const { label: _rawLabel, ...rest } = m
      return label ? { ...rest, label } : rest
    })
  } else if (data && data.analysis && data.analysis.markers != null) {
    dropped++ // markers present but not an array
  }

  /** @type {StoredHarmonicSet[]} */
  let harmonicSets = []
  if (data && data.harmonics && Array.isArray(data.harmonics.harmonicSets)) {
    harmonicSets = data.harmonics.harmonicSets.filter((/** @type {any} */ hs) => {
      const valid = !!hs && isNonEmptyString(hs.id) && isNonEmptyString(hs.color) &&
        isFiniteNumber(hs.anchorTime) &&
        // Strictly positive: spacing 0 makes the harmonic range infinite.
        isFiniteNumber(hs.spacing) && hs.spacing > 0
      if (!valid) dropped++
      return valid
    })
  } else if (data && data.harmonics && data.harmonics.harmonicSets != null) {
    dropped++ // harmonicSets present but not an array
  }

  /** @type {StoredSidebandSet[]} */
  let sidebandSets = []
  if (data && data.sidebands && Array.isArray(data.sidebands.sidebandSets)) {
    sidebandSets = data.sidebands.sidebandSets.filter((/** @type {any} */ sb) => {
      const valid = !!sb && isNonEmptyString(sb.id) && isNonEmptyString(sb.color) &&
        isFiniteNumber(sb.anchorTime) && isFiniteNumber(sb.fundamentalFreq) &&
        // Strictly positive, for the same reason a harmonic set's is: a spacing
        // of zero makes the sideband index range infinite.
        isFiniteNumber(sb.spacing) && sb.spacing > 0
      if (!valid) dropped++
      return valid
    })
  } else if (data && data.sidebands && data.sidebands.sidebandSets != null) {
    dropped++ // sidebandSets present but not an array
  }

  const rawDoppler = (data && data.doppler) || {}
  /** @type {StoredDopplerData} */
  const doppler = { fPlus: null, fMinus: null, fZero: null, color: null }
  for (const key of /** @type {const} */ (['fPlus', 'fMinus', 'fZero'])) {
    if (isValidStoredPoint(rawDoppler[key])) {
      doppler[key] = rawDoppler[key] || null
    } else {
      dropped++
    }
  }
  doppler.color = isNonEmptyString(rawDoppler.color) ? rawDoppler.color : null

  /** @type {StoredAnnotations} */
  const annotations = {
    version: data && data.version,
    savedAt: data && data.savedAt,
    gram: data && data.gram,
    analysis: { markers },
    harmonics: { harmonicSets },
    sidebands: { sidebandSets },
    doppler,
    // Carried through rather than validated field by field: a tombstone is an
    // id and a time, and a damaged one costs at most one resurrected feature.
    // Dropping the set wholesale would resurrect every deletion in it, which is
    // the failure this exists to prevent (issue #269).
    tombstones: tombstonesOf(data)
  }
  return { annotations, dropped }
}

/**
 * How long a tombstone is kept, in milliseconds.
 *
 * A tombstone only has to outlive the window in which another tab might still
 * be holding the deleted feature in memory. Seven days is far longer than any
 * plausible tab lifetime and keeps the record from growing without bound on a
 * gram that is edited for months.
 * @type {number}
 */
const TOMBSTONE_TTL_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Read tombstones off a stored record or off live state, tolerating absence
 * and damage. Both carry the same shape under the same key.
 * @param {any} source - A stored record or a GramFrameState
 * @returns {AnnotationTombstones} Its tombstones, or an empty set
 */
function tombstonesOf(source) {
  const raw = source && source.tombstones
  if (!raw || typeof raw !== 'object') {
    return { markers: {}, harmonicSets: {}, sidebandSets: {}, doppler: null }
  }
  return {
    markers: (raw.markers && typeof raw.markers === 'object') ? raw.markers : {},
    harmonicSets: (raw.harmonicSets && typeof raw.harmonicSets === 'object') ? raw.harmonicSets : {},
    sidebandSets: (raw.sidebandSets && typeof raw.sidebandSets === 'object') ? raw.sidebandSets : {},
    doppler: isNonEmptyString(raw.doppler) ? raw.doppler : null
  }
}

/**
 * Combine two tombstone maps, keeping the earlier deletion time for an id both
 * sides removed.
 * @param {Object<string, string>} mine - This tab's deletions
 * @param {Object<string, string>} theirs - The other tab's deletions
 * @returns {Object<string, string>} The union
 */
function mergeTombstoneMap(mine, theirs) {
  /** @type {Object<string, string>} */
  const merged = { ...theirs }
  for (const [id, at] of Object.entries(mine || {})) {
    merged[id] = (merged[id] && merged[id] < at) ? merged[id] : at
  }
  return merged
}

/**
 * Drop tombstones older than the TTL.
 * @param {Object<string, string>} map - Deleted ids to ISO times
 * @param {number} now - Current epoch milliseconds
 * @returns {Object<string, string>} The surviving tombstones
 */
function pruneTombstoneMap(map, now) {
  /** @type {Object<string, string>} */
  const kept = {}
  for (const [id, at] of Object.entries(map || {})) {
    const when = Date.parse(at)
    // An unparseable time is kept rather than dropped: forgetting a deletion
    // resurrects work the analyst threw away, which is the worse mistake.
    if (!Number.isFinite(when) || now - when < TOMBSTONE_TTL_MS) {
      kept[id] = at
    }
  }
  return kept
}

/**
 * Merge one collection of identified features from two records.
 * @param {any[]|undefined} mine - This tab's features
 * @param {any[]|undefined} theirs - The other tab's features
 * @param {Object<string, string>} tombstones - Combined deletions for this collection
 * @param {boolean} mineIsNewer - Whether this tab's record was saved more recently
 * @returns {any[]} The merged collection
 */
function mergeCollection(mine, theirs, tombstones, mineIsNewer) {
  /** @type {Map<string, any>} */
  const byId = new Map()
  // The older side goes in first so the newer side's version of a feature both
  // sides hold overwrites it. Two tabs that edited the same feature cannot both
  // be honoured, and the record's own `savedAt` is the only ordering either of
  // them agrees on.
  const older = mineIsNewer ? theirs : mine
  const newer = mineIsNewer ? mine : theirs
  for (const feature of (older || [])) {
    if (feature && feature.id) byId.set(feature.id, feature)
  }
  for (const feature of (newer || [])) {
    if (feature && feature.id) byId.set(feature.id, feature)
  }
  return Array.from(byId.values()).filter(feature => !(feature.id in tombstones))
}

/**
 * Merge this tab's annotations with the record another tab has already stored.
 *
 * Two trainer tabs on the same page used to be last-writer-wins: each save
 * wrote the whole record from the saving tab's state, so markers added in one
 * tab were erased by the next save from the other, silently (R9-18). This is
 * the merge that replaces it.
 *
 * The rules, and what each costs:
 *
 * - **Union by id.** A feature either tab holds survives. This is what makes
 *   two tabs additive instead of destructive.
 * - **A deletion beats a concurrent edit.** A feature one tab deleted stays
 *   deleted, even if the other tab edited it in the meantime -- the tombstone
 *   is unconditional. The alternative, resurrecting a feature because someone
 *   recoloured it elsewhere, is the more surprising of the two, and an analyst
 *   who deletes something expects it to stay deleted.
 * - **On a feature both tabs changed, the more recently saved record wins,
 *   whole.** Field-level merging would need per-field times this format does
 *   not carry, and inventing them would let a stale tab reinstate an old
 *   colour on top of a new position. `savedAt` is the one ordering both sides
 *   already agree on.
 * - **The doppler curve is one object, so it is last-writer-wins as a whole**,
 *   and a tombstone from either side clears it.
 *
 * Legacy records carry no tombstones and merge as if they had none, which is
 * correct: they were written before any deletion could be recorded.
 * @param {StoredAnnotations|null} mine - What this tab would write
 * @param {StoredAnnotations|null} theirs - What is already stored, if anything
 * @param {number} [now] - Current epoch milliseconds, for tombstone pruning
 * @returns {StoredAnnotations|null} The merged record
 */
export function mergeStoredAnnotations(mine, theirs, now = Date.now()) {
  if (!mine) return theirs
  if (!theirs) return mine

  // Ordering by `savedAt`. A record with no usable time is treated as older:
  // the tab that can prove when it wrote is the one to trust.
  const mineAt = Date.parse(mine.savedAt || '')
  const theirsAt = Date.parse(theirs.savedAt || '')
  const mineIsNewer = !Number.isFinite(theirsAt) || (Number.isFinite(mineAt) && mineAt >= theirsAt)

  const myTombs = tombstonesOf(mine)
  const theirTombs = tombstonesOf(theirs)
  const tombstones = {
    markers: pruneTombstoneMap(mergeTombstoneMap(myTombs.markers, theirTombs.markers), now),
    harmonicSets: pruneTombstoneMap(mergeTombstoneMap(myTombs.harmonicSets, theirTombs.harmonicSets), now),
    sidebandSets: pruneTombstoneMap(mergeTombstoneMap(myTombs.sidebandSets, theirTombs.sidebandSets), now),
    doppler: myTombs.doppler && theirTombs.doppler
      ? (myTombs.doppler < theirTombs.doppler ? myTombs.doppler : theirTombs.doppler)
      : (myTombs.doppler || theirTombs.doppler)
  }

  const newer = mineIsNewer ? mine : theirs
  const older = mineIsNewer ? theirs : mine

  // The doppler curve: deleted by either side, or the newer side's, or
  // whichever side has one at all.
  const newerDoppler = newer.doppler || null
  const olderDoppler = older.doppler || null
  const newerHasCurve = !!(newerDoppler && (newerDoppler.fPlus || newerDoppler.fMinus || newerDoppler.fZero))
  const doppler = tombstones.doppler
    ? { fPlus: null, fMinus: null, fZero: null, color: null }
    : (newerHasCurve ? newerDoppler : (olderDoppler || newerDoppler))

  return {
    version: newer.version,
    savedAt: newer.savedAt,
    gram: newer.gram || older.gram,
    analysis: {
      markers: mergeCollection(
        mine.analysis && mine.analysis.markers,
        theirs.analysis && theirs.analysis.markers,
        tombstones.markers,
        mineIsNewer
      )
    },
    harmonics: {
      harmonicSets: mergeCollection(
        mine.harmonics && mine.harmonics.harmonicSets,
        theirs.harmonics && theirs.harmonics.harmonicSets,
        tombstones.harmonicSets,
        mineIsNewer
      )
    },
    sidebands: {
      sidebandSets: mergeCollection(
        mine.sidebands && mine.sidebands.sidebandSets,
        theirs.sidebands && theirs.sidebands.sidebandSets,
        tombstones.sidebandSets,
        mineIsNewer
      )
    },
    doppler: doppler || { fPlus: null, fMinus: null, fZero: null, color: null },
    tombstones
  }
}

/**
 * Identify which gram a record belongs to: the image file plus the configured
 * axis ranges.
 *
 * Storage keys are positional (pathname + instance index), so a reordered or
 * failed-to-init config table shifts every later instance's index and restores
 * one gram's annotations onto another's spectrogram — and republished content
 * at the same path inherits stale annotations whose coordinates meant
 * something else (BH-6, BH-23). The fingerprint travels inside the record
 * (an ADDITIVE field — no SCHEMA_VERSION bump; legacy records simply lack it)
 * and restore refuses on mismatch.
 *
 * The image is identified by its URL basename rather than the full URL, so
 * moving a published package between hosts does not orphan its annotations.
 * @param {GramFrameState} state - Current component state
 * @returns {StoredGramFingerprint} Fingerprint of the current gram
 */
export function buildGramFingerprint(state) {
  const url = (state.imageDetails && state.imageDetails.url) || ''
  const config = state.config || { timeMin: 0, timeMax: 0, freqMin: 0, freqMax: 0 }
  return {
    image: url.split('/').pop() || '',
    timeMin: config.timeMin,
    timeMax: config.timeMax,
    freqMin: config.freqMin,
    freqMax: config.freqMax
  }
}

/**
 * Whether a stored fingerprint matches the current gram's.
 * @param {StoredGramFingerprint|undefined} stored - Fingerprint from the record (absent in legacy records)
 * @param {StoredGramFingerprint} expected - Fingerprint of the gram doing the restoring
 * @returns {boolean} True when the record may be restored onto this gram
 */
function fingerprintMatches(stored, expected) {
  if (!stored) {
    // Legacy record from before fingerprinting: nothing to check against.
    return true
  }
  return stored.image === expected.image &&
    stored.timeMin === expected.timeMin &&
    stored.timeMax === expected.timeMax &&
    stored.freqMin === expected.freqMin &&
    stored.freqMax === expected.freqMax
}

/**
 * Extract annotation data from GramFrame state and save to storage.
 * Only writes when there is at least one annotation present.
 * @param {GramFrameState} state - Current component state
 * @param {number} [instanceIndex] - Instance index for multi-instance pages
 * @param {'trainer' | 'student'} [context] - Caller-supplied storage context.
 *   Instances detect it once at construction and pass it in, so save and load
 *   can never disagree about which storage to use after the DOM changes (M3);
 *   omitted, it is re-detected for callers without one.
 * @returns {boolean} True if saved successfully
 */
export function saveAnnotations(state, instanceIndex, context) {
  try {
    const storage = getStorage(context || detectUserContext())
    if (!storage) return false

    if (!hasPersistableAnnotations(state) && !hasTombstones(state)) {
      // No annotations and nothing deleted — remove any existing entry rather
      // than storing empty data.
      const key = buildStorageKey(instanceIndex)
      storage.removeItem(key)
      return true
    }

    // With annotations gone but deletions recorded, the record is still worth
    // writing: it is now nothing *but* tombstones, and removing it would throw
    // them away. Another tab still holding those features would then merge them
    // straight back in on its next save, which is the resurrection this whole
    // mechanism exists to prevent (issue #269).

    const data = snapshotAnnotations(state)

    const key = buildStorageKey(instanceIndex)

    // Read-merge-write, not write. Another tab may have saved since this one
    // loaded, and overwriting its record is the silent data loss R9-18
    // records. A damaged or foreign record is left to the load path to report:
    // merging into it would be writing on top of something we refused to read.
    const existing = readMergeableRecord(storage, key, data.gram)
    const merged = existing ? mergeStoredAnnotations(data, existing) : data

    storage.setItem(key, JSON.stringify(merged))
    return true
  } catch (error) {
    console.warn('GramFrame: Failed to save annotations — they exist in memory only:', error)
    return false
  }
}

/**
 * Whether this state carries any deletion worth persisting.
 * @param {GramFrameState} state - Current component state
 * @returns {boolean} True when at least one tombstone exists
 */
function hasTombstones(state) {
  const tombs = tombstonesOf(state)
  return Object.keys(tombs.markers).length > 0 ||
    Object.keys(tombs.harmonicSets).length > 0 ||
    Object.keys(tombs.sidebandSets).length > 0 ||
    !!tombs.doppler
}

/**
 * The record this tab would write for its current state.
 *
 * Extracted so the save path and the cross-tab merge build the same shape from
 * the same code: a merge compares live state against a stored record, and the
 * two disagreeing about what "the same annotation" looks like would be a
 * silent corruption rather than a visible bug.
 * @param {GramFrameState} state - Current component state
 * @returns {StoredAnnotations} This tab's annotations, as they would be stored
 */
export function snapshotAnnotations(state) {
  /** @type {StoredAnnotations} */
  const data = {
      version: SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
      // `gram` is an ADDITIVE field (which gram this record belongs to). It
      // MUST NOT trigger a SCHEMA_VERSION bump: legacy records simply lack it
      // and restore without the identity check (BH-6, BH-23).
      gram: buildGramFingerprint(state),
      analysis: {
        markers: (state.analysis && state.analysis.markers || []).map(m => {
          const label = normalizeMarkerLabel(m.label)
          return {
            id: m.id,
            color: m.color,
            time: m.time,
            freq: m.freq,
            // `symbol` is an ADDITIVE field (feature 161). It MUST NOT trigger a
            // SCHEMA_VERSION bump: legacy records simply lack it and default to
            // 'cross' (no drawn symbol) on restore.
            symbol: m.symbol || 'cross',
            // `label` is likewise ADDITIVE (feature 231) and MUST NOT bump
            // SCHEMA_VERSION. Written only when the marker carries one, so an
            // unlabelled marker's record is identical to what it was before
            // labels existed, and restores as unlabelled.
            ...(label ? { label } : {})
          }
        })
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
      // `sidebands` is an ADDITIVE section (issue #241). It MUST NOT trigger a
      // SCHEMA_VERSION bump: the strict version guard in loadAnnotations would
      // otherwise discard every pre-existing v1 record. Records written before
      // sidebands existed simply lack the key and restore with none.
      sidebands: {
        sidebandSets: (state.sidebands && state.sidebands.sidebandSets || []).map(sb => ({
          id: sb.id,
          color: sb.color,
          anchorTime: sb.anchorTime,
          fundamentalFreq: sb.fundamentalFreq,
          spacing: sb.spacing,
          symbol: sb.symbol || 'cross',
          showPin: sb.showPin !== false
        }))
      },
      doppler: {
        fPlus: state.doppler && state.doppler.fPlus ? { time: state.doppler.fPlus.time, freq: state.doppler.fPlus.freq } : null,
        fMinus: state.doppler && state.doppler.fMinus ? { time: state.doppler.fMinus.time, freq: state.doppler.fMinus.freq } : null,
        fZero: state.doppler && state.doppler.fZero ? { time: state.doppler.fZero.time, freq: state.doppler.fZero.freq } : null,
        color: state.doppler && state.doppler.color || null
      },
      // `tombstones` is an ADDITIVE field (issue #269). It MUST NOT trigger a
      // SCHEMA_VERSION bump: records written before multi-tab merging simply
      // lack it and merge as having deleted nothing, which is true of them.
      tombstones: tombstonesOf(state)
    }
  return data
}

/**
 * Merge a record another tab just wrote into this tab's annotations.
 *
 * The gates are the load path's, for the load path's reasons: an unreadable
 * payload, another build's schema, or a different gram is not this tab's to
 * adopt (R9-01, BH-6). Returns null when there is nothing to adopt.
 * @param {string} raw - The record as the other tab stored it
 * @param {GramFrameState} state - This tab's current state
 * @returns {StoredAnnotations|null} The merged annotations, or null
 */
export function mergeForeignRecord(raw, state) {
  /** @type {any} */
  let theirs = null
  try {
    theirs = JSON.parse(raw)
  } catch (error) {
    console.warn('GramFrame: ignoring an unreadable record from another tab:', error)
    return null
  }
  if (!theirs || theirs.version !== SCHEMA_VERSION) {
    return null
  }
  if (theirs.gram && !fingerprintMatches(theirs.gram, buildGramFingerprint(state))) {
    return null
  }
  return mergeStoredAnnotations(snapshotAnnotations(state), theirs)
}

/**
 * The record already in storage, if it is one this tab may safely merge with.
 *
 * Deliberately conservative. A record that cannot be parsed, was written by
 * another build, or belongs to a different gram is not merged into -- the load
 * path refuses those and tells the analyst why (R9-01), and merging into
 * something we declined to read would overwrite it with a half-understood
 * union. In those cases the save proceeds as a plain write, which is what it
 * did before merging existed.
 * @param {Storage} storage - The store being written to
 * @param {string} key - This instance's storage key
 * @param {StoredGramFingerprint|undefined} expectedGram - The saving tab's gram
 * @returns {StoredAnnotations|null} The mergeable record, or null
 */
function readMergeableRecord(storage, key, expectedGram) {
  try {
    const raw = storage.getItem(key)
    if (!raw) return null
    const existing = JSON.parse(raw)
    if (!existing || existing.version !== SCHEMA_VERSION) return null
    if (expectedGram && !fingerprintMatches(existing.gram, expectedGram)) return null
    return existing
  } catch (error) {
    console.warn('GramFrame: could not read the stored record to merge with — saving without merging:', error)
    return null
  }
}

/**
 * The outcome of a load attempt, in the analyst's terms rather than the
 * storage layer's.
 *
 * Every value other than `none` and `restored` means the analyst is looking at
 * a gram that does not show what they saved, and the caller is expected to say
 * so (R9-01). Before this existed the load path reported every refusal to the
 * console and returned `null`, while the *save* path raised a visible banner —
 * so a trainer whose record was damaged, superseded or fingerprinted for a
 * different gram opened an empty gram with no indication that anything had been
 * stored at all, and their next save overwrote it for good.
 *
 * - `none` — nothing was stored for this gram, or storage is unavailable
 * - `restored` — everything stored was restored
 * - `partial` — the record restored, but `dropped` entries failed validation
 * - `unreadable` — the record could not be parsed; left in place
 * - `unknown-version` — written by a different build; left in place (BH-21)
 * - `wrong-gram` — fingerprinted for another spectrogram; left in place (BH-6, BH-23)
 * - `expired` — a student record past the 24-hour limit; discarded by design
 * @typedef {'none' | 'restored' | 'partial' | 'unreadable' | 'unknown-version' | 'wrong-gram' | 'expired'} LoadOutcome
 */

/**
 * @typedef {Object} LoadResult
 * @property {StoredAnnotations | null} annotations - What could be restored, or null
 * @property {LoadOutcome} outcome - Why, in terms the caller can report
 * @property {number} dropped - Entries the sanitiser rejected (only meaningful for `partial`)
 */

/**
 * Build a load result.
 * @param {LoadOutcome} outcome - Why this load ended the way it did
 * @param {StoredAnnotations | null} [annotations] - What was restored, if anything
 * @param {number} [dropped] - Entries the sanitiser rejected
 * @returns {LoadResult}
 */
function loadResult(outcome, annotations = null, dropped = 0) {
  return { annotations, outcome, dropped }
}

/**
 * Load and validate stored annotations from browser storage.
 *
 * Never throws and never deletes a record it merely failed to understand. The
 * returned `outcome` distinguishes "there was nothing to restore" from "there
 * was something and it was refused", because only the caller knows how to tell
 * the analyst (see {@link LoadOutcome}).
 * @param {number} [instanceIndex] - Instance index for multi-instance pages
 * @param {'trainer' | 'student'} [context] - Caller-supplied storage context (see saveAnnotations)
 * @param {StoredGramFingerprint} [expectedGram] - Fingerprint of the gram doing
 *   the restoring. A fingerprinted record for a different gram is refused —
 *   left in place, never restored — so annotations cannot migrate onto the
 *   wrong spectrogram when instance indices shift or content is republished.
 * @returns {LoadResult}
 */
export function loadAnnotations(instanceIndex, context, expectedGram) {
  try {
    const resolvedContext = context || detectUserContext()
    const storage = getStorage(resolvedContext)
    if (!storage) return loadResult('none')

    const key = buildStorageKey(instanceIndex)
    const raw = storage.getItem(key)
    if (!raw) return loadResult('none')

    let data
    try {
      data = JSON.parse(raw)
    } catch (parseError) {
      // Damaged beyond reading — a hand edit, a partial write, a truncated
      // quota-limited write. Left in place: it is the analyst's only copy, and
      // deleting it here would destroy whatever could still be salvaged by hand.
      console.warn('GramFrame: Stored annotations could not be parsed — leaving the record in place:', parseError)
      return loadResult('unreadable')
    }

    if (!data || data.version !== SCHEMA_VERSION) {
      // Not restorable by THIS build — but deliberately left in place. Deleting
      // on read meant one visit from an older build permanently destroyed a
      // newer build's data (BH-21); an unrecognised record is someone else's,
      // not garbage.
      console.warn('GramFrame: Ignoring stored annotations — unrecognised schema version:', data && data.version)
      return loadResult('unknown-version')
    }

    // Student 24-hour expiry gate (feature 157). Trainer context is permanent
    // and bypasses this entirely. A student record that cannot be proven fresh
    // (missing/unparseable/future/older-than-24h savedAt) is discarded.
    if (resolvedContext === 'student' && isAnnotationExpired(data.savedAt, Date.now())) {
      console.info('GramFrame: Discarding student annotations — older than the 24-hour persistence limit')
      storage.removeItem(key)
      return loadResult('expired')
    }

    // Gram identity gate (BH-6, BH-23): a record fingerprinted for a different
    // image or axis configuration is refused, not restored — its coordinates
    // mean something else on this gram. The record itself is left alone.
    if (expectedGram && !fingerprintMatches(data.gram, expectedGram)) {
      console.warn('GramFrame: Ignoring stored annotations — they belong to a different spectrogram (image or axis ranges differ).')
      return loadResult('wrong-gram')
    }

    const { annotations, dropped } = sanitizeStoredAnnotations(data)
    if (dropped > 0) {
      console.warn(`GramFrame: Discarded ${dropped} invalid stored annotation entr${dropped === 1 ? 'y' : 'ies'} — restoring the rest.`)
      return loadResult('partial', annotations, dropped)
    }
    return loadResult('restored', annotations)
  } catch (error) {
    console.warn('GramFrame: Failed to load stored annotations — data discarded:', error)
    return loadResult('unreadable')
  }
}

/**
 * The sentence an analyst should be shown for a load outcome, or null when
 * there is nothing to say.
 *
 * Lives here, beside the gates that produce each outcome, so the wording and
 * the condition cannot drift apart. Every message states what happened AND
 * what became of the stored record, because the immediate question after
 * "my work is missing" is "is it gone?".
 * @param {LoadOutcome} outcome - Outcome from {@link loadAnnotations}
 * @param {number} [dropped] - Entries dropped, for the `partial` wording
 * @returns {string | null} The message, or null if the load needs no comment
 */
export function describeLoadOutcome(outcome, dropped = 0) {
  switch (outcome) {
    case 'partial':
      return `${dropped} saved annotation${dropped === 1 ? '' : 's'} could not be restored and ${dropped === 1 ? 'was' : 'were'} skipped — the rest are shown.`
    case 'unreadable':
      return 'Saved annotations could not be read and were not restored — the stored data is damaged. It has been left in browser storage, so nothing has been overwritten yet.'
    case 'unknown-version':
      return 'Saved annotations were not restored — they were written by a different version of this component. They have been left in browser storage.'
    case 'wrong-gram':
      return 'Saved annotations were not restored — they belong to a different spectrogram. They have been left in browser storage.'
    case 'expired':
      return 'Saved annotations were not restored — they were more than 24 hours old and have been discarded.'
    case 'none':
    case 'restored':
    default:
      return null
  }
}

/**
 * Remove stored annotations for the current page.
 * @param {number} [instanceIndex] - Instance index for multi-instance pages
 * @param {'trainer' | 'student'} [context] - Caller-supplied storage context (see saveAnnotations)
 * @returns {boolean} True if cleared successfully
 */
export function clearAnnotations(instanceIndex, context) {
  try {
    const storage = getStorage(context || detectUserContext())
    if (!storage) return false

    const key = buildStorageKey(instanceIndex)
    storage.removeItem(key)
    return true
  } catch (error) {
    console.warn('GramFrame: Failed to clear stored annotations:', error)
    return false
  }
}
