/**
 * The shared "pin set" mode.
 *
 * A pin set is a family of equally-spaced vertical pins drawn across the gram
 * at one anchor time: a numbered line per member, a symbol capping it and a
 * number label above that. Two modes draw one — Harmonics, whose members sit at
 * multiples of the spacing (origin fixed at 0 Hz), and Sidebands, whose members
 * sit either side of a fundamental the analyst places (issue #241).
 *
 * Everything those two share lives here: the pin geometry, the label/symbol
 * stack, the hit test, the render loop, the drag wiring, and set add/update/
 * remove. What differs is small and declared as the subclass contract below —
 * where the sets are stored, what frequency a member index maps to, which
 * indices are visible, what a member's label says, and what a drag means.
 *
 * The class is deliberately indexed by a signed integer rather than by
 * "harmonic number": index `n` means the same thing to both modes (the nth
 * member out from the set's origin), and only {@link PinSetMode#freqForIndex}
 * knows where that lands in Hz.
 */

/// <reference path="../../types.js" />

import { BaseMode } from '../BaseMode.js'
import { recordDeletion } from '../../core/state.js'
import { commitAnnotationChange } from '../../core/annotationCommit.js'
import {
  dataToSVG,
  getImageBounds,
  calculateVisibleDataRange,
  getRenderDimensions
} from '../../utils/coordinates.js'
import { BaseDragHandler } from './BaseDragHandler.js'
import { getUniformTolerance } from '../../utils/tolerance.js'
import { sampledHarmonics } from '../../utils/harmonicSampling.js'
import { createSymbolMark, labelSitsBelowSymbol, resolveSymbolScale } from '../../rendering/symbols.js'
import { labelPlateExtents, labelPlateRect, measureLabelWidth, plateLabel } from '../../utils/labelPlate.js'

/**
 * Minimum spacing (Hz) any pin set may be dragged or nudged to.
 *
 * Strictly positive: a spacing of zero makes the visible index range infinite
 * and hangs the render loop (BH-1/BH-16, the same reason storage refuses it).
 * @type {number}
 */
export const MIN_PIN_SPACING = 0.1

/**
 * Pin-set mode base class.
 */
export class PinSetMode extends BaseMode {
  /**
   * Base pixel size (width/height) of a pin's symbol mark. The effective size is
   * this scaled by the "Large" symbol-size experiment toggle — use
   * {@link PinSetMode#symbolSize} rather than reading this directly.
   * @type {number}
   */
  static SYMBOL_SIZE = 10

  /**
   * Height of a pin line, as a fraction of the *base* (unzoomed) render height.
   *
   * The resulting height is a fixed pixel length, not a span of time: it is
   * derived from the viewport's base render size (which tracks expand, not zoom)
   * rather than from the zoomed image element. Pins therefore keep the same
   * on-screen height at every zoom level, growing/shrinking only when the
   * component itself is resized.
   * @type {number}
   */
  static PIN_HEIGHT_RATIO = 0.2

  /**
   * Height (px) of a mini-pin: the stub line drawn under each member of a set
   * whose full pin is hidden.
   *
   * Fixed rather than derived, by design (spec: issue #232). It is half the
   * height of a "Large" symbol mark (SYMBOL_SIZE * LARGE_SYMBOL_SCALE = 20px),
   * which is enough to tie each pin to the data beneath it without reinstating
   * the clutter the pin toggle exists to remove.
   * @type {number}
   */
  static MINI_PIN_HEIGHT = 10

  /**
   * Maximum pin lines rendered per set. At the 0.1 Hz minimum spacing a
   * standard 0–20 kHz config has 200,000 visible members; drawing an SVG line
   * for each — rebuilt on every drag frame — locked the browser (BH-2). Past
   * this cap the drawn lines are a regular sample of the range; well beyond
   * typical screen widths, adjacent pins merge on screen anyway, so the thinning
   * is invisible until the set is already a solid block.
   * @type {number}
   */
  static MAX_PIN_LINES = 1000

  /**
   * Font size (px) of a pin's number label. The plate the label sits on is
   * sized from it too, so it also fixes how much room the stack leaves above
   * and below the text (see `utils/labelPlate.js`).
   * @type {number}
   */
  static LABEL_FONT_SIZE = 12

  /**
   * Vertical gap (px) between the edge of the pin label's plate and its symbol.
   * @type {number}
   */
  static LABEL_GAP = 3

  /**
   * Minimum padding (px) kept between the top of a pin's label and the top edge
   * of the spectrogram image.
   * @type {number}
   */
  static STACK_TOP_PAD = 1

