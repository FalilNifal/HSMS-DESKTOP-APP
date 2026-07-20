import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/main/index.ts') }
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/preload/index.ts') }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/renderer/index.html') }
      }
    },
    plugins: [react()],
    server: {
      // In dev the renderer calls the API through this proxy (same-origin),
      // which avoids CORS and the API's HTTPS redirect. The .NET API must be
      // running on http://localhost:5146 (dotnet run --launch-profile http).
      proxy: {
        '/api': {
          target: 'http://localhost:5146',
          changeOrigin: true
        }
      }
    }
  }
})
