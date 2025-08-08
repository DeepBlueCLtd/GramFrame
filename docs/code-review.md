# Code Review — Vanilla JS Interactive Image Component (Pan/Zoom, Markers, Harmonics)

## Executive Summary
**Strengths:**  
Solid core with working pan/zoom, clear separation between raster background and vector overlays, useful harmonic tools.

**Main Risks:**  
Coordinate conversions are fragile (esp. reversed time axis); state is scattered; input handlers are not unified (mouse vs touch); wheel/pan aren’t throttled; cleanup is incomplete.

**Top Fixes (do these first):**
1. Introduce a single `Transform` model (scale/translate) with canonical **image-space** storage for markers & harmonics.  
2. Normalize all pointer input via Pointer Events; throttle wheel with `requestAnimationFrame`.  
3. Add **hard zoom bounds** & clamped panning; fix devicePixelRatio rendering on canvas.  
4. Implement a lifecycle `dispose()` to remove observers/listeners and cancel RAFs.

---

## Core Functionality Review

### Pan/Zoom Implementation
**What’s good:**
- Panning feels direct; zoom centers roughly around the pointer.
- Scaling the image instead of container reduces layout reflow.

**Issues:**
- **Zoom bounds:** No min/max scale guard → users can zoom to useless levels or trigger image sampling artifacts.
- **Centering math:** Wheel zoom centers drift at extreme zoom because translate is applied before scale.
- **HiDPI blur:** Canvas draws look soft on retina due to missing `devicePixelRatio` upscaling.
- **Racing events:** Wheel events fire faster than render calls → stutter.

**Concrete Fix — Transform Model:**
```js
class Transform {
  constructor() {
    this.scale = 1;         // uniform
    this.tx = 0;            // translate X in screen px
    this.ty = 0;            // translate Y in screen px
    this.minScale = 0.5;
    this.maxScale = 16;
  }
  clamp() {
    this.scale = Math.min(this.maxScale, Math.max(this.minScale, this.scale));
  }
  zoomAbout(px, py, dz) {
    const s0 = this.scale;
    const s1 = s0 * dz;
    this.scale = s1;
    this.clamp();
    const k = this.scale / s0;
    this.tx = px - k * (px - this.tx);
    this.ty = py - k * (py - this.ty);
  }
}
```

**Throttle Wheel + Render:**
```js
let pending = false;
element.addEventListener('wheel', (e) => {
  e.preventDefault();
  const dz = Math.pow(2, -e.deltaY / 480);
  transform.zoomAbout(e.clientX, e.clientY, dz);
  if (!pending) {
    pending = true;
    requestAnimationFrame(() => { pending = false; render(); });
  }
}, { passive: false });
```

**HiDPI Canvas Fix:**
```js
function resizeCanvasToDisplaySize(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const { clientWidth:w, clientHeight:h } = canvas;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
```

### Marker System
**What’s good:**
- Markers render crisply in SVG; selection handles are obvious.

**Issues:**
- Storage in screen pixels breaks after resize/zoom.
- Early rounding causes cumulative error at high zoom.
- Linear scan hit-testing can lag with many markers.

**Recommendations:**
- Store in image coordinates (Hz, seconds or image px). Convert on draw.
- Keep raw `Float64` values in state; only format for UI.
- For large sets: use a spatial index.

```js
function screenToImage(x, y, transform) {
  const invS = 1 / transform.scale;
  const ix = (x - transform.tx) * invS;
  const iy = (y - transform.ty) * invS;
  return { ix, iy };
}

function imageToDomain(ix, iy, domain) {
  const f = domain.fMin + (ix / domain.iw) * (domain.fMax - domain.fMin);
  const t = domain.tMax - (iy / domain.ih) * (domain.tMax - domain.tMin);
  return { f, t };
}
```

### Harmonics Features
**What’s good:**
- Sets persist after mouseup; unique colors; spacing label is useful.

**Issues:**
- Drag updates both time anchor and frequency spacing; prone to jitter.
- Spacing rounding during drag causes “sticky” movement.

**Improvements:**
- Store base frequency `f0` and anchor time `t0` in domain units.
- Show snap cues; dim others during drag.
- Precompute harmonic positions.