  /**
   * Wire up the one drag handler both pin-set drags run through.
   *
   * Moving an existing set (`move`) and creating one by dragging (`create`)
   * differ only in how the target is resolved — a create mints its set on
   * mousedown — and share every subsequent step (spec 166, FR-004).
   * @param {GramFrame} instance - GramFrame instance
   * @param {ModeType} modeName - Mode that owns the drag, for the projection
   */
  constructor(instance, modeName) {
    super(instance)

    this.dragHandler = new BaseDragHandler(instance, {
      // A feature drag always carries a data position. Only the pan drag passes
      // null, and it runs on its own handler in `core/events.js`.
      resolveTarget: (position) => this.resolvePinSetDrag(/** @type {DataCoordinates} */ (position)),
      // Hover only ever *finds* — resolvePinSetDrag mints a new set when the
      // cursor is over empty gram, which is right for a mousedown and wrong for
      // a hover (a hover that creates features floods the gram with sets).
      resolveHoverTarget: (position) => this.findSetTarget(/** @type {DataCoordinates} */ (position)),
      onDragStart: (target) => this.onSetDragStart(target),
      onDragMove: (target, currentPos, startPos) => this.onSetDragUpdate(
        target,
        /** @type {DataCoordinates} */ (currentPos),
        /** @type {DataCoordinates} */ (startPos)
      ),
      onDragEnd: () => this.onSetDragEnd(),
      onDragCancel: () => this.onSetDragEnd(),
      updateCursor: (style) => this.updateCursorStyle(style)
    }, modeName)
  }

  // ---------------------------------------------------------------------------
  // Subclass contract. Every member below is abstract: the base class calls it
  // and cannot answer it, so a subclass that forgets one fails loudly rather
  // than drawing nothing.
  // ---------------------------------------------------------------------------

  /**
   * The sets this mode owns, live (mutated in place by add/remove).
   * @returns {PinSet[]} This mode's sets
   */
  get sets() {
    throw new Error(`${this.constructor.name} must implement the "sets" getter`)
  }

  /**
   * Selection type used for this mode's sets, as `state.selection.selectedType`.
   * @returns {SelectedFeatureType} Selection type
   */
  get selectionType() {
    throw new Error(`${this.constructor.name} must implement the "selectionType" getter`)
  }

  /**
   * Which stored collection this mode's sets live in, and therefore which
   * tombstone family a deletion belongs to (issue #269).
   *
   * Derived from `selectionType` rather than declared again: the two are the
   * same fact -- `harmonicSet` sets live in `harmonicSets` -- and a subclass
   * that had to state both could state them inconsistently.
   * @returns {'harmonicSets'|'sidebandSets'} Stored collection name
   */
  get tombstoneCollection() {
    return /** @type {'harmonicSets'|'sidebandSets'} */ (`${this.selectionType}s`)
  }

  /**
   * Prefix for generated set ids, and the DOM naming stem for this mode's pins.
   * @returns {PinSetClassNames} Class and attribute names for the drawn pins
   */
  get pinNames() {
    throw new Error(`${this.constructor.name} must implement the "pinNames" getter`)
  }

  /**
   * Frequency (Hz, in the raw configured scale) of a set member.
   * @param {PinSet} _set - The set
   * @param {number} _index - Member index
   * @returns {number} Frequency of that member
   */
  freqForIndex(_set, _index) {
    throw new Error(`${this.constructor.name} must implement freqForIndex()`)
  }

  /**
   * Inclusive member-index range of a set within the currently visible span.
   * @param {PinSet} _set - The set
   * @returns {{minIndex: number, maxIndex: number}} Inclusive index range
   */
  visibleIndexRange(_set) {
    throw new Error(`${this.constructor.name} must implement visibleIndexRange()`)
  }

  /**
   * Member index nearest a probe frequency — the only member (±1) that can be
   * within frequency tolerance of it.
   * @param {PinSet} _set - The set
   * @param {number} _freq - Probe frequency
   * @returns {number} Nearest member index
   */
  nearestIndex(_set, _freq) {
    throw new Error(`${this.constructor.name} must implement nearestIndex()`)
  }

  /**
   * Text of a member's number label.
   * @param {number} _index - Member index
   * @returns {string} Label text
   */
  labelTextFor(_index) {
    throw new Error(`${this.constructor.name} must implement labelTextFor()`)
  }

  /**
   * Mint a new set at the mousedown position and return it as a `create`-kind
   * drag target, so the rest of the gesture is an ordinary drag.
   * @param {DataCoordinates} _dataCoords - Position of the mousedown
   * @returns {DragTarget|null} A create-kind target, or null if none can be made
   */
  createSetTarget(_dataCoords) {
    throw new Error(`${this.constructor.name} must implement createSetTarget()`)
  }

  /**
   * The frequency-axis half of a drag: what changes when the pointer moves
   * horizontally. The time-axis half (the anchor) is shared and handled here.
   * @param {PinSet} _set - The set being dragged
   * @param {number} _clickedIndex - Member index the drag grabbed
   * @param {DataCoordinates} _currentPos - Current pointer position
   * @returns {Partial<PinSet>} Updates to apply
   */
  freqUpdatesForDrag(_set, _clickedIndex, _currentPos) {
    throw new Error(`${this.constructor.name} must implement freqUpdatesForDrag()`)
  }

  /**
   * Whether this mode's table shows anything derived from the cursor position,
   * and so has to be re-rendered as the pointer moves.
   *
   * Not abstract: false is the answer for a table of plain feature properties,
   * and a mode says otherwise only when it has a reason to.
   * @returns {boolean} True if the table follows the cursor
   */
  get panelTracksCursor() {
    return false
  }

  /**
   * Re-render this mode's table from current state.
   */
  updatePanel() {
    throw new Error(`${this.constructor.name} must implement updatePanel()`)
  }

