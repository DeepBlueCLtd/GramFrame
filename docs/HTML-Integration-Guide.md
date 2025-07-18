# HTML Integration Guide

## How to Use

1. Add the script:
```html
<script src="spectro-component.js"></script>
```

2. Insert a config table:
```html
<table class="gram-frame" frame="box">
  <tr><td colspan="3"><img src="img/spectrogram.png" /></td></tr>
  <tr><th>param</th><th>min</th><th>max</th></tr>
  <tr><td>time (s)</td><td>0</td><td>10</td></tr>
  <tr><td>freq (Hz)</td><td>0</td><td>2000</td></tr>
</table>
```

3. Component replaces the table on page load.
