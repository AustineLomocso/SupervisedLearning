# Phase 5 — Build Optimization & GitHub Pages Deployment

Executed inline (the tasks are small and mostly sequential), so this records what was built and why rather than serving as a step-by-step script for agents.

**Goal:** Put the app online at https://austinelomocso.github.io/SupervisedLearning/ and keep it healthy with CI gates, size budgets and a graceful path for tabs left open across a deploy.

**Branch:** `phase-5-deploy`, from `main`. The default branch was renamed from `phase-1-init` to `main` first, and the stale local `main` (an ancestor of the old default) was deleted.

## Starting point (measured on the Phase 4 build)

| Item                                 | Size          | Spec budget |
| ------------------------------------ | ------------- | ----------- |
| Initial JS (entry + React + helpers) | about 131 KB  | 150 KB      |
| Manifest                             | 1.4 KB        | 10 KB       |
| Cert index                           | 4.7 KB        | 20 KB       |
| Question shard                       | 6.4–9.4 KB    | 25 KB       |

All sizes are gzipped. Mermaid and react-markdown were already lazy, and every route was already lazy, so Phase 5 is mostly guard-rails and deployment rather than size work.

## Tasks

1. **Repo housekeeping.** Delete the stale local `main`, rename `phase-1-init` to `main` on GitHub with `gh api .../branches/phase-1-init/rename`, then fix local tracking. The default branch and PRs follow the rename.
2. **Readable content chunks.** `tools/lib/chunkNames.mjs` (`contentChunkName`, unit-tested) names chunks from their source module:
   - `assets/content/<cert>-<task>-<NNN>-[hash].js` for question shards;
   - `assets/content/<cert>-<task>-lesson-[hash].js` for lessons;
   - `assets/content/<cert>-index-[hash].js` for cert indexes.
3. **Build config** (`vite.config.js`):
   - `build.target: 'es2020'`.
   - `chunkFileNames` uses `contentChunkName`.
   - Vendor groups `react`, `dexie` and `markdown` via `build.rolldownOptions.output.codeSplitting.groups`. Vite 8 uses Rolldown, where `manualChunks` is deprecated.
   - The markdown group stays out of the initial load.
   - `chunkSizeWarningLimit` is raised only for Mermaid's lazy ELK bundle.
4. **Size budgets.** `tools/lib/sizeBudget.mjs` (`checkBudgets`, `initialScriptPaths`, unit-tested) and `tools/check-size.mjs` (`npm run check:size`, run after `build`). It fails if a budget is broken, and also if no shard or index chunks are found, because that means the naming broke.
5. **Stale chunks after a deploy.**
   - `src/lib/staleChunks.js` turns Vite's `vite:preloadError` into `useUiStore.updateAvailable`.
   - `components/layout/UpdateBanner.jsx` (in `AppShell`) offers a Reload button.
   - The event is not cancelled, so `RouteError` still shows for the failing page.
6. **GitHub Actions.**
   - `.github/workflows/ci.yml` runs on pull requests and `workflow_call`: content validation (strict), lint, typecheck, format check, unit tests, build, size check, Playwright.
   - `.github/workflows/deploy.yml` runs on pushes to `main` and manual dispatch. It runs the same CI, then builds, uploads `dist/` and deploys to Pages. Concurrency group `pages` never cancels a running deploy.
   - Action versions were checked against the latest releases on 2026-10-15: checkout v7, setup-node v7, configure-pages v6, upload-pages-artifact v5, deploy-pages v5, upload-artifact v7.
   - Both files pass `@action-validator/cli`.
7. **Docs.** `CLAUDE.md` (status, commands, a Deployment section) and `README.md` (live URL, `check:size`).
8. **Go live** (after CI is green on the PR, before merging):
   - make the repo public (GitHub Pages on the free plan needs it);
   - enable Pages with `build_type=workflow`;
   - merge, then watch `deploy.yml` with `gh run watch`;
   - smoke-test the live URL (deep links, refresh, a Study test) and run Lighthouse.

## Verification

- Local: `validate:content -- --strict`, `lint`, `typecheck`, `format:check`, `npm test`, `npm run build && npm run check:size`, `npm run test:e2e`.
- GitHub: `ci.yml` green on the PR (this is the first run on Linux), then `deploy.yml` green after the merge.
- Live: the site loads, hash deep links survive a refresh, a Pre-Test works, and Lighthouse (mobile) scores Performance 90 or more and Accessibility 95 or more.