  // ---------------------------------------------------------------------------
  // Pointer handling
  // ---------------------------------------------------------------------------

  /**
   * Handle mouse move events
   * @param {MouseEvent} _event - Mouse event
   * @param {DataCoordinates} dataCoords - Data coordinates {freq, time}
   */
  handleMouseMove(_event, dataCoords) {
    // Both the move and create drags run through the one handler
    if (this.dragHandler && this.dragHandler.isDragging()) {
      this.dragHandler.handleMouseMove(dataCoords)
    } else if (this.dragHandler) {
      // Update cursor for hover when not dragging
      this.dragHandler.updateCursorForHover(dataCoords)
    }

    // Refresh the table on mouse movement only for a mode whose table shows
    // something derived from the cursor (the harmonics panel's ratio). Without
    // the guard every pointer move re-diffs a table that cannot have changed.
    if (this.panelTracksCursor && this.sets.length > 0) {
      this.updatePanel()
    }
  }

  /**
   * Handle mouse down events
   * @param {MouseEvent} event - Mouse event
   * @param {DataCoordinates} dataCoords - Data coordinates {freq, time}
   */
  handleMouseDown(event, dataCoords) {
    // Only handle left clicks
    if (event.button !== 0) {
      return
    }

    // The resolver decides whether this moves an existing set or creates one
    if (this.dragHandler) {
      this.dragHandler.startDrag(dataCoords, event)
    }
  }

  /**
   * Handle mouse up events
   * @param {MouseEvent} _event - Mouse event
   * @param {DataCoordinates} dataCoords - Data coordinates {freq, time}
   */
  handleMouseUp(_event, dataCoords) {
    // One exit for both kinds; the engine restores the cursor
    if (this.dragHandler) {
      this.dragHandler.endDrag(dataCoords)
    }
  }

  /**
   * Find the set under a position and describe it as a `move` drag target.
   * @param {DataCoordinates} position - Position to check
   * @returns {DragTarget|null} Drag target if found, null otherwise
   */
  findSetTarget(position) {
    const set = this.findSetAt(position)
    if (set) {
      return {
        kind: 'move',
        id: set.id,
        type: this.selectionType,
        position: position,
        data: {
          set,
          clickedIndex: this.nearestIndex(set, position.freq),
          originalAnchorTime: set.anchorTime
        }
      }
    }
    return null
  }

  /**
   * Resolve what a mousedown starts.
   *
   * Landing on an existing set moves it; landing anywhere else creates one and
   * drags it out from there. The new set is minted here, on mousedown, so the
   * engine has a target id for the whole gesture (contract: drag-engine.md).
   * @param {DataCoordinates} position - Position of the mousedown
   * @returns {DragTarget|null} A move- or create-kind target
   */
  resolvePinSetDrag(position) {
    return this.findSetTarget(position) || this.createSetTarget(position)
  }

  /**
   * Start dragging a set: select it, as clicking its table row would.
   * @param {DragTarget} target - Drag target with id and type
   */
  onSetDragStart(target) {
    const index = this.sets.findIndex(set => set.id === target.id)
    if (index !== -1) {
      this.instance.interaction.setSelection(this.selectionType, /** @type {string} */ (target.id), index)
    }
    // Drag bookkeeping belongs to the engine (state.drag) — nothing to mirror.
  }

  /**
   * Update a set during a drag.
   * @param {DragTarget} target - Drag target
   * @param {DataCoordinates} currentPos - Current position
   * @param {DataCoordinates} startPos - Position the drag started from
   */
  onSetDragUpdate(target, currentPos, startPos) {
    // Update cursor position so the readouts follow the drag
    this.instance.state.cursorPosition = {
      freq: currentPos.freq,
      time: currentPos.time,
      x: 0, y: 0, svgX: 0, svgY: 0, imageX: 0, imageY: 0 // Minimal values for compatibility
    }

    this.applySetDrag(target, currentPos, startPos)
  }

  /**
   * End (or cancel) a set drag.
   */
  onSetDragEnd() {
    // Nothing to unwind: the engine clears the drag record itself.
  }

  /**
   * Apply a set drag — the shared step for both the `move` and `create` kinds,
   * which differ only in how their target was resolved.
   * @param {DragTarget} target - The drag target from the engine
   * @param {DataCoordinates} currentPos - Current pointer position
   * @param {DataCoordinates} startPos - Where the drag began
   */
  applySetDrag(target, currentPos, startPos) {
    if (!target || !currentPos || !startPos) return

    const setId = target.id
    if (!setId) return

    const set = this.sets.find(candidate => candidate.id === setId)
    if (!set) return

    // Keep the grabbed member under the cursor, whatever it costs the geometry.
    const clickedIndex = target.data && target.data.clickedIndex !== undefined
      ? target.data.clickedIndex
      : 1
    /** @type {Record<string, any>} */
    const updates = { ...this.freqUpdatesForDrag(set, clickedIndex, currentPos) }

    // Vertical movement is shared: it moves the whole set's anchor time.
    // Clamped to the configured time range, matching the keyboard-move path:
    // an unclamped drag could push the anchor off the gram, store it there
    // unvalidated, and have the set snap back on the first arrow key (BH-25).
    const originalAnchorTime = target.data && target.data.originalAnchorTime !== undefined
      ? target.data.originalAnchorTime
      : set.anchorTime
    const deltaTime = currentPos.time - startPos.time
    const { timeMin, timeMax } = this.instance.state.config
    updates.anchorTime = Math.max(timeMin, Math.min(timeMax, originalAnchorTime + deltaTime))

    this.updateSet(setId, updates)
  }

