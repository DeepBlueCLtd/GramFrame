import { BaseMode } from '../BaseMode.js'
import { BaseDragHandler } from '../shared/BaseDragHandler.js'
import { getVersion } from '../../utils/version.js'
import { pixelDeltaToNormalizedPan, panByNormalized, zoomIn, zoomOut, fitView, isZoomedIn, zoomLevel } from '../../core/viewport.js'
import { IDLE_CURSOR, PAN_IDLE_CURSOR, PAN_DRAG_CURSOR } from '../../utils/cursors.js'
import { isPlayerActive } from '../../player/playerView.js'
import { resumeFromClick } from '../../player/dragSeek.js'

/**
 * Pan mode - allows users to pan around the spectrogram when zoomed in
 * Extends BaseMode to provide pan functionality as a proper interaction mode
 */
export class PanMode extends BaseMode {
  /**
   * Constructor for pan mode
   * @param {GramFrame} instance - GramFrame instance
   */
  constructor(instance) {
    super(instance)

    // Panning is a `pan`-kind drag: it has no feature target, and its move
    // callback writes viewport state rather than feature state. The engine
    // accommodates that by allowing a null target id/type (spec 166, FR-004).
    this.lastPointer = { x: 0, y: 0 }
    // Where the current press landed, so a release can tell a click from a pan
    // (spec 171, FR-029). Null between gestures.
    /** @type {{x: number, y: number}|null} */
    this.pressOrigin = null
    this.dragHandler = new BaseDragHandler(instance, {
      resolveTarget: () => this.resolvePanDrag(),
      onDragStart: (_target, _position, event) => this.onPanStart(event),
      onDragMove: (_target, _position, _startPosition, event) => this.onPanMove(event),
      onDragEnd: () => this.onPanEnd(),
      onDragCancel: () => this.onPanEnd(),
      updateCursor: (style) => this.updateCursorStyle(style),
      // A pan keeps the hand, rather than the hollow brackets feature drags use:
      // there is no target under the pointer for it to obscure.
      cursorFor: (kind, phase) => {
        if (kind !== 'pan') return null
        return phase === 'drag' ? PAN_DRAG_CURSOR : this.idleCursor()
      }
    }, 'pan')
  }

  /**
   * Decide whether a mousedown starts a pan. Panning is only meaningful when
   * zoomed in; at zoom 1 the click falls through and does nothing.
   * @returns {DragTarget|null} A pan-kind target, or null to decline
   */
  resolvePanDrag() {
    if (!this.canPan()) {
      return null
    }
    return { kind: 'pan', id: null, type: null }
  }

  /**
   * Whether there is anything to pan: an image zoomed in, or an audio-sourced
   * gram at any zoom — its view is a window onto the recording, so a paused
   * analyst can always scroll back through what has played (spec 168, FR-016).
   * @returns {boolean} True when a drag would move the view
   */
  canPan() {
    return isZoomedIn(this.instance) || isPlayerActive(this.instance)
  }

  /**
   * Panning an audio-sourced gram keeps working off the image.
   *
   * Scrolling back to the very start of a recording *means* putting blank space
   * on screen: the top edge is the playhead, so the first second only reaches
   * it once the whole window below is empty. A pan that stopped the moment the
   * pointer left the gram would strand the analyst partway, with the opening
   * seconds visible but unreachable.
   *
   * Only for the player, and only for panning. On an image-backed gram there is
   * no blank inside the axes to drag from, and every other mode places or moves
   * a feature, which must land on the gram.
   * @returns {boolean} True on an audio-sourced gram
   */
  acceptsOffImageDrag() {
    return isPlayerActive(this.instance)
  }

  /**
   * The cursor pan mode rests at: a grab hand when there is something to pan.
   * @returns {string} Cursor style
   */
  idleCursor() {
    return this.canPan() ? PAN_IDLE_CURSOR : IDLE_CURSOR
  }

  /**
   * Record where the pan began, in screen pixels.
   * @param {MouseEvent} [event] - Originating mousedown
   */
  onPanStart(event) {
    if (event) {
      this.lastPointer = { x: event.clientX, y: event.clientY }
      // Prevent default to avoid text selection
      event.preventDefault()
    }
  }

  /**
   * Pan the viewport by the pointer delta since the last move.
   * @param {MouseEvent} [event] - Originating mousemove
   */
  onPanMove(event) {
    if (!event || !this.canPan()) {
      return
    }

    const deltaX = event.clientX - this.lastPointer.x
    const deltaY = event.clientY - this.lastPointer.y

    // Convert pixel delta to normalized delta (shared with wheel-pan) and apply
    const { normalizedDeltaX, normalizedDeltaY } = pixelDeltaToNormalizedPan(this.instance, deltaX, deltaY)
    panByNormalized(this.instance, normalizedDeltaX, normalizedDeltaY)

    this.lastPointer = { x: event.clientX, y: event.clientY }
  }

