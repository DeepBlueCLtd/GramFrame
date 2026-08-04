/**
 * The shared drag engine.
 *
 * Every pointer drag in GramFrame runs through this class (spec 166, FR-004):
 * moving an existing feature, creating a harmonic set by dragging, placing the
 * Doppler markers, and panning the viewport — including the middle-button pan
 * that works in every mode. A mode supplies a target resolver and lifecycle
 * callbacks; it never writes drag bookkeeping into state itself (D3).
 *
 * Drag state has exactly one authoritative owner — this handler's `dragState` —
 * and exactly one read-only projection for listeners, `state.drag` (D2). The
 * projection is rebuilt on every transition and is always present, reading
 * `{ active: false }` when idle, so a listener never has to null-check it.
 *
 * At most one drag is active per component instance at any time (D4). That is
 * enforced here rather than trusted: a handler that tries to start while
 * another owns the drag is refused.
 */

/// <reference path="../../types.js" />

import { dispatch } from '../../core/state.js'

/**
 * Which handler currently owns the active drag, per GramFrame instance.
 * @type {WeakMap<object, BaseDragHandler>}
 */
const activeDragOwners = new WeakMap()

/**
 * Whether any handler currently owns an active drag on this instance.
 *
 * The distinguishable form of the engine's D4 refusal: `startDrag` returns
 * `false` both for "no target here" and for "another handler owns the drag",
 * and a caller that treats every `false` as "no target" mints a feature during
 * an unrelated drag (BH-4). Callers that create on miss must check this first.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {boolean} True while a drag is active on the instance
 */
export function hasActiveDrag(instance) {
  const owner = activeDragOwners.get(instance)
  return !!(owner && owner.dragState.isDragging)
}

/**
 * Cancel whichever drag is currently active on this instance, if any.
 *
 * The central cancellation point for the gaps the engine's contract promises
 * to cover — mouseleave, off-image mouseup, Escape (H2). The owning handler
 * runs its own cancel callback, so each kind unwinds correctly.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {boolean} True if a drag was cancelled
 */
export function cancelActiveDrag(instance) {
  const owner = activeDragOwners.get(instance)
  if (owner && owner.dragState.isDragging) {
    owner.cancelDrag()
    return true
  }
  return false
}

/**
 * The idle projection. Copied, never shared, so a listener cannot mutate it.
 * @returns {DragProjection} An idle drag projection
 */
function idleProjection() {
  return {
    active: false,
    kind: null,
    mode: null,
    targetId: null,
    targetType: null,
    startPosition: null
  }
}

/**
 * Rebuild `state.drag` from whichever handler currently owns the drag, and tell
 * listeners about it.
 *
 * Called at every drag transition — start, end, cancel — so a listener sees the
 * projection change rather than having to wait for some unrelated notification
 * to carry it.
 * @param {GramFrame} instance - GramFrame instance
 */
function publishDragProjection(instance) {
  if (!instance || !instance.state) {
    return
  }

  const owner = activeDragOwners.get(instance)
  if (!owner || !owner.dragState.isDragging) {
    instance.state.drag = idleProjection()
  } else {
    instance.state.drag = {
      active: true,
      kind: owner.dragState.kind,
      mode: owner.modeName,
      targetId: owner.dragState.draggedTargetId,
      targetType: owner.dragState.draggedTargetType,
      startPosition: owner.dragState.dragStartPosition
        ? { ...owner.dragState.dragStartPosition }
        : null
    }
  }

  dispatch(instance)
}

/**
 * A drag in progress, as reported by `getDraggedTarget`.
 * @typedef {Object} DraggedTargetInfo
 * @property {DragKind|null} kind - What kind of drag is running
 * @property {string|null} id - Feature id being dragged
 * @property {string|null} type - Feature type being dragged
 * @property {DataCoordinates|null} startPosition - Where the drag began
 * @property {any} originalData - Snapshot taken at drag start
 */

/**
 * Base drag handler class for managing drag operations
 */
export class BaseDragHandler {
  /**
   * Create a new BaseDragHandler
   * @param {GramFrame} instance - GramFrame instance
   * @param {DragCallbacks} callbacks - Drag lifecycle callbacks
   * @param {ModeType|null} [modeName] - Mode that owns this handler, for the projection
   */
  constructor(instance, callbacks, modeName = null) {
    this.instance = instance
    this.callbacks = callbacks
    this.modeName = modeName

    /** @type {DragState} */
    this.dragState = {
      isDragging: false,
      kind: null,
      draggedTargetId: null,
      draggedTargetType: null,
      dragStartPosition: null,
      originalData: null
    }
  }

  /**
   * Check if currently dragging
   * @returns {boolean} True if drag operation is active
   */
  isDragging() {
    return this.dragState.isDragging
  }

  /**
   * The kind of drag in progress, if any.
   * @returns {DragKind|null} Drag kind or null when idle
   */
  dragKind() {
    return this.dragState.isDragging ? this.dragState.kind : null
  }

  /**
   * Get the current dragged target information.
   *
   * Deliberately not a `DragTarget`: this carries the drag's *start* position
   * and the snapshot taken at that moment, where `DragTarget` carries the
   * current position. See {@link BaseDragHandler#currentTarget} for the latter.
   * @returns {DraggedTargetInfo|null} Drag target info or null if not dragging
   */
  getDraggedTarget() {
    if (!this.dragState.isDragging) return null

    return {
      kind: this.dragState.kind,
      id: this.dragState.draggedTargetId,
      type: this.dragState.draggedTargetType,
      startPosition: this.dragState.dragStartPosition,
      originalData: this.dragState.originalData
    }
  }

