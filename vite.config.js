import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { contentChunkName } from './tools/lib/chunkNames.mjs'

/**
 * Matches modules of the given npm packages (each name may be a regex fragment).
 * @param {...string} packages
 */
const vendor = (...packages) => new RegExp(`node_modules/(?:${packages.join('|')})/`)

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages project site: https://<user>.github.io/SupervisedLearning/
  base: '/SupervisedLearning/',
  plugins: [react(), tailwindcss()],
  // Emit JSON as JSON.parse("...") — much faster to parse for the large question shards (Phase 2).
  json: { stringify: true },
  build: {
    target: 'es2020',
    // Mermaid's ELK layout engine is ~1.4 MB, but it is lazy-loaded and only for diagrams that need
    // it. The size that matters is the initial load, which tools/check-size.mjs enforces.
    chunkSizeWarningLimit: 1600,
    rolldownOptions: {
      output: {
        // Question shards, lessons and cert indexes get readable names under assets/content/
        // (tools/check-size.mjs relies on them). Everything else keeps Vite's default naming.
        chunkFileNames: (chunk) => {
          const name = contentChunkName(chunk.facadeModuleId)
          return name ? `assets/content/${name}-[hash].js` : 'assets/[name]-[hash].js'
        },
        // Vendor chunks that change rarely stay cached across deploys. Mermaid is not listed:
        // it is lazy-loaded and splits by diagram type on its own.
        codeSplitting: {
          groups: [
            { name: 'react', test: vendor('react', 'react-dom', 'scheduler', 'react-router') },
            { name: 'dexie', test: vendor('dexie', 'dexie-react-hooks') },
            {
              name: 'markdown',
              test: vendor(
                'react-markdown',
                'remark-[^/]+',
                'rehype-[^/]+',
                'unified',
                'micromark[^/]*',
                '(?:mdast|hast|unist|estree-util)-[^/]+',
                'vfile[^/]*',
                'github-slugger',
                'property-information',
                '(?:space|comma)-separated-tokens',
                'decode-named-character-reference',
                'character-entities[^/]*',
                'html-url-attributes',
                'devlop',
                'trough',
                'bail',
                'is-plain-obj',
                'trim-lines',
                'zwitch',
                'ccount',
                'markdown-table',
                'longest-streak',
              ),
            },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    // Lazy routes and lesson chunks load slowly on a cold, busy machine; the default 5s flakes.
    testTimeout: 15_000,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}', 'tools/**/*.test.mjs'],
  },
})
