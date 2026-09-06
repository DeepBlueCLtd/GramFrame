# GramFrame Walkthrough Script (User-Facing)

An interactive walkthrough for end users of the GramFrame spectrogram analysis component.

---

## 🔹 Step 1: Welcome

**Welcome to GramFrame!**  
This tool helps you analyse sonar spectrograms — just like at the console, but directly in your browser.  
Let’s walk through its features.

---

## 🔹 Step 2: Spectrogram Area

🎯 **Target:** The spectrogram image

**This is your spectrogram.**  
Move your mouse across it to see the precise time and frequency under the cursor — displayed below in a digital-style readout.

---

## 🔹 Step 3: Analysis Mode

🎯 **Target:** "Analysis" mode toggle (and empty plot)

**Analysis Mode** shows the exact frequency at any point on the spectrogram.  
- **Click** to place a cursor  
- **Drag** to move it and explore different frequencies  
Use this mode to mark points of interest and compare tonal elements.

---

## 🔹 Step 4: Harmonics Mode

🎯 **Target:** "Harmonics" mode toggle (and active cursor)

**Harmonics Mode** builds on Analysis.  
It shows harmonic lines at 2×, 3×, etc. above your base frequency.  
These help identify sources like rotating machinery, where harmonic structure reveals the type of emitter.

---

## 🔹 Step 5: Frequency Rate — not in the interface today

⚠️ **There is no frequency-rate input box.** The control was removed; the
divider survives only as `state.frequencyRate`, which is always 1.

The intent was that entering a **frequency rate** (e.g. 12.5 Hz for a shaft or
cylinder rate) would divide every reading by that value, so measured tones
could be matched to known machinery rates. The arithmetic is in place and
consistent (issue #276), so re-enabling the control is a UI job rather than a
maths one — but until that happens, every reading is in raw Hz.

---

## 🔹 Step 6: Doppler Mode

🎯 **Target:** "Doppler" mode toggle

**Doppler Mode** (if enabled) helps you visualise frequency shifts over time.  
Use it to estimate approach angles, closing speeds, or confirm contacts exhibiting classical Doppler curves.

---

## 🔹 Step 7: You're Ready

That’s it! You’re now ready to explore and analyse spectrograms interactively.  
Use the Help button to revisit this guide at any time.
