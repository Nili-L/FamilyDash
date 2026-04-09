import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/FamilyDash/',
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.js'],
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': 'http://localhost:3001',
      '/auth': 'http://localhost:3001',
    },
  },
})
