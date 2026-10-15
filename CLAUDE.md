# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A 100% frontend React + Vite study app for the AWS CLF-C02 and AIF-C01 exams, deployed as a static site to GitHub Pages at `/SupervisedLearning/`. There is no backend. Learner progress lives in IndexedDB; exam content is JSON/Markdown under `content/`.

- The design spec is `docs/superpowers/specs/2026-10-13-aws-cert-review-design.md`. Read it before changing anything user-facing.
- Phase plans are in `docs/superpowers/plans/`.
- Phases 1 (app shell, data layer), 2 (content engine, seed content), 3 (curriculum UI), 4 (exam engine) and 5 (build and deploy) are done. Phase 6 (bulk content) is not built yet.
- The app is deployed at https://austinelomocso.github.io/SupervisedLearning/. The default branch is `main`; pushing to it deploys.

## Commands

| Command                                 | Notes                                                                               |
| --------------------------------------- | ----------------------------------------------------------------------------------- |
| `npm run dev`                           | Serves http://localhost:5173/SupervisedLearning/                                    |
| `npm test`                              | Vitest, all tests                                                                   |
| `npm test -- src/content/certs.test.js` | One file. Add `-t "name"` to run one test.                                          |
| `npm run test:e2e`                      | Playwright, run against a fresh production build (`build` + `preview` on port 4173) |
| `npm run lint`                          | oxlint with `--deny-warnings`, so warnings fail                                     |
| `npm run typecheck`                     | `tsc --checkJs` over `src/` and `vite.config.js`                                    |
| `npm run format`                        | Prettier. `npm run format:check` checks without writing.                            |
| `npm run validate:content`              | Prints content errors and warnings. Add `-- --strict` to fail on warnings.          |
| `npm run content:stats`                 | Items and lessons per task, against the targets                                     |
| `npm run check:links`                   | Fetches every curated reference URL. Needs network; not for CI.                     |
| `npm run check:size`                    | After `npm run build`: fails if a size budget is broken (see Deployment).           |
| `npm run build:index`                   | Regenerates `src/generated/`                                                        |

**Vitest only works from PowerShell on this Windows machine.** From Git Bash it fails with "Vitest failed to find the current suite" and collects 0 tests. Run `npm test`, `npx vitest` and `npm run test:e2e` through the PowerShell tool; Bash is fine for everything else.

**`build:index` runs automatically** through the npm `predev`, `prebuild`, `pretest` and `pretypecheck` hooks. It validates content and refuses to write if there are any validation errors. That means one bad content file fails `npm test`, `npm run build` and `npm run typecheck`. Running `npx vitest` directly skips the hook and may use stale generated files.

## Architecture

**Language.** Plain JavaScript (`.js`/`.jsx`) with JSDoc types, checked by TypeScript 5.9 under `checkJs` + `strict`. TypeScript 5.9 is pinned, not 7. Test files and `src/test/` are excluded from `tsc` (fake-indexeddb ships untyped JS). Linting is oxlint, not ESLint; it includes the jsx-a11y and react-hooks rules.

**Content pipeline** (build time → runtime):

1. Authored source: `content/<cert>/`, which holds:
   - `blueprint.json`: official domains, weights and task statements, copied verbatim from the AWS exam guides. Do not paraphrase.
   - `references.json`: curated AWS URLs with the `tasks` they support.
   - `items/<task>/NNN.json`: question shards of at most 25 items each.
   - `review/<task>.md`: one lesson per task.
2. `src/content/schema.js` holds the Zod schemas and is the single source of truth.
   - `src/content/types.js` derives JSDoc types from it with `import('zod').infer<...>`.
   - App code imports only types from it, so Zod is a devDependency and never reaches the bundle.
   - The Node tools import the schemas at runtime.
