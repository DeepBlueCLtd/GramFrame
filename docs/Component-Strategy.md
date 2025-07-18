# Component-Strategy.md

## Purpose

This document describes the selected strategy for overlaying dynamic, resizable axes on a PNG heatmap using JavaScript. The strategy focuses on redrawing the axes whenever the image is resized, allowing full control over tick density and label spacing.

## Problem

The heatmap is a PNG image that resizes with the browser window, but it contains no built-in axes. The axes must reflect known data bounds for both x and y dimensions. Any solution must ensure that:

- Axes stay aligned with the image.
- Tick and label density adapts to screen size.
- Rendering is accurate and responsive.

## Selected Strategy: Dynamic Redraw on Resize

### Description

Use a `ResizeObserver` to monitor the PNG's size. Whenever it changes, the axes (implemented as SVG elements) are cleared and redrawn using updated width/height. This enables:

- Responsive layout.
- Dynamic adjustment of tick intervals.
- Accurate overlay regardless of screen size or zoom.

### Pros

- Fully adaptive to layout changes.
- Tick and label spacing can be optimized per size.
- Clean and accurate overlay at all sizes.

### Cons

- Slightly more complex implementation.
- Requires full re-render on every size change.
- Potential for flicker on frequent resizes (can be minimized).

## Implementation Overview

The image and the SVG are placed inside a relatively positioned container. The SVG is absolutely positioned and sized to match the image. Rendering functions map data coordinates to pixel space using current image dimensions and known axis bounds.

## Source Code

```html
<div id="plot-container" style="position: relative; width: 100%; max-width: 800px;">
  <img id="heatmap" src="heatmap.png" style="width: 100%; display: block;" />
  <svg id="axes" style="position: absolute; top: 0; left: 0;"></svg>
</div>

<script>
  const svg = document.getElementById('axes');
  const img = document.getElementById('heatmap');
  const ns = "http://www.w3.org/2000/svg";

  const xMin = 100, xMax = 3000;
  const yMin = 0, yMax = 10;

  const ro = new ResizeObserver(entries => {
    for (let entry of entries) {
      const { width, height } = entry.contentRect;
      renderAxes(width, height);
    }
  });

  ro.observe(img);

  function renderAxes(width, height) {
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    svg.innerHTML = "";

    const left = 50, right = 10, bottom = 30, top = 10;
    const innerWidth = width - left - right;
    const innerHeight = height - top - bottom;

    const xTickCount = Math.max(4, Math.floor(innerWidth / 100));
    const yTickCount = Math.max(3, Math.floor(innerHeight / 60));

    function scaleX(x) {
      return left + ((x - xMin) / (xMax - xMin)) * innerWidth;
    }

    function scaleY(y) {
      return top + ((yMax - y) / (yMax - yMin)) * innerHeight;
    }

    function addLine(x1, y1, x2, y2) {
      const line = document.createElementNS(ns, "line");
      Object.assign(line, { x1, y1, x2, y2 });
      line.setAttribute("stroke", "black");
      svg.appendChild(line);
    }

    function addText(x, y, textContent, anchor = "middle") {
      const text = document.createElementNS(ns, "text");
      Object.assign(text, {
        x, y,
        "text-anchor": anchor,
        "dominant-baseline": "middle"
      });
      text.setAttribute("fill", "black");
      text.setAttribute("font-size", "12");
      text.textContent = textContent;
      svg.appendChild(text);
    }

    addLine(left, height - bottom, width - right, height - bottom);
    for (let i = 0; i <= xTickCount; i++) {
      const t = i / xTickCount;
      const x = left + t * innerWidth;
      const val = Math.round(xMin + t * (xMax - xMin));
      addLine(x, height - bottom, x, height - bottom + 5);
      addText(x, height - bottom + 18, val.toString());
    }

    addLine(left, top, left, height - bottom);
    for (let i = 0; i <= yTickCount; i++) {
      const t = i / yTickCount;
      const y = top + t * innerHeight;
      const val = (yMax - t * (yMax - yMin)).toFixed(1);
      addLine(left - 5, y, left, y);
      addText(left - 10, y, val.toString(), "end");
    }
  }
</script>
```

## Summary

This strategy offers full control and precision. It allows tick spacing and axis styling to be tuned to the current layout, supporting rich visualizations that stay aligned with resizable content.
