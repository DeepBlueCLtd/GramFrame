# Contract: the player surface

## `instance.player` — `PlayerController` (`src/player/transport.js`)

Present on every instance; `null` on image-backed ones.

| Member | Behaviour |
|---|---|
| `audio` | the `<audio>` element (tests may read `currentTime`, `paused`, `loop`, `playbackRate`, `volume`, `muted`) |
| `play()` | `→ Promise<void>`; resolves when the element starts, **rejects** (`NotAllowedError`) when autoplay policy refuses (FR-023). Clears `ended`. Snaps `viewTop` to the playhead first (Story 4 AS-4) |
| `pause()` | stops; the follow loop ends after one final sync |
| `toggle()` | `play()` if paused else `pause()` |
| `seek(seconds)` | clamps to `[0, duration]`, sets `currentTime`, updates `playhead` and `viewTop = playhead` at once (does not start playback) |
| `restart()` | `seek(0)`; keeps playing if it was playing |
| `setLoop(bool)`, `setRate(number)`, `setVolume(0..1)`, `setMute(bool)` | forward to the element and mirror into `state.player` |
| `isReady()` | `state.player.ready` |
| `destroy()` | pauses, removes listeners, detaches the element |

Every mutation dispatches. Element events `play`, `pause`, `seeked`,
`timeupdate`, `ended`, `volumechange`, `ratechange` are mirrored into
`state.player` so a change made through the element directly (or by the
browser, e.g. `ended`) is still broadcast.

## `GramFrame.getPlayer(index = 0)`

Returns `instances[index].player` or `null`. `index` counts live instances in
page order, as `_getInstances()` does.

## Follow loop (`src/player/playerView.js`)

```js
export function syncViewToPlayhead(instance)   // playhead ← audio.currentTime; viewTop ← playhead; layout; axes; features; dispatch({frame:true})
export function startFollow(instance) / stopFollow(instance)   // requestAnimationFrame loop while playing
export function clampViewTop(instance, seconds)  // → [min(windowSeconds / zoom.level, playhead), playhead]
export function setViewTop(instance, seconds)    // clamped; relayout; axes; features; dispatch
export function isPlaying(instance)              // state.player.active && state.player.playing
export function isTimeRevealed(instance, t)      // !active || t ≤ playhead + hopSize / sampleRate
```

`syncViewToPlayhead` also runs on `timeupdate`, `seeked` and `ended`, and on
`visibilitychange` → visible, so a backgrounded tab catches up in one jump.

## Geometry (`components/svgLayout.applyZoomTransform`)

With `S = imageDetails.timeStretch || 1`, `L = zoom.level`,
`H = renderHeight`, `W = renderWidth`, `D = config.timeMax − config.timeMin`:

```
width  = W · L                       x = margins.left + centerX·W − centerX·W·L     (unchanged)
height = H · S · L
y      = S > 1 ? margins.top − (1 − (viewTop − timeMin) / D) · height              (audio)
       : margins.top + centerY·H − centerY·H·L                                     (image, unchanged)
imageClipRect.y/height: top edge lowered to the playhead's y when that is below margins.top
```

Seconds visible in the axes area: `windowSeconds / L`. Pixels per second:
`H · L / windowSeconds`.

## Interaction gates

| Situation | Rule | Where |
|---|---|---|
| playing, mousedown/mouseup/contextmenu on the image | not delegated to the mode | `core/events.js` |
| playing, wheel | ignored (page scrolls) | `core/events.js` |
| playing, arrow keys | ignored | `core/keyboardControl.js` |
| playing, mousemove | readouts as today | unchanged |
| playing | container `gram-frame-playing`; SVG cursor `default` via CSS `!important` | `gramframe.css`, `playerView.js` |
| paused, mousedown on the time-axis band (`x < margins.left`, within the image's vertical span) | `player.seek(timeAtY)` | `core/events.js` |
| paused, Pan mode drag at zoom 1 on an audio instance | allowed: vertical pan moves `viewTop`; horizontal is a no-op until zoomed | `PanMode.resolvePanDrag`, `viewport.panByNormalized` |
| zoom on an audio instance | `viewTop' = t + f·(windowSeconds / L')` where `t` is the time under the pointer and `f` its fraction down the view | `viewport.zoomAtImagePoint`, `zoomIn/zoomOut` (centre) |

## Keys (focused audio instance only; never on image instances)

| Key | Action |
|---|---|
| `Space`, `K` | toggle play/pause (`preventDefault` stops page scroll) |
| `J` / `L` | seek −5 s / +5 s; with `Shift` −30 s / +30 s |
| `Home` | restart |
| `M` | toggle mute |

Arrow keys, `Tab`, `Escape` keep their existing meaning. Keys are ignored when
the event target is editable, exactly as the arrow handler does today.

## Reveal in the modes (`BaseMode.isTimeRevealed`)

```js
isTimeRevealed(time) { return isTimeRevealed(this.instance, time) }
```
- Analysis: a marker with `!isTimeRevealed(marker.time)` is not drawn.
- PinSetMode: a set with `!isTimeRevealed(set.anchorTime)` is not drawn.
- Doppler: the curve and each marker are drawn only when every placed marker's
  time is revealed.

The table rows (markers/harmonics/sidebands panels) always list every
annotation — the tables are not a view of the gram.
