# HTML Integration Guide

## How to Use

1. Add the script:
```html
<script src="gramframe.js"></script>
```

2. Insert a config table:
```html
<table class="gram-config">
  <tr><td colspan="2"><img src="img/spectrogram.png" /></td></tr>
  <tr><td>time-start</td><td>0</td></tr>
  <tr><td>time-end</td><td>10</td></tr>
  <tr><td>freq-start</td><td>0</td></tr>
  <tr><td>freq-end</td><td>2000</td></tr>
</table>
```

3. Component replaces the table on page load.
