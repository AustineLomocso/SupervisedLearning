# AWS Certification Review App — Design Spec (CLF-C02 & AIF-C01)

## Context

Greenfield project in an empty folder (`C:\Users\austi\SupervisedLearning`, not yet a git repo). Goal: a **100% frontend React + Vite** study app, deployed free on **GitHub Pages**, that teaches and tests two AWS certs (CLF-C02, AIF-C01) through a guided curriculum:

`Cert → Domain → Sub-domain (Pre-Test → Review → Post-Test) → Domain Assessment → Full Practice Exam`, plus a **Diagnostic Exam** to find weak areas.

There is no backend, so the hard problems are (a) serving 4,000+ richly explained items without a heavy load, (b) tracking progress durably in the browser, and (c) producing that much content (AI-generated in Claude Code sessions, then improved through learner flags).

## Locked Decisions (from Q&A)

| Area | Decision |
|---|---|
| Audience | Public learners → WCAG 2.1 AA, mobile-first, "Not affiliated with AWS" + "AI-generated content" disclaimers |
| Content source | AI-generated in Claude Code sessions; all items ship; learners flag issues in-app |
| Flag delivery | Saved locally (IndexedDB), "My Reports" page with JSON export |
| Progression | **Guided, nothing locked**; recommended order + status chips |
| Diagnostic | 65 Q, exam-weighted, per cert |
| Item pools | **Single shared pool per sub-domain, unseen-first** selection for every test type |
| Freshness | No assessment/diagnostic/exam repeats the same set; repeats only after the unseen supply is exhausted (least-recently-seen first) |
| Feedback | Instant per-answer explanation in Pre/Post/Domain/Drill. Diagnostic & Full Exam: learner toggles **Study mode** (instant) vs **Exam mode** (review at end) |
| Timers | 90-min countdown only for Diagnostic + Full Exam in Exam mode |
| Scoring | Raw % + **estimated** 100–1000 scaled score (pass 700, labelled as estimate) + per-domain/sub-domain breakdown |
| Q types | MC + MR now; schema has `type` discriminator, ready for Ordering/Matching/Case Study later |
| MR scoring | All-or-nothing; prompt states "Choose TWO/THREE"; selection capped at that count |
| Test lengths | Learner chooses before each test (defaults: Pre 10, Post 15, Domain 30, Drill 20) |
| Sub-domains | Official exam-guide task statements: **CLF-C02 = 19** (4/4/8/3), **AIF-C01 = 14** (3/3/4/2/2) |
| Review material | Markdown per sub-domain + Mermaid diagrams (Mermaid lazy-loaded) |
| Explanations | Per-option rationale (every option) + overall explanation + 1–3 AWS doc references |
| Weak areas | Mastery dashboard (heatmap) + targeted Weak-Area Drill mode |
| Language / styling | JavaScript + JSDoc (type-checked via `checkJs`), Tailwind CSS |
| Routing / hosting | HashRouter; project site `https://<user>.github.io/SupervisedLearning/` (`base: '/SupervisedLearning/'`) |
| Resilience | Progress export/import (JSON) + `navigator.storage.persist()`; **no PWA/offline** this sprint |
| Testing | Vitest + React Testing Library + content validator + Playwright E2E, all in CI |
| Architecture | **Zustand** (session/UI state) + **Dexie/IndexedDB** (durable progress) + **25-item JSON shards lazy-loaded via `import.meta.glob`** |
| Content plan | Seed bank (~20 items + 1 lesson per sub-domain) in Phase 2; bulk generation to 2,000+/cert in **Phase 6** |

