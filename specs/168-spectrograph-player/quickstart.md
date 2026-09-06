# Quickstart: Spectrograph Player

## Author a player

```html
<table class="gram-config">
  <tr><td colspan="2"><audio src="audio/diesel-generator.wav" controls></audio></td></tr>
  <tr><td>window-seconds</td><td>10</td></tr>
  <tr><td>freq-end</td><td>4000</td></tr>
</table>
```

For `file://` distribution, generate the sidecar once per WAV:

```bash
node scripts/wav2js.mjs sample/audio/*.wav
```

## Run

```bash
yarn dev                     # then open http://localhost:5173/sample/player.html
```

## Verify each story

| Story | Command / check |
|---|---|
| 1 | `specs/168-spectrograph-player/research.md` exists; `spike/README.md` reproduces §3 |
| 2 | `npx playwright test tests/player-load.spec.js` — the first window drawn, axes `[0, window]` (spec 171 replaced the blank opening view), state carries duration/analysis, error paths |
| 3 | `npx playwright test tests/player-playback.spec.js` — scroll follows `currentTime`, inert interactions, two independent players |
| 4 | `npx playwright test tests/player-annotations.spec.js` — pause/annotate/resume, pan clamp, reload (the reveal rule was withdrawn by spec 171) |
| 5 | `npx playwright test tests/player-transport.spec.js` — every control and key; autoplay refusal |
| 6 | `sample/audio/ATTRIBUTION.md` lists every file; `sample/player.html` plays them; Integration Guide has the audio section |
| SC-007 | `yarn test:unit` — `tests/unit/{wav-decoder,fft,spectrogram,gram-image}.test.js` |

## Standing gate (every task that changes code)

```bash
yarn typecheck && yarn lint && yarn test:unit && yarn hygiene && yarn build && yarn test
```

## Manual `file://` check (not automated — ES modules do not load over `file://`)

```bash
yarn build:standalone
node scripts/wav2js.mjs sample/audio/*.wav
# open test-release.html or sample/player.html from the file system in Chrome/Edge
# expected: every player initialises, plays, and the console shows no CORS errors
```
