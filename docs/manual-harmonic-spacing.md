# Manual Harmonic Spacing – UI Specification

## 📍 Location
In **Harmonics Mode**, the **readout panel** (beneath the spectrogram) includes a new button:

**`+ Manual`**

---

## 📤 Behavior When Clicked

Clicking `+ Manual` opens a modal dialog containing:

- A labeled input field:
  - **Label:** `Harmonic spacing (Hz):`
- Two buttons:
  - ✅ **Add** — creates a harmonic set with the specified spacing
  - ❌ **Cancel** — closes the dialog without changes

---

## 🧠 Result on Add

If the user enters a valid spacing and clicks **Add**:

- A new harmonic set is created with:
  - **Spacing** = user input (e.g., 73.5 Hz)
  - **Time anchor** = current cursor Y position if available, otherwise midpoint of image

- Harmonic lines will be generated starting at:
  - `f = spacing × n` for n = 1, 2, 3, … until the plot's frequency range is exceeded

- The new harmonic set is added to the list in the side panel and is fully editable.

---

## 🧼 Input Validation

- Input must be:
  - A **positive decimal number**
  - **Minimum value:** 1.0 Hz
- If the input is invalid:
  - Show an inline warning (e.g., “Please enter a number ≥ 1.0”)
  - Disable the **Add** button until corrected

---

## 🖼 UI Summary

| Element              | Type         | Behavior                                  |
|----------------------|--------------|-------------------------------------------|
| `+ Manual` Button     | Button       | Opens the modal dialog                    |
| Harmonic Spacing Input | Number Field | Accepts decimal Hz value                  |
| `Add` Button          | Confirm      | Adds harmonic set and closes dialog       |
| `Cancel` Button       | Cancel       | Closes dialog without changes             |

---

## 🔧 Implementation Notes

- Harmonics are drawn horizontally at the specified spacing intervals.
- The spacing is not influenced by the frequency-rate input; this is a “raw spacing” mode.
- The harmonic set behaves identically to dragged sets once created.
