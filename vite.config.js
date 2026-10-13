import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages project site: https://<user>.github.io/SupervisedLearning/
  base: '/SupervisedLearning/',
  plugins: [react(), tailwindcss()],
  // Emit JSON as JSON.parse("...") — much faster to parse for the large question shards (Phase 2).
  json: { stringify: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
  },
})
