# Development Tasks (Revised for Incremental UI Growth)

## 🟢 Phase 1: Bootstrapping + Dev Harness

- [x] Setup build environment using Vite
- [x] Basic component stub (e.g. GramFrame.init())
- [ ] Create `debug.html` page that loads a fixed component instance manually
- [ ] Hook up "Hello World" from component inside the debug page
- [ ] Set up hot module reload and visible console logging for state

## 🟡 Phase 2: Basic Layout and Diagnostics Panel

- [ ] Add Playwright as a dev dependency (only Chrome browser)
- [ ] Write initial Playwright test: debug page loads and "Hello World" appears
- [ ] Load spectrogram image from config
- [ ] Read and display min/max time/frequency
- [ ] Add LED-style readout panel below image
- [ ] Diagnostics: display image URL, size, min/max, and mouse coordinates
- [ ] Expose initial `addStateListener()` mechanism

## 🟠 Phase 3: Interaction Foundations

Note: as part of each task in this phase, extend the debug page UI to display the updated state, and add Playwright tests to verify the expected behavior.

- [ ] Refactor to use SVG container for image and overlays
  - [ ] Move spectrogram image into SVG container
  - [ ] Ensure proper scaling and positioning within SVG
  - [ ] Add support for coordinate system transformation
- [ ] Add mouse move tracking
- [ ] Calculate and display time/frequency at cursor
- [ ] Click to add cursors; drag to reposition
- [ ] Update state listener and diagnostics panel accordingly

## 🔵 Phase 4: Harmonics & Modes

Note: as part of each task in this phase, extend the debug page UI to display the updated state, and add Playwright tests to verify the expected behavior.

- [ ] Add mode switching UI (Analysis, Doppler)
- [ ] Draw harmonic lines with correct labels
- [ ] Support multiple harmonics per cursor
- [ ] Add a frequency-rate input box and propagate to calculations
- [ ] Demonstrate support for multiple component instance on page. See (mock-gram-2.png and mock-gram-3.png)

## 🟣 Phase 5: Final Fit & Polish

Note: as part of each task in this phase, extend the debug page UI to display the updated state, and add Playwright tests to verify the expected behavior.

- [ ] Auto-detect and replace config tables
- [ ] Add canvas boundary and grid toggles to diagnostics page
- [ ] Polish `build` output (dist includes debug page)
- [ ] Final QA: browser matrix, multi-instance test

## 🧪 Additional Playwright Test Coverage

- [ ] Test LED readout appears and updates
- [ ] Test cursor placement and harmonic lines
- [ ] Test mode switching and UI behaviour