  // ---------------------------------------------------------------------------
  // Set lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Add a set, seeded with this session's style choices, and select it.
   *
   * The subclass supplies only the geometry (`anchorTime`, `spacing`, and for
   * sidebands the fundamental); colour, symbol, pin visibility and symbol size
   * come from the style panel and are the same for every pin set.
   * @param {Partial<PinSet>} geometry - Geometry fields for the new set
   * @returns {PinSet} The created set
   */
  addSet(geometry) {
    const id = `${this.pinNames.idPrefix}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`

    // Use selected color from global state, fallback to cycling through predefined colors
    const palette = PinSetMode.SET_COLORS
    const color = this.instance.state.selectedColor
      || palette[this.sets.length % palette.length]

    /** @type {PinSet} */
    const set = /** @type {PinSet} */ ({
      id,
      color,
      // Use selected symbol from global state, defaulting to the symbol-less cross
      symbol: this.instance.state.selectedSymbol || 'cross',
      // Use the session's pin-visibility preference (on unless the analyst
      // turned it off via the style panel toggle)
      showPin: this.instance.state.showHarmonicPin !== false,
      // EXPERIMENT (temporary): symbol size is carried per set, seeded from the
      // toggle's next-feature default, so sets at both sizes can coexist.
      largeSymbols: !!this.instance.state.largeSymbols,
      ...geometry
    })

    this.sets.push(set)

    // Auto-select the newly created set, before the commit refreshes the panel
    // that draws the selection.
    this.instance.interaction.setSelection(this.selectionType, set.id, this.sets.length - 1)

    commitAnnotationChange(this.instance, () => this.updatePanel(), { frame: true })

    return set
  }

  /**
   * Update an existing set.
   * @param {string} id - Set ID
   * @param {Partial<PinSet>} updates - Properties to update
   */
  updateSet(id, updates) {
    const setIndex = this.sets.findIndex(set => set.id === id)
    if (setIndex === -1) {
      return
    }

    Object.assign(this.sets[setIndex], updates)

    commitAnnotationChange(this.instance, () => this.updatePanel(), { frame: true })
  }

  /**
   * Remove a set.
   * @param {string} id - Set ID
   */
  removeSet(id) {
    const setIndex = this.sets.findIndex(set => set.id === id)
    if (setIndex === -1) {
      return
    }

    // Clear selection if removing the selected set
    const { selection } = this.instance.state
    if (selection.selectedType === this.selectionType && selection.selectedId === id) {
      this.instance.interaction.clearSelection()
    }

    this.sets.splice(setIndex, 1)
    // Deleting is the one change a merge cannot infer from the result, so it is
    // recorded explicitly (issue #269). `tombstoneCollection` is the subclass's
    // name for its family, matching the stored record's key.
    recordDeletion(this.instance, this.tombstoneCollection, id)

    // Default tier, not frame tier: a deletion is a one-off, and listeners
    // (storage among them) should see it on the next microtask rather than
    // waiting for a frame that only a continuous gesture needs.
    commitAnnotationChange(this.instance, () => this.updatePanel())
  }

  /**
   * Nudging a set's spacing with the arrow keys.
   *
   * The floor is `MIN_PIN_SPACING`, the same one `freqUpdatesForDrag` clamps a
   * *drag* to. HarmonicsMode used to override this method for no other reason
   * than to raise its own floor to 1 Hz, so the same set reached 0.1 Hz under
   * the mouse and stopped at 1.0 Hz under the arrow keys -- the drift the
   * August review predicted and the September one found (R9-13). The 1 Hz
   * comment cited a hang; that class of failure is held by `MAX_PIN_LINES`
   * now, which is what makes a full-width drag to the floor safe, and a
   * keypress at a time is gentler than a drag.
   * @param {PinSet} set - The set being nudged
   * @param {number} freqDelta - What the keypress is worth in Hz, signed
   * @returns {Partial<PinSet>} Spacing update
   */
  nudgeFreqUpdates(set, freqDelta) {
    return { spacing: Math.max(MIN_PIN_SPACING, set.spacing + freqDelta) }
  }

  // ---------------------------------------------------------------------------
  // Hit testing
  // ---------------------------------------------------------------------------

