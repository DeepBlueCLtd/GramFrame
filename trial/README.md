# GramFrame Spectrograph Player — Trial

## What this is

A trial of the GramFrame spectrograph player, so you can see how it handles a
real recording of yours before we commit to a publishing route.

Open **`index.html`** in Chrome or Edge and choose a `.wav` file.

## Your recording stays here

The file is read and analysed entirely inside your browser. Nothing is uploaded,
and this folder needs no network connection, no web server and no installed
software.

## How to read the display

- **Frequency runs left to right**, from 0 Hz at the left edge.
- **Time runs bottom to top.** The start of the recording is at the *bottom*;
  the latest sound is at the *top*. When you press play, new sound enters at
  the top and the picture slides downwards.

If a sound seems to be in the wrong place, check this first — it is the
opposite of a chart where time runs left to right or downwards.

## What to try

- **Press play.** The newest sound enters at the top and the picture slides down.
- **Scroll back** through the recording before playing, or while paused.
- **Drag the gram while it is playing** to move around — it pauses under your
  hand and resumes where you let go. A single click pauses and resumes.
- **The two contrast sliders** lift a faint tonal out of the background without
  changing any reading.
- **Pause, then annotate** — Cross Cursor, Harmonics, Sidebands and Doppler all
  measure the recording the same way they measure a fixed spectrogram image.
- **Adjust FFT size and top frequency**, then Re-analyse, to see the trade
  between frequency detail and time detail on your own material.

## What we would like to know

1. Does the picture show what you expect to see in this recording?
2. Is the time and frequency detail good enough for the analysis you teach?
3. How long did it take to appear, and is that acceptable?

## Known limits of this trial

- Uncompressed PCM and IEEE-float WAV only. Compressed WAVs are rejected with
  a message.
- Annotations are not saved between sessions. That is a property of this trial
  harness, not of the component.
- A long recording is shown at a coarser FFT setting so it fits the render
  limits; the page says so when that happens.
- Choosing the file by hand is a trial convenience. Published training material
  names its recording directly in the page, with no picker.