  /**
   * The target descriptor handed back to the mode's callbacks.
   * @param {DataCoordinates|null} position - Current position; null for a
   *   pixel-space (pan) drag, which has no data position
   * @returns {DragTarget} Target descriptor
   */
  currentTarget(position) {
    return {
      // Non-null while a drag is running, which is the only time this is
      // called: `handleMouseMove`, `handleMouseUp` and `cancelDrag` all return
      // early when `isDragging` is false.
      kind: /** @type {DragKind} */ (this.dragState.kind),
      id: this.dragState.draggedTargetId,
      type: this.dragState.draggedTargetType,
      position,
      data: this.dragState.originalData
    }
  }

  /**
   * Handle mouse move events for drag operations
   * @param {DataCoordinates|null} currentPosition - Current mouse position in data coordinates
   * @param {MouseEvent} [event] - Originating event, for drags that work in screen pixels
   */
  handleMouseMove(currentPosition, event) {
    if (!this.dragState.isDragging) return

    this.callbacks.onDragMove(
      this.currentTarget(currentPosition),
      currentPosition,
      this.dragState.dragStartPosition,
      event
    )
  }

  /**
   * Start a drag operation
   * @param {DataCoordinates|null} position - Position where drag started
   * @param {MouseEvent} [event] - Originating mousedown, passed to the resolver
   * @returns {boolean} True if drag started successfully, false otherwise
   */
  startDrag(position, event) {
    if (this.dragState.isDragging) return false

    // At most one drag per instance, across all modes (D4)
    const owner = activeDragOwners.get(this.instance)
    if (owner && owner !== this && owner.dragState.isDragging) return false

    const target = this.callbacks.resolveTarget(position, event)
    if (!target) return false

    this.dragState.isDragging = true
    this.dragState.kind = target.kind || 'move'
    this.dragState.draggedTargetId = target.id ?? null
    this.dragState.draggedTargetType = target.type ?? null
    this.dragState.dragStartPosition = position ? { ...position } : null
    this.dragState.originalData = target.data ? { ...target.data } : null

    activeDragOwners.set(this.instance, this)
    publishDragProjection(this.instance)

    this.applyCursor(this.dragState.kind, 'grabbing')

    this.callbacks.onDragStart(this.currentTarget(position), position, event)

    return true
  }

  /**
   * End the current drag operation
   * @param {DataCoordinates|null} position - Position where drag ended
   * @param {MouseEvent} [event] - Originating mouseup
   */
  endDrag(position, event) {
    if (!this.dragState.isDragging) return

    const target = this.currentTarget(position)

    this.callbacks.onDragEnd(target, position, event)

    this.applyCursor(this.dragState.kind, 'crosshair')
    this.clearDragState()
  }

  /**
   * Cancel the current drag operation without applying changes
   */
  cancelDrag() {
    if (!this.dragState.isDragging) return

    const target = this.currentTarget(this.dragState.dragStartPosition)

    if (this.callbacks.onDragCancel) {
      this.callbacks.onDragCancel(target)
    }

    this.applyCursor(this.dragState.kind, 'crosshair')
    this.clearDragState()
  }

  /**
   * Clear drag bookkeeping and republish the projection.
   */
  clearDragState() {
    this.dragState.isDragging = false
    this.dragState.kind = null
    this.dragState.draggedTargetId = null
    this.dragState.draggedTargetType = null
    this.dragState.dragStartPosition = null
    this.dragState.originalData = null

    if (activeDragOwners.get(this.instance) === this) {
      activeDragOwners.delete(this.instance)
    }
    publishDragProjection(this.instance)
  }

  /**
   * Apply the cursor for a drag kind, falling back to the generic style.
   * @param {DragKind|null} kind - Drag kind
   * @param {string} fallback - Cursor to use when the mode has no per-kind opinion
   */
  applyCursor(kind, fallback) {
    if (!this.callbacks.updateCursor) return

    const style = this.callbacks.cursorFor
      ? (this.callbacks.cursorFor(kind, fallback) || fallback)
      : fallback
    this.callbacks.updateCursor(style)
  }

  /**
   * Update cursor style based on proximity to drag targets.
   *
   * Hover must never change state, so this uses the mode's side-effect-free
   * `resolveHoverTarget` when one is supplied. `resolveTarget` is only a safe
   * fallback for modes whose resolver is pure — a mode whose resolver mints a
   * feature on mousedown (harmonics `create`, doppler `place`) MUST supply
   * `resolveHoverTarget`, or every hover would create a feature.
   * @param {DataCoordinates} position - Current mouse position
   */
  updateCursorForHover(position) {
    if (this.dragState.isDragging) return

    const resolve = this.callbacks.resolveHoverTarget || this.callbacks.resolveTarget
    const target = resolve(position)
    const cursorStyle = target ? 'grab' : 'crosshair'

    if (this.callbacks.updateCursor) {
      this.callbacks.updateCursor(cursorStyle)
    }
  }

  /**
   * Reset drag handler state
   */
  reset() {
    this.cancelDrag()
  }

  /**
   * Clean up drag handler resources
   */
  cleanup() {
    this.reset()
  }
}