  /**
   * Find the set whose drawn geometry contains the given position.
   *
   * Hit-testing follows exactly what is drawn — nothing more, nothing less.
   * Every visible part of a pin grabs it: the line's fixed-pixel span AND the
   * number label + symbol stacked above it. A set with its pin hidden draws
   * mini-pins, so its line region shrinks to that stub — the empty span below,
   * where a full pin would have reached, is blank on screen and blank to the
   * mouse too.
   *
   * Takes the probe position as a parameter rather than reading
   * `state.cursorPosition`: the stored cursor goes stale during pans (wheel-pan
   * suppresses mousemove), and a click tested against the pre-pan time missed
   * the pin and minted a duplicate set on top of it (BH-13).
   *
   * Bounded work per set (BH-2): the range is the VISIBLE one (zoom-aware, the
   * same source the renderer uses), only the member nearest the probe frequency
   * (±1) is line-tested — no other line can be within frequency tolerance — and
   * the stack test walks just the thinned labelled subset.
   *
   * @param {DataCoordinates} position - Probe position {freq, time}
   * @returns {PinSet|null} The set if found, null otherwise
   */
  findSetAt(position) {
    if (!position) return null
    const { freq, time } = position

    for (const set of this.sets) {
      if (!(set.spacing > 0)) continue

      const { minIndex, maxIndex } = this.visibleIndexRange(set)
      if (maxIndex < minIndex) continue

      // Pins are a fixed pixel height, so hit-test vertically in SVG pixels
      // against the same geometry the renderer draws.
      const { lineHeight, lineTop } = this.pinLineDimensions(set)
      const stack = this.labelStackBounds(lineTop, set)
      // Only the thinned subset is labelled, so only those pins carry a stack.
      const labelled = this.labelledIndices(minIndex, maxIndex)
      // A hidden pin draws mini-pins instead of full lines, so its line grab
      // region is the mini-pin stub hanging from the symbol's underside — which
      // is where the renderer hangs it, label placement notwithstanding.
      const pinDrawn = set.showPin !== false
      const lineFrom = pinDrawn ? lineTop : stack.symbolBottom
      const lineTo = lineFrom + (pinDrawn ? lineHeight : PinSetMode.MINI_PIN_HEIGHT)

      const tolerance = getUniformTolerance(this.getViewport(), this.instance.ui.spectrogramImage)
      const cursorSVG = dataToSVG(
        { freq, time },
        this.getViewport(),
        this.instance.ui.spectrogramImage
      )

      // The pin line: frequency tolerance horizontally, the drawn line span
      // vertically. Only the member(s) nearest the probe frequency can pass the
      // horizontal test, so only they are checked.
      if (cursorSVG.y >= lineFrom && cursorSVG.y <= lineTo) {
        const nearest = this.nearestIndex(set, freq)
        const from = Math.max(minIndex, nearest - 1)
        const to = Math.min(maxIndex, nearest + 1)
        for (let index = from; index <= to; index++) {
          if (Math.abs(freq - this.freqForIndex(set, index)) < tolerance.freq) {
            return set
          }
        }
      }

      // The label/symbol stack above the line: measured in SVG pixels, since
      // the characters and symbol are a fixed pixel size regardless of zoom.
      if (cursorSVG.y >= stack.top && cursorSVG.y <= stack.bottom) {
        for (const index of labelled) {
          if (Math.abs(cursorSVG.x - this.pinX(set, index)) <= this.labelStackHalfWidth(set, index)) {
            return set
          }
        }
      }
    }
    return null
  }

  // ---------------------------------------------------------------------------
  // Geometry
  // ---------------------------------------------------------------------------

  /**
   * The visible frequency span, as the frequency axis reports it.
   *
   * Viewport-aware: zooming in narrows the span (fewer pins), zooming out /
   * panning widens it. At zoom 1.0 it equals the full data range.
   * @returns {{freqMin: number, freqMax: number}} Visible frequency span
   */
  visibleFrequencySpan() {
    const { freqMin, freqMax } = calculateVisibleDataRange(
      this.instance.state, this.instance.ui.spectrogramImage
    )
    return { freqMin, freqMax }
  }

  /**
   * The "major" subset of member indices that receive a number label and symbol,
   * thinned to at most the label limit (default 25) by regular sampling.
   *
   * Every pin line is still drawn (spec 159); this limit governs labels and
   * symbols only. When the visible range already fits under the limit the subset
   * is the whole range, so every drawn pin is labelled (FR-005).
   * @param {number} minIndex - Lowest visible member index
   * @param {number} maxIndex - Highest visible member index
   * @returns {number[]} Ascending member indices to label/symbol
   */
  labelledIndices(minIndex, maxIndex) {
    return sampledHarmonics(minIndex, maxIndex).harmonics
  }

  /**
   * Calculate pin line dimensions and positions.
   *
   * The height is a fixed pixel length taken from the *base* (unzoomed) render
   * height, so a pin covers the same number of screen pixels no matter how far
   * the user has zoomed in — it is not a span of time that stretches with the
   * image. Only the top is zoom-aware: the pin hangs from the set's anchor
   * time (the original click location), so it tracks the feature while keeping
   * a constant height. The anchor is the symbol/pin junction — the point the
   * analyst aimed at — whichever pin style is on, so pin height never moves
   * where the feature lands (issue #284).
   *
   * @param {PinSet} set - The set being drawn
   * @returns {{lineHeight: number, lineTop: number}} Fixed pixel height and top Y position
   */
  pinLineDimensions(set) {
    const { renderHeight } = getRenderDimensions(this.instance.state)
    const lineHeight = renderHeight * PinSetMode.PIN_HEIGHT_RATIO
    // Only the y component is read; the frequency merely has to be a number.
    const anchorPoint = { freq: this.freqForIndex(set, 1), time: set.anchorTime }
    const anchorSVG = dataToSVG(anchorPoint, this.getViewport(), this.instance.ui.spectrogramImage)
    const lineTop = anchorSVG.y

    return { lineHeight, lineTop }
  }

