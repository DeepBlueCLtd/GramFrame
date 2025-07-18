import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    minify: false, // Ensure source remains readable for field debugging
    rollupOptions: {
      input: './sample/index.html'
    }
  }
})
