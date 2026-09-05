# Contract: the audio config table

```html
<table class="gram-config">
  <tr><td colspan="2"><audio src="audio/diesel-generator.wav" controls></audio></td></tr>
  <tr><td>window-seconds</td><td>10</td></tr>
  <tr><td>fft-size</td><td>1024</td></tr>
  <tr><td>hop-size</td><td>512</td></tr>
  <tr><td>freq-start</td><td>0</td></tr>
  <tr><td>freq-end</td><td>4000</td></tr>
</table>
```

- Only the first row is required. Every other row is optional and takes the
  default in data-model.md §3.
- `controls` on the `<audio>` is optional and recommended: before GramFrame
  runs (or on a page where it fails) the browser shows a plain audio player.
  GramFrame removes the element from the table and uses its own.
- Row order does not matter. Unknown rows are ignored, as today.
- `time-start` / `time-end` are ignored with `console.warn` — the recording
  defines the time range.
- A `freq-end` above the file's Nyquist is clamped to Nyquist with
  `console.warn` naming both values.
- Errors (bad `fft-size`, `hop-size` < 1, `freq-start ≥ freq-end`,
  `window-seconds ≤ 0`, an `<audio>` without `src`) throw from
  `extractConfigData` and surface as the standard `.gramframe-error-indicator`
  beside the restored table; other tables on the page are unaffected.

## Serving over `file://`

Beside each WAV, publish the sidecar the repo script produces:

```bash
node scripts/wav2js.mjs sample/audio/diesel-generator.wav
# → sample/audio/diesel-generator.wav.js
```

The page needs no change: when `fetch` of the WAV fails, GramFrame injects
`<script src="…/diesel-generator.wav.js">` and reads the samples from it. Pages
served over HTTP(S) never touch the sidecar.
