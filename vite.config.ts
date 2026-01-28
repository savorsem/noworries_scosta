import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      open: false,
    },
    build: {
      sourcemap: mode !== 'production',
      outDir: 'dist',
      emptyOutDir: true,
    },
    resolve: {
      alias: {
        '@': new URL('./', import.meta.url).pathname,
      },
    },
  }
})