3. `tools/` (Node ESM): `lib/readContent.mjs` → `lib/validate.mjs` → `lib/buildIndex.mjs`. These write `src/generated/manifest.json` (always loaded) and `src/generated/<cert>.index.json` (lazy-loaded). `src/generated/` is gitignored.
4. Runtime:
   - `src/content/certs.js` reads the manifest (`CERTS`, `getCert`, `getDomain`, `getSubdomain`, `listSubdomains`).
   - `src/content/loadItems.js` and `loadReview.js` lazy-load the cert indexes, shards and lessons via `import.meta.glob`. Each shard becomes its own content-hashed chunk, held in an LRU cache of promises.
   - Glob keys are `'../generated/<cert>.index.json'`, `'/content/<cert>/items/<task>/<NNN>.json'` and `'/content/<cert>/review/<task>.md'`. Keep loader code in sync with these patterns.
   - Loaded items are tagged with `certId` and `taskCode`.

**Content rules that matter when editing:** see `content/AUTHORING.md`.

- `validate.mjs` is the only accuracy gate. There is no human or AI fact-check, so keep it strict.
- Item ids (`<cert>-<task>-NNNN`) are permanent and never reused. To withdraw an item, set `"retired": true`; bump `version` when its meaning changes.
- Items and lessons may only link to URLs listed in that cert's `references.json`.
- Every shard except the last must hold exactly 25 items.

**Persistence (`src/db/`).** Dexie schema v1 lives in `db.js`, with small repository modules per table: attempts, itemStats, progress, flags, settings, backup and persist.

- Never edit a released schema version; add `db.version(2)` with an upgrade.
- `attempts.saveResponse` must use `.modify()`, not `.update()`. Item ids contain dots, which `update()` treats as nested key paths. A dedicated regression test guards this.
- `backup.importBackup` validates the backup before it clears any table, and runs inside one transaction.
- Pre-/Post-Test completion is derived from attempts. `subdomainProgress` stores only Review completion.

**State.** Zustand stores hold only transient UI state:

- `useUiStore`: theme and `storageError`.
- `useSessionStore`: the active attempt cursor and the capped multiple-response selection.

Theme logic is duplicated on purpose in the inline script in `index.html` (it runs before React to avoid a flash of the wrong theme) and in `applyTheme`. Keep the two equivalent.

**Curriculum UI (Phase 3).**

- Pages read progress through `hooks/useCertProgress.js` (`useLiveQuery` over attempts and review marks), so they update live. Derivations are pure functions in `src/engine/`:
  - `mastery.js`: last-20-answers window, bands, `poolMastery`, `recommendNext`.
  - `subdomainStatus.js`: Pre-Test/Review/Post-Test status and the next step.
  - `testConfig.js`: `kind`/`scope` validation and length choices.
- Mastery reads `attempt.responses`, not `itemStats`, because `itemStats` keeps only the latest result per item.
- Mastery bands always render icon + label + percentage (`components/curriculum/`). Never color alone.
- Lessons render through `components/markdown/Markdown.jsx` (react-markdown + remark-gfm + rehype-slug; raw HTML is dropped).
  - `MermaidBlock` imports `mermaid` only when a diagram mounts, and redraws on theme change via `useIsDark`.
  - Any Vitest file that renders a lesson must `vi.mock('mermaid')`.
  - Diagrams draw only once they are within 200 px of the viewport (`IntersectionObserver`; it draws at once where that API is missing, as in jsdom). Playwright tests must scroll `.mermaid-diagram` into view before expecting its `svg`.
- Table-of-contents links use `focus()` + `scrollIntoView()`, never `#id` navigation (the HashRouter reason as the skip link).
- Confirmations use `window.confirm`, because jsdom has no `<dialog>.showModal`. Tests spy on it.
- `e2e/a11y.spec.js` runs axe (WCAG 2.1 A/AA) on every page in both themes. Fix violations at the source; don’t exclude elements.

**Exam engine (Phase 4).**

