import { defineConfig } from 'vite'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { MIN_BROWSER_VERSION } from './src/core/browserCompatibility.js'

// Injected into src/utils/version.js. Read here rather than written into the
// source by a script, so a build or test run never modifies a tracked file
// (spec 165, GF-37).
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8'))
const versionDefine = { __GRAMFRAME_VERSION__: JSON.stringify(pkg.version) }

// The syntax floor of everything we emit, derived from the same list the
// runtime compatibility guard derives its message from (R9-06).
//
// Without this, esbuild's default target (`modules`, ~Chrome 87) decided what
// syntax reached `dist/` while `browserCompatibility.js` promised Chrome 86.
// The guard is written in ES5 so it can *run* on an old engine and say
// "please update your browser" -- but it ships inside the same IIFE, and a
// single `??=` anywhere in that file is a parse error that kills the whole
// script before the guard ever executes. The result would be a blank page with
// no message, on exactly the machine the guard exists for.
//
// Deriving it rather than hardcoding 'chrome86' means adding an API to
// REQUIRED_APIS with a higher `minVersion` raises the emitted floor and the
// user-facing message together, instead of letting them drift apart.
const buildTarget = `chrome${MIN_BROWSER_VERSION}`

export default defineConfig(() => {
  const isStandalone = process.env.BUILD_STANDALONE === 'true'
  
  if (isStandalone) {
    // Standalone IIFE build for file:// protocol compatibility
    return {
      define: versionDefine,
      build: {
        outDir: 'dist',
        target: buildTarget,
        minify: false, // Ensure source remains readable for field debugging
        base: './', // Use relative paths
        assetsInlineLimit: 100000, // Inline smaller assets as base64
        cssCodeSplit: false, // Bundle CSS into JS
        rollupOptions: {
          input: resolve(__dirname, 'src/index.js'),
          output: {
            format: 'iife',
            name: 'GramFrame',
            inlineDynamicImports: true,
            entryFileNames: 'gramframe.bundle.js',
            assetFileNames: '[name][extname]'
          },
          plugins: [
            {
              name: 'inline-css',
              generateBundle(options, bundle) {
                const cssFiles = Object.keys(bundle).filter(filename => filename.endsWith('.css'))
                const jsFiles = Object.keys(bundle).filter(filename => filename.endsWith('.js'))
                
                if (cssFiles.length > 0 && jsFiles.length > 0) {
                  const cssContent = cssFiles.map(filename => bundle[filename].source).join('\n')
                  const jsFile = bundle[jsFiles[0]]
                  
                  // Inject CSS at the beginning of the IIFE
                  jsFile.code = jsFile.code.replace(
                    '(function() {',
                    `(function() {
  // Inject CSS styles
  const style = document.createElement('style');
  style.textContent = ${JSON.stringify(cssContent)};
  document.head.appendChild(style);
`
                  )
                  
                  // Delete CSS files from bundle
                  cssFiles.forEach(filename => delete bundle[filename])
                }
              }
            }
          ]
        }
      }
    }
  } else {
    // Standard development build
    return {
      define: versionDefine,
      build: {
        outDir: 'dist',
        target: buildTarget,
        minify: false, // Ensure source remains readable for field debugging
        rollupOptions: {
          input: {
            index: resolve(__dirname, 'index.html'),
            main: resolve(__dirname, 'sample/index.html'),
            debug: resolve(__dirname, 'debug.html'),
            'debug-trainer': resolve(__dirname, 'debug-trainer.html')
          }
        }
      }
    }
  }
})
