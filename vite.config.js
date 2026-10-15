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
    // Lazy routes and lesson chunks load slowly on a cold, busy machine; the default 5s flakes.
    testTimeout: 15_000,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}', 'tools/**/*.test.mjs'],
  },
})