- `src/engine/` holds pure logic (no DB): `rng.js` (seeded), `blueprint.js` (largest-remainder allocation, even spreading), `selectItems.js` (unseen-first), `drill.js`, `grading.js` (`isCorrect`, `finalizeResponses`, `scoreAttempt`, `buildResult`) and `scaledScore.js`. `startTest.js` orchestrates selection, shard loading and `createAttempt`.
- `src/db/session.js` is the only place answers are applied:
  - `lockAnswer` (Study mode) saves the response and `itemStats` in one transaction.
  - `saveSelection` and `toggleMarked` (Exam mode) save ungraded changes.
  - `finishAttempt` grades everything, records `itemStats` for items not already locked, and stores the result atomically. Afterwards it calls `requestPersistence()`.
- Unanswered questions count as wrong in the score, in mastery and in `itemStats`.
- Selection draws only from the cert index’s `shards` (active ids). The index’s `retired` map keeps withdrawn items loadable so old attempts still resume and show results.
- The runner (`routes/AttemptPage.jsx`) redirects a submitted attempt to its results; results redirect an unfinished attempt to the runner. A timed attempt past its deadline auto-finishes when opened.
- Question text and explanations use `<Markdown variant="inline">` (no heading ids, so many can share a page).
- Component tests that need questions mock `content/loadItems.js` and use `src/test/itemFactories.js`.
- Test timing: Vitest’s `testTimeout` is 15 s and Testing Library’s `asyncUtilTimeout` is 10 s (both set once, in `vite.config.js` and `src/test/setup.js`), because the first visit to a lazy route is slow on a busy machine. Data written through Dexie reaches the page via live queries a moment later, so assert it with `waitFor`.
- In Playwright, `getByRole('radio', { name: '5' })` also matches ‘15’: pass `exact: true`.

**Routing.** `createHashRouter`, because GitHub Pages has no rewrites.

- `src/router.jsx` holds the route table. Every page is lazy-loaded via `page(() => import(...))`, which returns `{ Component }`.
- Breadcrumbs come from each route's `handle: crumb(...)`, read by `components/layout/Breadcrumbs.jsx` through `useMatches()`.
- `CertGuard` returns a 404 for unknown cert ids.
- `useCert()` assumes `CertGuard` already ran.
- Query-string validation, such as `TestSetupPage`'s `kind`, happens inside the component.
- `AppShell` moves focus to `<main>` on every pathname change. The skip link calls `focus()` instead of navigating, because `#main` would be read as a hash route.

**Deployment (Phase 5).**

- `.github/workflows/ci.yml` runs on pull requests and is reused by `deploy.yml`. It runs, in order: `validate:content -- --strict`, lint, typecheck, format check, `npm test`, build, `check:size`, Playwright. A push to `main` runs `deploy.yml`: the same CI, then upload `dist/` and deploy to GitHub Pages (Pages source is "GitHub Actions").
- Size budgets (gzipped), enforced by `npm run check:size` after a build: initial JS 150 KB (the entry script plus its `modulepreload` files), manifest 10 KB, each cert index 20 KB, each question shard 25 KB.
- `check:size` finds content chunks by name. `vite.config.js` names them `assets/content/<cert>-<task>-<NNN>-[hash].js` (shards), `...-lesson-...` and `<cert>-index-...` through `tools/lib/chunkNames.mjs`. If you change that naming, change `tools/check-size.mjs` too; it fails when it finds no shards or indexes.
- Vite 8 bundles with Rolldown: vendor chunks are set with `build.rolldownOptions.output.codeSplitting.groups`, not `manualChunks`. Mermaid is deliberately not in a group (it is lazy and splits by diagram type).
- A tab left open across a deploy requests chunk files that no longer exist. `lib/staleChunks.js` turns Vite’s `vite:preloadError` into `useUiStore.updateAvailable`, and `UpdateBanner` offers a reload. `RouteError` still shows for the page that failed.

## Gotchas

- In JSDoc, never write the literal text `@typedef {...} Name` inside a prose comment. `tsc` parses it as a real declaration and reports duplicate-identifier errors.
- `vite.config.js` uses `json: { stringify: true }`, so JSON modules are emitted as `JSON.parse("...")` for speed. A default import still yields an object.
- Prettier settings: no semicolons, single quotes, `printWidth` 100. Run `npm run format` before committing.