  /**
   * Restore the resting cursor when the pan finishes.
   */
  onPanEnd() {
    this.updateCursorStyle(this.idleCursor())
  }

  /**
   * Activate pan mode
   */
  activate() {
    // Set cursor to grab if there is something to pan
    if (this.canPan()) {
      this.updateCursorStyle(PAN_IDLE_CURSOR)
    }

    // Reset any existing drag state
    this.dragHandler.reset()
  }

  /**
   * Deactivate pan mode
   */
  deactivate() {
    // Clear drag state, then reset the cursor
    this.dragHandler.reset()
    this.updateCursorStyle(IDLE_CURSOR)
  }

  /**
   * Handle mouse down events - start pan drag
   * @param {MouseEvent} event - Mouse event
   * @param {DataCoordinates} dataCoords - Data coordinates
   */
  handleMouseDown(event, dataCoords) {
    this.pressOrigin = { x: event.clientX, y: event.clientY }
    this.dragHandler.startDrag(dataCoords, event)
  }

  /**
   * Handle mouse move events - perform pan if dragging
   * @param {MouseEvent} event - Mouse event
   * @param {DataCoordinates} dataCoords - Data coordinates
   */
  handleMouseMove(event, dataCoords) {
    this.dragHandler.handleMouseMove(dataCoords, event)
  }

  /**
   * Handle mouse up events - end pan drag
   * @param {MouseEvent} event - Mouse event
   * @param {DataCoordinates} dataCoords - Data coordinates
   */
  handleMouseUp(event, dataCoords) {
    this.dragHandler.endDrag(dataCoords, event)
    // A click on a paused audio-sourced gram resumes it (spec 171, FR-029).
    // After the drag ends, so the resting cursor is restored before the
    // playing one takes over, and only in this mode: everywhere else the same
    // click places a feature. The transport decides whether it qualifies.
    const origin = this.pressOrigin
    this.pressOrigin = null
    if (origin && isPlayerActive(this.instance)) {
      resumeFromClick(this.instance, origin, event)
    }
  }

  /**
   * Handle mouse leave events
   */
  handleMouseLeave() {
    // End drag if mouse leaves the SVG area
    this.pressOrigin = null
    this.dragHandler.cancelDrag()
  }

  /**
   * Get guidance content for pan mode.
   *
   * Its own gestures only. The cross-mode ones used to be a second section
   * here, because Pan is the initial mode and the old panel had room for them
   * nowhere else — which meant an analyst who armed Cross Cursor first never
   * learnt that Shift + drag zooms. The guidance column appends them to every
   * mode now (see `utils/guidanceContent.js`).
   * @returns {Object} Structured guidance content
   */
  getGuidanceText() {
    return {
      sections: [
        {
          items: [
            { trigger: 'Drag', outcome: 'to pan the view when zoomed in' },
            { trigger: 'Click', outcome: 'on an audio gram, to pause or resume playback' },
            // Named by shape, not by the glyph itself: a character in the
            // guidance would depend on the reader's font, which is the reason
            // the button draws its own (issue #310).
            { trigger: '+ / \u2212', outcome: 'to zoom in and out' },
            { trigger: 'Fit', outcome: 'to bring the whole gram back in one click' },
            `GramFrame v${getVersion()}`
          ]
        }
      ]
    }
  }

  /**
   * Reset pan-specific state
   */
  resetState() {
    this.pressOrigin = null
    this.dragHandler.reset()
  }

  /**
   * Check if pan mode is enabled.
   *
   * Pan mode is always selectable — it is the initial mode, and staying in it at
   * zoom level 1 is the intended way to avoid accidentally placing markers on a
   * click. Panning itself is still gated on being zoomed in (see handleMouseDown
   * / panByNormalized); at zoom 1 a click simply does nothing.
   * @returns {boolean} Always true
   */
  isEnabled() {
    return true
  }

  /**
   * Get command buttons for pan mode
   * @returns {Array<CommandButton>} Array of command button definitions
   */
  getCommandButtons() {
    return [
      {
        label: '−',
        title: 'Zoom Out',
        action: () => zoomOut(this.instance),
        isEnabled: () => isZoomedIn(this.instance)
      },
      {
        label: '+',
        title: 'Zoom In',
        action: () => zoomIn(this.instance),
        isEnabled: () => zoomLevel(this.instance) < 10.0
      },
      {
        // The exit from a region zoom: one gesture in, one click out (spec 170,
        // FR-014). Disabled at 1x, where the whole gram is already shown (FR-015).
        label: 'Fit',
        icon: 'fit',
        title: 'Fit Whole Gram',
        action: () => fitView(this.instance),
        isEnabled: () => isZoomedIn(this.instance)
      }
    ]
  }

  /**
   * Get initial state for pan mode
   * @returns {Object} Pan mode initial state
   */
  static getInitialState() {
    return {
      // Pan mode doesn't need persistent state
      // Pan position is stored in zoom.centerX/centerY
    }
  }
}