  /**
   * Compute the SVG x-coordinate of a member's vertical pin line.
   * @param {PinSet} set - The set
   * @param {number} index - Member index
   * @returns {number} SVG x-coordinate of the pin line
   */
  pinX(set, index) {
    const point = { freq: this.freqForIndex(set, index), time: set.anchorTime }
    return dataToSVG(point, this.getViewport(), this.instance.ui.spectrogramImage).x
  }

  /**
   * Effective pixel size of a set's symbol marks: the base size scaled by that
   * set's own large-symbol flag, so sets at both sizes can share a gram. The
   * whole label/symbol stack layout derives from this, so the label spacing and
   * top-edge clamping follow the set's chosen size.
   * @param {PinSet} set - The set
   * @returns {number} Symbol diameter in px
   */
  symbolSize(set) {
    return PinSetMode.SYMBOL_SIZE * resolveSymbolScale(set)
  }

  /**
   * Compute the shared vertical layout of a pin's label/symbol stack.
   *
   * Ideal (top-to-bottom): label baseline, then symbol, then the pin line top,
   * so the symbol caps the line and the label sits above the symbol. When the
   * stack's top would clip above the spectrogram's top edge, the whole stack
   * (label + symbol) is nudged down by the overflow so it stays legible
   * (spec 159, FR-011).
   *
   * An upward-pointing triangle inverts the label (issue #242): its apex points
   * at the gram above the pin, so a number stacked over it hides exactly the
   * data the set was placed against. That label drops to the symbol's underside
   * instead, over the pin line's top — ink the set already spends there. The
   * symbol keeps capping the line either way, so the pin's anchor never moves.
   *
   * @param {number} lineTop - Top Y position of the pin lines (SVG coords)
   * @param {number} imageTop - Top edge of the spectrogram image in SVG coords
   * @param {PinSet} set - Set being laid out (its symbol size drives the stack)
   * @returns {{symbolCy: number, labelY: number}} Symbol centre and label baseline Y
   */
  labelStackPositions(lineTop, imageTop, set) {
    const r = this.symbolSize(set) / 2
    const gap = PinSetMode.LABEL_GAP
    const plate = labelPlateExtents(PinSetMode.LABEL_FONT_SIZE)
    const below = labelSitsBelowSymbol(set.symbol)

    // Symbol caps the line; the label sits just above the symbol, or — for an
    // up-pointing triangle — just below it. The gap is measured from the edge
    // of the label's plate rather than from its baseline (issue #243), so the
    // white rectangle clears the mark by as much as the bare glyphs used to.
    let symbolCy = lineTop - r
    let labelY = below ? symbolCy + r + gap + plate.above : symbolCy - r - gap - plate.below

    // Keep the top of the stack on-screen: the top of the label's plate when it
    // leads the stack, the symbol's top edge when the label hangs below.
    const stackTop = below ? symbolCy - r : labelY - plate.above
    const minTop = imageTop + PinSetMode.STACK_TOP_PAD
    if (stackTop < minTop) {
      const shift = minTop - stackTop
      symbolCy += shift
      labelY += shift
    }

    return { symbolCy, labelY }
  }

  /**
   * Vertical extent (SVG coords) of a pin's label/symbol stack, for hit-testing.
   *
   * Derived from the same {@link PinSetMode#labelStackPositions} layout the
   * renderer uses, so the grab region tracks the drawn stack — including the
   * downward nudge applied near the image's top edge, and the label's drop to
   * the underside of an up-pointing triangle (issue #242): move the text and
   * the hotspot moves with it. The bottom is clamped to the pin line's top so
   * the stack region and the line region always meet with no dead gap between
   * them.
   *
   * `symbolBottom` is reported separately because it, not the region's bottom,
   * is where a mini-pin hangs from — a label drawn below the symbol pushes the
   * region past the stub it would otherwise anchor.
   *
   * @param {number} lineTop - Top Y position of the pin lines (SVG coords)
   * @param {PinSet} set - Set being hit-tested
   * @returns {{top: number, bottom: number, symbolBottom: number}} Stack region and the symbol's underside
   */
  labelStackBounds(lineTop, set) {
    const imageTop = getImageBounds(this.getViewport(), this.instance.ui.spectrogramImage).top
    const { symbolCy, labelY } = this.labelStackPositions(lineTop, imageTop, set)
    const r = this.symbolSize(set) / 2
    const below = labelSitsBelowSymbol(set.symbol)
    const symbolBottom = symbolCy + r
    const plate = labelPlateExtents(PinSetMode.LABEL_FONT_SIZE)

    return {
      // The top of the label's plate — unless the label hangs below, in which
      // case the symbol leads the stack.
      top: below ? symbolCy - r : labelY - plate.above,
      // The plate's underside is the bottom of the stack when the label trails.
      bottom: Math.max(lineTop, below ? labelY + plate.below : symbolBottom),
      symbolBottom
    }
  }

