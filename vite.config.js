import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
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
})
