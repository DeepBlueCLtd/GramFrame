# GramFrame Product Overview

**Last updated**: 2026-03-27

## What Is GramFrame?

GramFrame is an interactive spectrogram analysis component designed for sonar training. It transforms static spectrogram images embedded in HTML pages into rich, interactive overlays where users can measure frequencies, identify harmonic relationships, and estimate target speeds from Doppler-shifted signals.

The tool is purpose-built for the domain of underwater acoustics, where analysts and trainees examine visual representations of sound data (spectrograms) to detect, classify, and track contacts.

## The Problem It Solves

Sonar training materials are often delivered as static HTML documents containing spectrogram images. Trainees studying these materials must manually estimate frequencies, mentally calculate harmonic relationships, and approximate Doppler speeds. This is slow, error-prone, and limits the depth of analysis possible during self-directed study.

GramFrame turns these static images into measurement instruments. A trainee can hover over a spectrogram feature to read off its exact frequency and time, drag to reveal whether a set of tonals are harmonically related, or fit a Doppler curve to a frequency trace to calculate a contact's speed in knots.

## Use Cases

### Frequency and Time Measurement

The most basic use case: a trainee needs to know the precise frequency and time of a feature on a spectrogram. In **Analysis mode**, hovering over any point on the image displays crosshairs and a real-time LED-style readout of the frequency (Hz) and time (seconds) at that position. This replaces the manual process of lining up a ruler with the axis labels.

### Harmonic Identification

Many sonar contacts produce tonal signals at integer multiples of a fundamental frequency (harmonics). A propeller shaft rotating at a given rate, for example, produces energy at 1x, 2x, 3x, and higher multiples of its blade rate. In **Analysis mode**, dragging across the spectrogram displays vertical lines at these harmonic intervals, allowing the trainee to visually confirm whether observed tonals share a common mechanical source.

In **Harmonics mode**, users can create persistent harmonic overlays with configurable spacing. Multiple harmonic sets can coexist on the display, each in a distinct colour, enabling comparison of different potential source frequencies. A rate input acts as a frequency divider, allowing the trainee to work in terms of shaft rate or blade rate rather than raw Hz.

### Doppler Speed Estimation

When a sound source moves relative to a receiver, the observed frequency shifts -- higher on approach, lower on recession. This Doppler effect produces a characteristic S-shaped curve on a spectrogram. In **Doppler mode**, the trainee clicks to define the upper (f+) and lower (f-) frequency points of this curve, and GramFrame fits an S-curve between them. A draggable inflection point (f0) allows fine-tuning. The component calculates the target's speed using the relationship `v = (c / f0) x delta-f`, where c is the speed of sound in water (1481 m/s), and displays the result in both m/s and knots.

### Navigation of Large Spectrograms

Some spectrograms cover extended time periods or wide frequency bands. **Pan mode** provides zoom and pan controls so the trainee can focus on regions of interest without losing the ability to navigate back to the full image.

### Persistent Annotations

Markers, harmonic overlays, and Doppler curves persist on the display until explicitly removed. This allows a trainee to build up a layered analysis, placing multiple measurements side by side to support classification decisions. With browser storage integration, annotations can also persist across page reloads.

## Types of User

### Sonar Trainees

The primary audience. Trainees use GramFrame as part of self-directed study, working through HTML training manuals that contain spectrogram images. They use the measurement tools to practise identifying contacts, confirming harmonic relationships, and estimating speeds. The interactive overlays provide immediate feedback that reinforces learning.

### Instructors and Training Material Authors

Instructors embed GramFrame into training materials by adding a simple HTML configuration table alongside each spectrogram image. No build tools or programming knowledge is required -- the component auto-initialises on page load. Instructors can set up spectrograms with calibrated frequency and time axes, and the component handles all coordinate transformations.

### Sonar Analysts

While primarily a training tool, GramFrame's measurement capabilities are also useful for analysts performing post-mission review of recorded sonar data rendered as spectrograms. The Doppler speed estimation and harmonic identification features support tactical analysis workflows.

## How It Is Deployed

GramFrame is distributed as a single JavaScript file (with an optional standalone bundle that inlines CSS). It is embedded in HTML pages via a `<script>` tag. No server-side infrastructure is required -- it runs entirely in the browser and works over the `file://` protocol, making it suitable for offline or air-gapped environments typical in defence contexts.

Configuration is declarative: an HTML table with class `gram-config` specifies the spectrogram image and its axis parameters. On page load, GramFrame detects these tables, replaces them with interactive SVG overlays, and is ready to use. Multiple independent instances can coexist on a single page.