  /**
   * Half-width (SVG px) of a pin's label/symbol stack, for hit-testing.
   *
   * The wider of the symbol mark and the number label, so both are grabbable:
   * a `cross` set has no symbol but still shows its label, and a "Large
   * symbols" set's mark is wider than its text. The label's half-width is the
   * plate's, measured the same way the renderer sizes it, so the grab region
   * covers exactly the white rectangle the analyst is aiming at.
   *
   * @param {PinSet} set - Set being hit-tested
   * @param {number} index - Member index whose label is drawn
   * @returns {number} Half-width in SVG pixels
   */
  labelStackHalfWidth(set, index) {
    const fontSize = PinSetMode.LABEL_FONT_SIZE
    const plate = labelPlateRect({
      x: 0,
      y: 0,
      textAnchor: 'middle',
      width: measureLabelWidth(this.labelTextFor(index), fontSize),
      fontSize
    })

    return Math.max(this.symbolSize(set) / 2, plate.width / 2)
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  /**
   * Create the SVG line element for one pin.
   * @param {number} index - Member index
   * @param {PinSet} set - The set
   * @param {number} lineX - X position for the line
   * @param {number} lineTop - Top Y position for the line
   * @param {number} lineHeight - Height of the line
   * @returns {SVGLineElement} SVG line element
   */
  createPinLine(index, set, lineX, lineTop, lineHeight) {
    const names = this.pinNames
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line.setAttribute('class', names.lineClass)
    line.setAttribute(names.setIdAttribute, set.id)
    line.setAttribute(names.indexAttribute, String(index))
    line.setAttribute('x1', String(lineX))
    line.setAttribute('y1', String(lineTop))
    line.setAttribute('x2', String(lineX))
    line.setAttribute('y2', String(lineTop + lineHeight))
    line.setAttribute('stroke', set.color)
    line.setAttribute('stroke-width', '2')
    line.setAttribute('stroke-linecap', 'round')
    line.setAttribute('opacity', '0.9')
    return line
  }

  /**
   * Create the short stub line drawn under a member when the set's full pin is
   * hidden.
   *
   * Same colour and stroke as a full pin line, so a mini-pin reads as the same
   * feature at a smaller scale; only its class and height differ. The distinct
   * class keeps the two apart for cleanup, hit-testing and tests — a hidden-pin
   * set still draws no full pin line.
   *
   * @param {number} index - Member index
   * @param {PinSet} set - The set
   * @param {number} lineX - X position of the mini-pin
   * @param {number} top - Top Y position of the mini-pin (the symbol's underside)
   * @returns {SVGLineElement} SVG line element
   */
  createMiniPin(index, set, lineX, top) {
    const miniPin = this.createPinLine(index, set, lineX, top, PinSetMode.MINI_PIN_HEIGHT)
    miniPin.setAttribute('class', this.pinNames.miniPinClass)
    return miniPin
  }

  /**
   * Create the plated text label for a member.
   *
   * Centred horizontally on the pin's line (`text-anchor: middle` at `lineX`) and
   * positioned above the pin's symbol (baseline at `labelY`), so the vertical
   * stack over a pin reads label -> symbol -> line (spec 159, FR-009/FR-010).
   * {@link PinSetMode#labelStackPositions} owns that baseline, so a set whose
   * symbol carries its label underneath needs nothing special here.
   *
   * The characters are drawn black on a white rounded plate rather than in the
   * set's colour: a single colour is only legible over part of a gram, whereas
   * the plate reads over both dark and light backgrounds (issue #243). Set
   * identity is still carried by the pin's line and symbol colour.
   *
   * @param {number} index - Member index
   * @param {PinSet} set - The set
   * @param {number} lineX - X position of the pin line (label is centred on it)
   * @param {number} labelY - Baseline Y position for the label text
   * @returns {SVGGElement} Group holding the plate and its text
   */
  createPinLabel(index, set, lineX, labelY) {
    const names = this.pinNames
    const label = /** @type {SVGTextElement} */ (
      document.createElementNS('http://www.w3.org/2000/svg', 'text')
    )
    label.setAttribute('class', names.labelClass)
    label.setAttribute(names.setIdAttribute, set.id)
    label.setAttribute(names.indexAttribute, String(index))
    label.setAttribute('x', String(lineX)) // centred on the pin line
    label.setAttribute('y', String(labelY)) // above the symbol
    label.setAttribute('text-anchor', 'middle')
    label.setAttribute('font-size', String(PinSetMode.LABEL_FONT_SIZE))
    label.setAttribute('font-weight', 'bold')
    label.setAttribute('font-family', 'Arial, sans-serif')
    label.textContent = this.labelTextFor(index)
    // Plated last, once the text carries everything the plate is sized from.
    return plateLabel(label)
  }

  /**
   * Create the filled symbol mark drawn between a pin's number label and the top
   * of its line.
   *
   * The vertical position (`symbolCy`) is computed once per set by
   * {@link PinSetMode#labelStackPositions} so the whole label/symbol stack
   * shares a consistent, on-screen layout.
   *
   * @param {PinSet} set - The set
   * @param {number} lineX - X position of the pin line (symbol is centred on it)
   * @param {number} symbolCy - Centre Y position for the symbol
   * @returns {SVGElement|null} SVG symbol element, or null for the `cross` (symbol-less) style
   */
  createPinSymbol(set, lineX, symbolCy) {
    const symbol = createSymbolMark(set.symbol, lineX, symbolCy, this.symbolSize(set), set.color)
    // `cross` sets draw no symbol shape (the pin keeps its line and label).
    if (!symbol) {
      return null
    }
    symbol.setAttribute(this.pinNames.setIdAttribute, set.id)
    return symbol
  }

  /**
   * Whether this mode currently owns any persistent feature.
   *
   * Half of the `PersistentFeatureProvider` capability.
   * @returns {boolean} True if at least one set exists
   */
  hasPersistentFeatures() {
    return this.sets.length > 0
  }

  /**
   * Render every set this mode owns.
   */
  renderPersistentFeatures() {
    if (!this.instance.ui.cursorGroup) {
      return
    }

    const names = this.pinNames
    // Clear existing pin lines and their symbol marks. Scope the symbol cleanup
    // to this mode's pin symbols (which carry its set-id attribute) so it never
    // removes another mode's symbols, which share the base symbol class.
    const existingLines = this.instance.ui.cursorGroup.querySelectorAll(
      `.${names.lineClass}, .${names.miniPinClass}`
    )
    existingLines.forEach(line => line.remove())
    const existingSymbols = this.instance.ui.cursorGroup.querySelectorAll(
      `.gram-frame-harmonic-symbol[${names.setIdAttribute}]`
    )
    existingSymbols.forEach(symbol => symbol.remove())

    // Every set, wherever it sits in time: the gram is drawn for the whole
    // recording, so nothing here asks the player where the playhead is
    // (spec 171, FR-006).
    this.sets.forEach(set => this.renderSet(set))
  }

  /**
   * Render a single set as vertical pin lines.
   *
   * Spec 159: draw a pin line for EVERY member in the visible span (no pins are
   * dropped, even if they merge into a solid block), then draw a number label
   * and symbol only for the thinned "major" subset so the overlay stays
   * readable. Lines are appended first so the labels/symbols paint on top.
   *
   * A set with `showPin === false` draws a mini-pin per member instead of a
   * full-height line: a stub hanging from the symbol's underside, in the set's
   * colour. Labels and symbols are thinned, so without them a pin-less set gave
   * no sign of where the members between the labelled ones actually fell
   * (issue #232); the mini-pins restore that alignment with the data at a
   * fraction of the ink. The label/symbol geometry is unchanged either way, so
   * toggling the pin swaps line lengths without moving anything else.
   *
   * @param {PinSet} set - Set to render
   */
  renderSet(set) {
    if (!this.instance.ui.cursorGroup) {
      return
    }

    const { minIndex, maxIndex } = this.visibleIndexRange(set)
    if (maxIndex < minIndex) {
      return
    }

    const { lineHeight, lineTop } = this.pinLineDimensions(set)
    const imageTop = getImageBounds(this.getViewport(), this.instance.ui.spectrogramImage).top
    // The label/symbol stack is laid out first: a mini-pin hangs from the
    // underside of the symbol, so it needs the stack's (possibly clamped)
    // vertical position.
    const { symbolCy, labelY } = this.labelStackPositions(lineTop, imageTop, set)
    const pinDrawn = set.showPin !== false

    // Draw a line for every member in the visible span (FR-001) — full height
    // when the set is pinned, a mini-pin when it is not. Sets restored from
    // storage without the flag are pinned.
    // Beyond MAX_PIN_LINES the lines are a regular sample of the span (BH-2):
    // by then adjacent pins have long merged on screen, and an uncapped loop
    // rebuilt hundreds of thousands of SVG elements per drag frame.
    const visibleCount = maxIndex - minIndex + 1
    const stride = Math.max(1, Math.ceil(visibleCount / PinSetMode.MAX_PIN_LINES))
    const miniPinTop = symbolCy + this.symbolSize(set) / 2
    for (let index = minIndex; index <= maxIndex; index += stride) {
      const lineX = this.pinX(set, index)
      const line = pinDrawn
        ? this.createPinLine(index, set, lineX, lineTop, lineHeight)
        : this.createMiniPin(index, set, lineX, miniPinTop)
      this.instance.ui.cursorGroup.appendChild(line)
    }

    // Draw labels + symbols only on the thinned major subset (FR-002), stacked
    // above each pin line with a shared, on-screen vertical layout.
    this.labelledIndices(minIndex, maxIndex).forEach(index => {
      const lineX = this.pinX(set, index)
      const symbol = this.createPinSymbol(set, lineX, symbolCy)
      const label = this.createPinLabel(index, set, lineX, labelY)
      // `cross` sets have no symbol mark; the number label is still drawn.
      if (symbol) {
        this.instance.ui.cursorGroup.appendChild(symbol)
      }
      this.instance.ui.cursorGroup.appendChild(label)
    })
  }

  /**
   * Colour palette used when the style panel offers no explicit choice.
   * @type {string[]}
   */
  static SET_COLORS = ['#ff6b6b', '#2ecc71', '#f39c12', '#9b59b6', '#ffc93c', '#ff9ff3', '#45b7d1', '#e67e22']
}
