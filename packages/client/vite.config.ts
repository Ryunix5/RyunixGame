import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@ryunix/shared': path.resolve(__dirname, '../shared/src/index.ts')
    }
  },
  server: {
    port: 3000,
    proxy: {
      // Same-origin in dev too, so the server needs no CORS setup
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true
      }
    }
  }
})
