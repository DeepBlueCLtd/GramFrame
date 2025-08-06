import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig(({ command }) => {
  const isStandalone = process.env.BUILD_STANDALONE === 'true'
  
  if (isStandalone) {
    // Standalone IIFE build for file:// protocol compatibility
    return {
      build: {
        outDir: 'dist',
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
      build: {
        outDir: 'dist',
        minify: false, // Ensure source remains readable for field debugging
        rollupOptions: {
          input: {
            main: resolve(__dirname, 'sample/index.html'),
            debug: resolve(__dirname, 'debug.html')
          }
        }
      }
    }
  }
})