```js
function harmonicX(n, f0, domain) {
  const f = n * f0;
  return ((f - domain.fMin) / (domain.fMax - domain.fMin)) * domain.iw;
}
```

### Event Handling
**What’s good:**
- Mouse UX is discoverable; keyboard reset works.

**Issues:**
- No Pointer Events → duplicated mouse/touch logic.
- Incorrect passive listener usage.
- DOM writes during move events → layout thrash.

**Fixes:**
- Use Pointer Events everywhere.
- Pinch-zoom with two fingers.
- Cache measurements and batch DOM mutations in RAF.

---

## Code Quality Analysis

### Architecture
**Observations:**
- Rendering and state mutations are tangled in handlers.
- Marker/harmonic logic is scattered.

**Suggestion:**
- Core model: `{ transform, domain, markers[], harmonicSets[] }`
- Separate Renderer, Controller, Services.

### Performance
- Throttle wheel & drag.
- Use progressive quality rendering at high zoom.
- Optimize overlay updates.

### State Management
- Keep domain immutable.
- Store annotations in domain/image space only.

### Browser Compatibility
- Prefer Pointer Events.
- Use correct passive settings.
- Test on Safari iOS.

---

## Critical Analysis Points

### Coordinate Systems
- Single source of truth for conversions.
- Keep double precision.
- Handle Y inversion centrally.

### Edge Cases
- Clamp pan/zoom.
- Handle markers outside view.
- Account for non-square pixels or EXIF orientation.

### User Experience
- Show scale badge on zoom.
- Dim non-active harmonics during drag.
- Provide keyboard navigation and ARIA updates.

### Data Integrity
- Persist with units and metadata.
- Store harmonic rate with data.

---

## Interactive Component Concerns

### Smooth Animation
- Batch redraws in one RAF tick.

### Memory Leaks
- Track all listeners and clean up.

### Proper Cleanup
```js
function makeGramFrame(el, opts){
  const disposables = [];
  const on = (t, h, o) => { el.addEventListener(t, h, o); disposables.push(()=>el.removeEventListener(t,h,o)); };

  function dispose(){
    disposables.forEach(fn => fn());
    if (rafId) cancelAnimationFrame(rafId);
    resizeObs?.disconnect();
  }
  return { dispose };
}
```

### Responsive Behavior
- Use ResizeObserver.
- Resize canvas with DPR logic.

---

## Specific Code Smells & Fixes
1. Magic numbers → move to constants.
2. Mixed units → enforce domain-only storage.
3. DOM writes mid-move → batch in RAF.
4. Duplicate touch/mouse logic → unify.
5. No pure math functions → extract & test.

---

## Suggested Code Extracts

### Central Render Loop
```js
function render() {
  drawSpectrogram(canvasCtx, imageBitmap, transform);
  drawCrosshair(svg, cursorScreen);
  drawMarkers(svg, model.markers, transform, domain);
  drawHarmonics(svg, model.harmonicSets, transform, domain);
}
```

### Clamped Panning
```js
function clampPan(transform, viewport, image) {
  const maxTx = 0;
  const maxTy = 0;
  const minTx = viewport.w - image.w * transform.scale;
  const minTy = viewport.h - image.h * transform.scale;
  transform.tx = Math.max(minTx, Math.min(maxTx, transform.tx));
  transform.ty = Math.max(minTy, Math.min(maxTy, transform.ty));
}
```

---

## Testing Strategy

### Unit
- Test coordinate conversions and zoom invariants.
- Validate harmonic position math.

### Integration
- Simulate zoom gestures.
- Verify resize keeps alignment.

### Performance
- Large marker sets maintain frame rate.

### Accessibility
- Keyboard support and ARIA live updates.

---

## Documentation Gaps
- Coordinate system diagrams.
- Event model description.
- Persistence schema.
- Lifecycle hooks.

---

## Overall Rating
**7.5 / 10 (Good foundation, needs consolidation).**  
Right primitives are in place, but correctness and smoothness depend on unifying transforms, input handling, clamping, precision, and cleanup. Addressing the top fixes will push this toward 9/10 quality.
