# ADR-013: File Protocol Compatibility for Standalone Deployment

## Status
Proposed

## Context

GramFrame is designed to be embedded in HTML training materials that are distributed to end users as standalone files. These users need to open HTML files directly from their file system (via Windows Explorer or macOS Finder) without running a web server. This creates a deployment scenario using the `file://` protocol, which has significant restrictions compared to `http://` or `https://` protocols.

### Current Problem

The current build output fails when accessed via `file://` protocol due to:

1. **CORS Policy Violations**: Modern browsers block ES modules (`<script type="module">`) when loaded via `file://` protocol
2. **Path Resolution Issues**: Absolute paths like `/assets/main.js` don't resolve correctly from `file://` URLs
3. **External Resource Blocking**: Separate CSS files and images are blocked by CORS when loaded from `file://`
4. **Module Import Restrictions**: Dynamic imports and module resolution fail under `file://` protocol

### Use Case Requirements

- Training materials are distributed as HTML files with embedded spectrograms
- Users receive these files via email, shared drives, or USB devices
- No web server or local development environment available
- Files must work immediately when double-clicked from file explorer
- All functionality must work identically to web-served version

## Decision

We will implement a dual-build strategy:

1. **Development Build** (existing): ES modules for hot reload and modern development experience
2. **Standalone Build** (new): IIFE bundle optimized for `file://` protocol compatibility

The standalone build will:
- Bundle all JavaScript into a single IIFE (Immediately Invoked Function Expression)
- Inline all CSS within the JavaScript bundle
- Convert small images to base64 data URIs
- Use relative paths exclusively
- Self-initialize without requiring module imports
- Expose a global `window.GramFrame` object

## Rationale

### Why IIFE Format?

IIFE is the only JavaScript format that reliably works across all browsers when loaded via `file://` protocol:
- No module system required
- No CORS restrictions
- Works with standard `<script>` tags
- Proven pattern (used by jQuery, sorttable.js, and many other libraries)

### Why Inline Resources?

External resources trigger CORS when loaded from `file://`:
- CSS files are blocked unless inlined
- Small images work better as data URIs
- Single file is easier to distribute and less likely to have missing dependencies

### Why Dual Build Strategy?

Maintaining separate builds allows us to:
- Keep modern development experience with ES modules and HMR
- Optimize standalone build specifically for `file://` constraints
- Avoid compromising either use case
- Test both deployment scenarios independently

## Implementation Approach

### Build Configuration

```javascript
// vite.config.js additions
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        format: 'iife',
        name: 'GramFrame',
        inlineDynamicImports: true,
        entryFileNames: 'gramframe.bundle.js'
      }
    },
    base: './',  // Relative paths
    assetsInlineLimit: 100000,  // Inline assets under 100KB
    cssCodeSplit: false  // Bundle CSS with JS
  }
});
```

### Bundle Structure

```javascript
(function() {
  'use strict';
  
  // Inject styles
  const style = document.createElement('style');
  style.textContent = `/* all CSS here */`;
  document.head.appendChild(style);
  
  // Component implementation
  const GramFrame = {
    // ... component code
  };
  
  // Global export
  window.GramFrame = GramFrame;
  
  // Auto-initialization
  document.addEventListener('DOMContentLoaded', function() {
    // Auto-detect and initialize components
  });
})();
```

### HTML Usage

```html
<!-- Standalone deployment -->
<script src="./gramframe.bundle.js"></script>

<!-- No type="module" attribute -->
<!-- Single file contains everything -->
<!-- Works with file:// protocol -->
```

## Consequences

### Positive

- **Universal Compatibility**: Works in all deployment scenarios (file://, http://, https://)
- **Simple Distribution**: Single JavaScript file contains entire component
- **No Server Required**: End users don't need technical setup
- **Reliable Deployment**: No missing dependencies or path issues
- **Field Debugging**: Unminified bundle aids troubleshooting (per ADR-010)

### Negative

- **Larger File Size**: Single bundle is larger than split modules
- **No Code Splitting**: Everything loads at once
- **Cache Invalidation**: Any change requires full bundle reload
- **Build Complexity**: Maintaining two build configurations
- **Testing Overhead**: Must test both build outputs

### Neutral

- **Global Namespace**: Component exposed as `window.GramFrame` (common pattern for libraries)
- **Build Time**: Standalone build takes longer due to inlining
- **Source Maps**: May need different source map strategy for standalone build

## Alternatives Considered

### 1. Single Universal Build

Create one build that works everywhere by using only `file://` compatible patterns.

**Rejected because:**
- Would eliminate ES modules and modern development features
- Poor developer experience with no HMR
- Unnecessary constraints for web-deployed versions

### 2. Electron or Similar Wrapper

Package the application in Electron or similar framework.

**Rejected because:**
- Requires installation of additional software
- Increases distribution complexity
- Overkill for a component meant to be embedded

### 3. Service Worker Approach

Use service workers to intercept and handle resource loading.

**Rejected because:**
- Service workers don't work with `file://` protocol
- Adds complexity without solving core problem

### 4. Local Web Server Requirement

Require users to run a local web server (e.g., `python -m http.server`).

**Rejected because:**
- Defeats purpose of standalone deployment
- Requires technical knowledge from end users
- Not feasible in restricted environments

## References

- [sorttable.js](https://github.com/DeepBlueCLtd/Fi3ldMan/blob/main/template/resources/sorttable.js) - Example of successful `file://` compatible library
- [MDN: CORS and the file:// protocol](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS/Errors/CORSRequestNotHttp)
- [Vite Configuration Reference](https://vitejs.dev/config/build-options.html)
- [GitHub Issue #106](https://github.com/DeepBlueCLtd/gram_b/issues/106) - Original feature request

## Notes

This ADR documents a critical deployment requirement that affects how training materials are distributed to end users. The solution must be thoroughly tested across different operating systems and browsers to ensure reliable standalone deployment.