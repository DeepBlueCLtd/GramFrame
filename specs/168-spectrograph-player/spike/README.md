# Spike artefacts (Story 1)

The experiment behind [../research.md](../research.md) §3. Nothing here is part
of the component; it is kept so the findings can be reproduced.

```bash
cd specs/168-spectrograph-player/spike
ln -s ../../../node_modules node_modules       # Playwright + its Chromium
node gen-wav.mjs tone.wav 30 22050            # 30 s synthetic tone + chirp
node -e "const fs=require('fs');const b=fs.readFileSync('tone.wav');fs.writeFileSync('tone.wav.js','window.GramFrameAudio=window.GramFrameAudio||{};window.GramFrameAudio[\"tone.wav\"]=\"'+b.toString('base64')+'\";')"
node run-exp.mjs                               # runs exp.html over file:// and http://
```

`exp.html` runs every probe in the browser and prints a JSON block; `run-exp.mjs`
opens it in Playwright's Chromium first from `file://`, then from a throwaway
HTTP server, and prints both. Pass `--webkit` to add a WebKit run where that
browser is installed (it was not, in the environment the spike ran in).

The generated `.wav`/`.wav.js` files are not committed.