### Adjustable defaults (design parameters I set; change any before Phase 1)
- Mastery = accuracy over the **last 20 answered items** in a sub-domain; "low confidence" if < 5 answered. Bands: < 50% Weak, 50–74% Developing, ≥ 75% Strong.
- Recommended-next ordering = `(1 − mastery) × domainWeight`.
- Authoring mix targets: ~20% MR (validator warns outside 15–30%); difficulty 1/2/3 ≈ 30/50/20%.
- Scaled-score estimate: piecewise linear (0% → 100, 70% → 700, 100% → 1000).
- Import = **replace** (with confirmation), not merge.
- Items per sub-domain distributed evenly: CLF ≥ 106 × 19 = 2,014; AIF ≥ 143 × 14 = 2,002.
- Validator bans "All/None of the above" options (option order is shuffled per attempt; AWS doesn't use them).

---

## Architecture Overview

```
                       ┌───────────────────── Build time (Node, /tools) ──────────────────────┐
 content/ (authored) ──► validate-content.mjs ──► build-index.mjs ──► src/generated/*.json     │
   blueprint.json         (Zod schemas, dupes,      (manifest + per-cert                          │
   items/<task>/NNN.json   MR rules, link format)    item index)                                  │
   review/<task>.md                                                                               │
                       └──────────────────────────────────────────────────────────────────────────┘
                                         │ vite build (hashed chunks)
                                         ▼
 Browser ── index.html + app shell (≤150 KB gz) + manifest (≤10 KB gz)
   │  on cert entry      → cert index (item IDs per shard, ≤20 KB gz)
   │  on test start      → engine selects IDs → loads only the needed shards (≈15–20 KB gz each)
   │  on review open     → lesson .md chunk (+ Mermaid chunk only if diagram present)
   ▼
 Zustand (active attempt, UI) ◄──► Dexie/IndexedDB (attempts, itemStats, subdomainProgress, flags, settings)
```

**Why shards via `import.meta.glob`:** each shard becomes a separate content-hashed chunk → automatic cache-busting on GitHub Pages (which serves `Cache-Control: max-age=600`), no manual versioning, no 4 MB monolith in memory. In-memory shard LRU cache (cap 80 shards ≈ 4 MB raw).

---

## Phase 0 — Spec Gate (on approval, before Phase 1)
1. `git init` in `SupervisedLearning`; save this design as `docs/superpowers/specs/2026-10-13-aws-cert-review-design.md`; commit.
2. You review the spec file; then I create the Phase 1 implementation plan (writing-plans) and execute.

---

## Phase 1 — Project Initialization & Architecture

**Tasks**
1. Scaffold: `npm create vite@latest . -- --template react`; Node 24 LTS (matches local v24.19); `.nvmrc`.
2. Dependencies: `react-router-dom` (HashRouter), `zustand`, `dexie`, `dexie-react-hooks`, `tailwindcss` + `@tailwindcss/vite`, `zod`; dev: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@playwright/test`, `eslint` (flat config) + `eslint-plugin-react-hooks` + `eslint-plugin-jsx-a11y`, `prettier`, `typescript` (type-check only, `checkJs`), `fake-indexeddb` (tests).
3. `vite.config.js`: `base: '/SupervisedLearning/'`, `json: { stringify: true }`, Vitest config block.
4. `jsconfig.json` with `checkJs: true`, `strict: true`; `npm run typecheck` = `tsc --noEmit -p jsconfig.json`.
5. Router skeleton with lazy routes (see below), AppShell (header, breadcrumbs, footer disclaimer), 404 route.
6. Dexie DB v1 schema + repository modules (below); `persist.js` requests persistent storage after the first submitted attempt; storage status shown in Settings.
7. Zustand stores: `useSessionStore` (active attempt runtime), `useUiStore` (theme, dialogs). Theme in localStorage only (prevents a flash of the wrong theme on load); everything else in IndexedDB.
8. Accessibility baseline: skip link, focus outlines, `prefers-reduced-motion`, dark/light theme tokens.
9. npm scripts: `dev`, `build`, `preview`, `test`, `test:e2e`, `lint`, `typecheck`, `validate:content`, `build:index` (`predev`/`prebuild` run `build:index`).

**Routes (HashRouter)**
| Path | Page |
|---|---|
| `#/` | Cert picker + disclaimers |
| `#/:certId` | Cert dashboard: mastery heatmap, Diagnostic / Full Exam / Weak-Area Drill CTAs, domain list |
| `#/:certId/d/:domainNo` | Domain: sub-domain list with step status, Domain Assessment CTA |
| `#/:certId/s/:taskCode` | Sub-domain stepper: Pre-Test → Review → Post-Test |
| `#/:certId/s/:taskCode/review` | Markdown lesson |
| `#/:certId/test/new?kind=&scope=` | Test setup (length, Study/Exam mode where applicable) |
| `#/attempt/:attemptId` | Test runner |
| `#/attempt/:attemptId/results` | Results + full question review |
| `#/settings` | Export/import, My Reports, storage status, theme |

**File structure**
```
SupervisedLearning/
├─ .github/workflows/{ci.yml, deploy.yml}
├─ content/                         # authored source of truth (Phase 2/6)
│  ├─ clf-c02/{blueprint.json, items/1.1/001.json…, review/1.1.md…}
│  └─ aif-c01/{…same…}
├─ tools/{validate-content.mjs, build-index.mjs, content-stats.mjs}
├─ src/
│  ├─ main.jsx, App.jsx, router.jsx
│  ├─ generated/                    # gitignored; manifest.json, clf-c02.index.json, aif-c01.index.json
│  ├─ routes/                       # page components (lazy)
│  ├─ components/{layout,curriculum,test,markdown,ui}/
│  ├─ content/{schema.js, manifest.js, loadItems.js, loadReview.js}
│  ├─ engine/{rng.js, blueprint.js, selectItems.js, grading.js, scaledScore.js, mastery.js, drill.js}
│  ├─ db/{db.js, attempts.js, itemStats.js, progress.js, flags.js, settings.js, backup.js, persist.js}
│  ├─ stores/{useSessionStore.js, useUiStore.js}
│  ├─ hooks/
│  └─ styles/index.css
└─ tests/{unit…co-located *.test.js}, e2e/*.spec.js
```

**Dexie schema v1 (`db.js`)**
```js
db.version(1).stores({
  attempts:          'id, certId, [certId+kind], scopeId, status, startedAt',
  itemStats:         'itemId, certId, subdomainId, lastSeenAt',
  subdomainProgress: 'subdomainId, certId',
  flags:             '++id, itemId, certId, createdAt',
  settings:          'key',
});
```
- **Attempt** `{ id (uuid), certId, kind: 'pre'|'post'|'domain'|'diagnostic'|'full'|'drill', scopeId, mode: 'study'|'exam', status: 'in_progress'|'submitted', startedAt, deadlineAt|null, submittedAt, itemIds[], optionOrder{itemId:[optId]}, responses{itemId:{selected[], submitted, correct, markedForReview, answeredAt}}, currentIndex, result{correct,total,pct,scaledEstimate,passed,byDomain{},bySubdomain{}} }`
- **ItemStat** `{ itemId, certId, subdomainId, seenCount, correctCount, lastSeenAt, lastCorrect, itemVersion }`
- **SubdomainProgress** `{ subdomainId, certId, reviewCompletedAt }` (Pre/Post status is derived from attempts, not duplicated)
- **Flag** `{ id, itemId, itemVersion, certId, reason: 'wrong-answer'|'unclear'|'outdated'|'typo'|'other', note, createdAt }`
- Timer stores an absolute `deadlineAt`, so a page refresh resumes correctly; each answer is persisted immediately → mid-test refresh resumes.

**Exit criteria:** `npm run dev` serves the shell with all routes navigable; Dexie opens and survives reload; lint/typecheck/test pass.

---

## Phase 2 — Data Schema & Content Engine

**Blueprint (`content/<cert>/blueprint.json`)**
```json
{ "certId": "clf-c02", "code": "CLF-C02", "title": "AWS Certified Cloud Practitioner",
  "exam": { "questions": 65, "minutes": 90, "passScaled": 700 },
  "domains": [ { "no": 1, "title": "Cloud Concepts", "weight": 0.24,
     "subdomains": [ { "code": "1.1", "title": "Define the benefits of the AWS Cloud" } ] } ] }
```
Encode all 19 CLF-C02 and 14 AIF-C01 task statements verbatim from the official exam guides.

**Item shard (`content/<cert>/items/<task>/NNN.json`, max 25 items)**
```json
{ "schemaVersion": 1, "subdomain": "1.1", "items": [ {
  "id": "clf-c02-1.1-0042",            // stable forever; never reused
  "version": 1,                          // bump on content edits
  "type": "single",                      // "single" | "multiple" (future: "ordering","matching","case")
  "selectCount": 1,                      // must equal # correct options; ≥2 for "multiple"
  "difficulty": 2,                       // 1–3
  "stem": "Markdown question text…",
  "options": [ { "id": "a", "text": "…", "correct": true,  "rationale": "Why correct…" },
               { "id": "b", "text": "…", "correct": false, "rationale": "Why wrong…" } ],
  "explanation": "Markdown in-depth explanation of the concept…",
  "references": [ { "title": "…", "url": "https://docs.aws.amazon.com/…" } ],
  "retired": false } ] }
```
Options 4 for MC, 5–6 for MR; IDs `a–f` stable, display letters assigned by shuffled position.

**Generated (`src/generated/`, by `build-index.mjs`)**
- `manifest.json`: certs → domains → subdomains with weights, item counts, lesson presence (always loaded).
- `<cert>.index.json`: `{ "<task>": { "001": ["clf-c02-1.1-0001", …], … } }` excluding retired items (loaded on cert entry).

**Validator (`validate-content.mjs`, Zod)**: schema conformance; unique IDs across cert; ID prefix matches folder; `selectCount` === correct count; MR has ≥ 2 correct; every option has a non-empty rationale; 1–3 references with `https://` AWS domains; no "all/none of the above"; shard ≤ 25 items; near-duplicate stems (trigram Jaccard > 0.8) flagged; lesson exists per sub-domain; Mermaid code fences syntactically closed. `content-stats.mjs` prints counts per sub-domain/type/difficulty vs targets.

**Loader layer (`src/content/`)**
- `loadItems(ids)`: map IDs → shards via index, `import.meta.glob('/content/*/items/*/*.json')` lazy loaders, parallel load, LRU cache; returns items in the requested order.
- `loadReview(cert, task)`: `import.meta.glob('/content/*/review/*.md', { query: '?raw' })`.

**Seed content (Claude Code sessions):** 33 Markdown lessons + ~20 items per sub-domain (~660 items), ~20% MR; passes the validator.

**Exit criteria:** `npm run validate:content` passes; unit tests for loader + index build; seed bank loads in dev.

---

## Phase 3 — Core UI/UX & Curriculum Flow

**Tasks**
1. **Home**: cert cards (code, title, item count, overall mastery), disclaimers.
2. **Cert dashboard**: domain cards with weight %, **mastery heatmap** (domains × sub-domains, color + text label + icon, so color is never the only signal), CTAs: *Take Diagnostic* (highlighted when no data yet), *Weak-Area Drill*, *Full Practice Exam*; "Recommended next" list.
3. **Domain page**: sub-domain rows with a 3-step status (Pre ✓ / Review ✓ / Post ✓, best Post score), Domain Assessment CTA.
4. **Sub-domain stepper** (`SubdomainStepper`): Pre-Test → Review → Post-Test; nothing locked, but the next recommended step is visually primary.
5. **Review page**: `Markdown.jsx` (`react-markdown` + `remark-gfm`), `MermaidBlock.jsx` lazily imports `mermaid` only when a diagram is present (theme-aware), table of contents, "Mark as reviewed" → `subdomainProgress.reviewCompletedAt`, CTA to Post-Test.
6. **Test setup page**: length picker (Pre 5/10/15/20, Post 10/15/20/25, Domain 20/30/40/50, Drill 10/20/30), Study/Exam toggle for Diagnostic/Full, timer notice.
7. **Settings**: theme, storage persistence status, Export/Import progress, **My Reports** (list, delete, export JSON), reset progress.
8. Responsive layouts (≥ 320 px), keyboard navigation, `aria-live` regions.

**Mastery & recommendations (`engine/mastery.js`)**: computed from `itemStats` + attempt responses; live-updating via `useLiveQuery`.

**Exit criteria:** full guided navigation works on seed data; RTL tests for stepper status derivation and heatmap labels; axe checks pass in E2E.

---

## Phase 4 — Assessment & Exam Engine

**Selection (`engine/selectItems.js`, pure, seeded RNG for tests)**
- Pre/Post/Domain/Drill/Diagnostic/Full all use **unseen-first**: per sub-domain, randomly sample unseen IDs; if short, fill with seen IDs ordered by oldest `lastSeenAt`; exclude retired items and duplicates within the attempt.
- **Exam blueprint (`engine/blueprint.js`)**: largest-remainder allocation of 65 by domain weight → CLF-C02 **16/19/22/8**; AIF-C01 **13/16/18/9/9**. Within a domain, round-robin across sub-domains.
- Domain Assessment: chosen length spread round-robin across that domain's sub-domains.
- **Drill (`engine/drill.js`)**: ~50% previously missed items (`lastCorrect === false`), ~50% from weakest sub-domains sampled ∝ `(1 − mastery) × domainWeight`.
- Option order is shuffled per attempt and stored in `optionOrder`.

**Grading (`engine/grading.js`)**: `isCorrect(item, selected)` = set equality with correct IDs (all-or-nothing for MR). `scoreAttempt` → correct/total/pct, `byDomain`, `bySubdomain`; `scaledScore.js` → estimate + pass (≥ 700). Every graded answer updates `itemStats` in one Dexie transaction.

**Runner UI (`components/test/`)**
- `QuestionCard`: stem, "Choose TWO" badge for MR, `OptionList` (radio for MC, checkbox for MR, capped at `selectCount`), Submit enabled only with a complete selection. Keys: `A–F`/`1–6` select, `Enter` submit, `N` next.
- **Instant-feedback modes** (Pre/Post/Domain/Drill, Study-mode Diagnostic/Full): on Submit, the answer locks and `ExplanationPanel` renders immediately: Correct/Incorrect banner (icon + text, announced via `aria-live`), correct options highlighted, learner's choices marked, **`OptionRationale` for every option**, overall explanation (Markdown), `ReferenceList`, **Report issue** button (`ReportIssueDialog`). Focus moves to the panel heading.
- **Exam mode** (Diagnostic/Full): no feedback; answers changeable; "Mark for review"; `QuestionNavigator` grid (answered/unanswered/marked); `Timer` from `deadlineAt` with 10-min and 1-min warnings; auto-submit at zero; confirm on manual submit with unanswered count.
- **Results page**: raw %, estimated scaled score + pass/fail (labelled "estimate"), per-domain bars, per-sub-domain table with mastery band, time used, *Drill weak areas* CTA, full review list (filter All/Incorrect/Marked) reusing `ExplanationPanel`.
- Resume: in-progress attempts listed on dashboard; refresh mid-test resumes at `currentIndex`.

**Exit criteria:** Vitest coverage of selection (no repeats while unseen remain, blueprint counts, retired exclusion), grading (MC/MR edge cases), scaled score, mastery, drill; RTL tests for MR cap, Submit gating, explanation-on-every-answer, exam-mode suppression; Playwright: start Pre-Test → answer → explanation visible → reload → progress persists; Full Exam in Exam mode → submit → results.

---

## Phase 5 — Build Optimization & GitHub Pages Deployment

**Vite build**
- `base: '/SupervisedLearning/'`, `build.target: 'es2020'`, `json.stringify: true`.
- `manualChunks`: `react` vendor, `dexie`, `markdown` (react-markdown + remark-gfm), `mermaid` (lazy only); content shards emitted under `assets/content/` via `chunkFileNames`.
- Route-level `React.lazy` for runner, review, results, settings.
- `vite:preloadError` handler → "A new version is available, reload" toast (handles stale chunks after a deploy).
- **Budgets** (checked in CI by a small size script): initial JS ≤ 150 KB gz, manifest ≤ 10 KB gz, cert index ≤ 20 KB gz, each shard ≤ 25 KB gz; Lighthouse mobile performance ≥ 90, accessibility ≥ 95.

**GitHub Actions**
- `ci.yml` (PRs + pushes): checkout → setup-node (24, npm cache) → `npm ci` → `validate:content` → `lint` → `typecheck` → `test` → `build` → Playwright (Chromium) against `vite preview` → size budget check.
- `deploy.yml` (push to `main`): same gates → `actions/upload-pages-artifact` (`dist/`) → `actions/deploy-pages`; `permissions: { pages: write, id-token: write, contents: read }`; `concurrency: pages`. Action versions pinned to current majors at implementation time.
- Repo setup: GitHub repo `SupervisedLearning`, Settings → Pages → Source = **GitHub Actions**.

**Exit criteria:** green CI; live at `https://<user>.github.io/SupervisedLearning/` with seed bank; deep links (hash routes) and refresh work; budgets met.

---

## Phase 6 — Bulk Content Generation (to 2,000+ per cert)

- Batch unit = one 25-item shard for one sub-domain, generated in a Claude Code session from the blueprint task statement + the sub-domain lesson, following an authoring guide (`content/AUTHORING.md`: style, MR ratio, difficulty mix, rationale depth, reference rules, banned patterns).
- Each batch: generate → `validate:content` → `content-stats` → dedupe review → commit. CI redeploys automatically.
- Targets: CLF-C02 ≥ 106 items × 19 sub-domains (≥ 2,014); AIF-C01 ≥ 143 × 14 (≥ 2,002). Total ≈ 162 shards.
- Flag triage loop: learners export reports → you share the JSON → fix the item, bump `version` (or set `retired: true`), commit.

---

## Verification (end-to-end)
1. `npm run validate:content && npm run lint && npm run typecheck && npm test` all pass locally.
2. `npm run build && npm run preview` → manual pass: pick a cert → Diagnostic (Exam mode, timer visible) → submit → results + heatmap populated → open the weakest sub-domain → Pre-Test (explanation renders after every answer, correct or not) → Review (Mermaid renders) → Post-Test (no items repeated from the Pre-Test) → Domain Assessment → Weak-Area Drill.
3. DevTools Network: initial load fetches no question shards; starting a Post-Test fetches only that sub-domain's shards.
4. Export progress → clear site data → import → dashboard restored.
5. `npm run test:e2e` green; Lighthouse budgets met on the deployed Pages URL.
