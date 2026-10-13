# Phase 3 — Core UI/UX & Curriculum Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Phase 1 route stubs into the guided curriculum. Learners can see their mastery (heatmap and recommendations), follow each task's Pre-Test → Review → Post-Test path, read lessons with diagrams, set up a test, and manage backups, reports and resets in Settings.

**Architecture:** Pure derivation functions in `src/engine/` (mastery, sub-domain status, test config) turn IndexedDB rows into view data. One live hook, `useCertProgress`, reads attempts and review marks through `useLiveQuery`, so every page updates when progress changes. Pages compose small presentational components from `src/components/{curriculum,markdown,settings,test,ui}/`. Lessons render with react-markdown. Mermaid is imported dynamically only when a diagram is actually on screen.

**Tech Stack:** React 19, React Router 7 (hash router), Dexie 4 + dexie-react-hooks, Tailwind 4, react-markdown 10 + remark-gfm 4 + rehype-slug 6, mermaid 12 (lazy), Vitest 5 + RTL, Playwright + @axe-core/playwright.

**Spec:** `docs/superpowers/specs/2026-10-13-aws-cert-review-design.md`, section "Phase 3". **Branch:** `phase-3-curriculum`, created during planning from `phase-1-init` (the repo's default branch, which already contains the merged Phase 2).

---

## Conventions for every task

- Run Vitest **only through the PowerShell tool**: `npm test -- <files>`. From Git Bash it collects 0 tests. Use Bash for git and everything else.
- `npm test` runs `build:index` first (via `pretest`), so the generated manifest is always fresh. Do not call `npx vitest` directly.
- Before every commit, run `npm run format`, `npm run lint` and `npm run typecheck`, then `git status` to confirm only the task's files are staged.
- End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, passed as a second `-m`.
- JSDoc gotcha: never write the literal text `@typedef {…} Name` inside prose in a comment, because `tsc` parses it as a declaration.
- `oxlint` runs with `--deny-warnings`. A `.jsx` file may export only components (`react/only-export-components`), so put constants and helpers in `.js` files.
- Never spread react-markdown's `node` prop onto DOM elements. Destructure only the props you need.
- Test files and `src/test/` are excluded from `tsc`, so test code needs no type casts.

## Verified during planning (probe, 2026-10-14)

- `useLiveQuery` re-renders after a Dexie write under jsdom + fake-indexeddb.
- `File.prototype.text()` works in this jsdom. `HTMLDialogElement.prototype.showModal` does **not** exist, so confirmations use `window.confirm`.
- react-markdown 10 + remark-gfm + rehype-slug in Vitest: `## Key concepts` gets `id="key-concepts"`, GFM tables render, and a custom `pre` component receives the hast `node`, whose `children[0]` is the `code` element.
- `import.meta.glob('/content/*/review/*.md', { query: '?raw', import: 'default', eager: true })` works in a test file.
- The mermaid 12.0.0 API is unchanged from 11: `initialize({ startOnLoad, securityLevel, theme })` and `render(id, text) → Promise<{ svg }>`. Its `theme` option accepts `'default'` and `'dark'`.
- Versions: react-markdown 10.1.0, remark-gfm 4.0.1, rehype-slug 6.0.0, mermaid 12.0.0 (2026-09-10; 12.2.0 is one day old, so it is skipped), @axe-core/playwright 4.13.0.
- Manifest facts used in tests: CLF-C02 domain weights are 0.24/0.30/0.34/0.12, with 4/4/8/3 tasks. Task 1.1's title is `Define the benefits of the AWS Cloud.`, which ends with a period, while lesson H1s have none. CLF domain 1 is `Cloud Concepts`, domain 3 is `Cloud Technology and Services`, AIF domain 3 is `Applications of Foundation Models`. Every seed task has about 20 items.

## Design decisions (from the spec, made concrete)

- **Mastery** = accuracy over the last 20 **graded answers** in a sub-domain, read from `attempt.responses`. A response counts once `correct` is a boolean and `answeredAt` is set. `itemStats` is not used, because it keeps only the latest result per item and can't give a last-20-answers window. `pct` is a whole number, and the band is computed from that same integer, so the label always matches the number shown. Fewer than 5 answers means "low confidence".
- **Recommended next** = sub-domains sorted by `(1 − pct/100) × domainWeight`, where no answers counts as 0%. The sort is stable, so ties keep blueprint order. The dashboard shows the top 3.
- **Step status**: Pre-Test and Post-Test are done when a submitted attempt of that kind exists for the sub-domain, and `bestPct` is the maximum `result.pct`. Review is done when `subdomainProgress.reviewCompletedAt` is set. The **next step** is the one after the furthest completed step, and `null` once the Post-Test is done. This way, finishing a later step never sends the learner back.
- **Heatmap colors** follow the dataviz status rule: tinted cell + band icon + text label + percentage. Text always uses ink colors, never the band color. Low confidence also gets a dashed border and "(few answers)".
- **Test setup** validates `kind` + `scope` and offers lengths and modes. The pool size disables lengths that can't be filled. **Start is disabled** with an explanatory note until Phase 4 builds the selection engine and runner.
- **Settings**: Backup (download/restore with `window.confirm`), My reports (list, delete, export JSON), Reset progress (clears attempts, item stats and review marks, and keeps reports and settings).
- **Lesson page**: the lesson's own `# H1` is the page H1. The table of contents is read from the rendered DOM (rehype-slug ids). TOC links use `focus()` + `scrollIntoView()` because a `#id` href is a route under HashRouter.

## File structure

```
src/
├─ content/ids.js                         # + parseItemId
├─ engine/
│  ├─ mastery.js                          # collectAnswers, masteryBand, masteryBySubdomain, poolMastery, recommendNext
│  ├─ subdomainStatus.js                  # deriveSubdomainStatus
│  └─ testConfig.js                       # resolveTestScope, lengthChoices, defaultLength, isExamKind
├─ lib/
│  ├─ format.js                           # formatPct, formatWeight, formatDate, describeMastery
│  └─ download.js                         # downloadJson, fileDateStamp
├─ hooks/
│  ├─ useCertProgress.js                  # live attempts + reviews → mastery
│  ├─ useIsDark.js                        # follows the `dark` class on <html>
│  └─ useLesson.js                        # lazy lesson Markdown
├─ db/{backup.js, flags.js}               # + resetProgress; + FLAG_REASON_LABELS, buildReportsExport
├─ components/
│  ├─ ui/{styles.js, icons.jsx, Loading.jsx}
│  ├─ curriculum/{masteryBands.js, MasteryBadge.jsx, MasteryHeatmap.jsx,
│  │              SubdomainStepper.jsx, StepChips.jsx, CertCard.jsx}
│  ├─ markdown/{Markdown.jsx, MermaidBlock.jsx, TableOfContents.jsx, headings.js}
│  ├─ settings/{BackupSection.jsx, ReportsSection.jsx, ResetSection.jsx}
│  └─ test/TestSetupForm.jsx
├─ routes/{HomePage, CertDashboardPage, DomainPage, SubdomainPage, ReviewPage,
│          TestSetupPage, SettingsPage}.jsx   # rewritten
├─ test/factories.js                      # makeAttempt, makeResult, graded
└─ index.css                              # + .lesson typography, mermaid sizing
e2e/{app.spec.js (updated), curriculum.spec.js, a11y.spec.js}
```

---

### Task 1: Dependencies and the plan commit

**Files:**

- Modify: `package.json`, `package-lock.json`
- Add: this plan

- [ ] **Step 1: Confirm the branch**

Run: `git branch --show-current`
Expected: `phase-3-curriculum`. If not, run `git checkout -b phase-3-curriculum phase-1-init`.

- [ ] **Step 2: Install runtime and dev dependencies**

```bash
npm install react-markdown@10.1.0 remark-gfm@4.0.1 rehype-slug@6.0.0 mermaid@12.0.0
npm install -D @axe-core/playwright@4.13.0
```

Expected: `package.json` `dependencies` now list `mermaid`, `react-markdown`, `rehype-slug`, `remark-gfm`, and `devDependencies` lists `@axe-core/playwright`.

- [ ] **Step 3: Confirm nothing broke**

Run (PowerShell): `npm test`
Expected: all existing tests pass.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json docs/superpowers/plans/2026-10-14-phase-3-curriculum-ui.md
git commit -m "chore: add markdown, mermaid and axe dependencies for Phase 3" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `parseItemId`

**Files:**

- Modify: `src/content/ids.js`
- Test: `src/content/ids.test.js`

- [ ] **Step 1: Write the failing test**

Change the import line in `src/content/ids.test.js` to `import { domainId, parseItemId, subdomainId } from './ids.js'` and add inside the `describe('ids', …)` block:

```js
it('splits an item id into its cert and task', () => {
  expect(parseItemId('clf-c02-1.1-0042')).toEqual({ certId: 'clf-c02', taskCode: '1.1' })
  expect(parseItemId('aif-c01-3.10-0001')).toEqual({ certId: 'aif-c01', taskCode: '3.10' })
})

it('rejects strings that are not item ids', () => {
  expect(parseItemId('clf-c02-1.1')).toBeNull()
  expect(parseItemId('nonsense')).toBeNull()
})
```

- [ ] **Step 2: Run it and watch it fail**

Run (PowerShell): `npm test -- src/content/ids.test.js`
Expected: FAIL, `parseItemId is not a function`.

- [ ] **Step 3: Implement**

Append to `src/content/ids.js`:

```js
// Same shape the content schema enforces: "<cert>-<task>-NNNN".
const ITEM_ID = /^([a-z]{3}-c\d{2})-(\d+\.\d+)-\d{4}$/

/**
 * Splits a permanent item id such as "clf-c02-1.1-0042" into its cert and task.
 * @param {string} itemId
 * @returns {{ certId: string, taskCode: string } | null}
 */
export function parseItemId(itemId) {
  const match = ITEM_ID.exec(itemId)
  return match ? { certId: match[1], taskCode: match[2] } : null
}
```

- [ ] **Step 4: Run it and watch it pass**

Run (PowerShell): `npm test -- src/content/ids.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/content/ids.js src/content/ids.test.js
git commit -m "feat: parse cert and task from item ids" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Test factories and the mastery engine

**Files:**

- Create: `src/test/factories.js`, `src/engine/mastery.js`
- Test: `src/engine/mastery.test.js`

- [ ] **Step 1: Create the shared test factories `src/test/factories.js`**

```js
/** @typedef {import('../db/types.js').Attempt} Attempt */
/** @typedef {import('../db/types.js').AttemptResult} AttemptResult */
/** @typedef {import('../db/types.js').ItemResponse} ItemResponse */

/**
 * A complete attempt row (a submitted CLF-C02 Pre-Test for task 1.1 unless overridden).
 * @param {Partial<Attempt>} [overrides]
 * @returns {Attempt}
 */
export function makeAttempt(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    certId: 'clf-c02',
    kind: 'pre',
    scopeId: 'clf-c02/1.1',
    mode: 'study',
    status: 'submitted',
    startedAt: 1_000,
    deadlineAt: null,
    submittedAt: 2_000,
    itemIds: [],
    optionOrder: {},
    responses: {},
    currentIndex: 0,
    result: null,
    ...overrides,
  }
}

/**
 * A graded answer.
 * @param {boolean} correct
 * @param {number | null} answeredAt epoch ms
 * @returns {ItemResponse}
 */
export function graded(correct, answeredAt) {
  return { selected: ['a'], submitted: true, correct, markedForReview: false, answeredAt }
}

/**
 * @param {number} pct
 * @returns {AttemptResult}
 */
export function makeResult(pct) {
  return {
    correct: pct / 10,
    total: 10,
    pct,
    scaledEstimate: 100 + pct * 9,
    passed: pct >= 70,
    byDomain: {},
    bySubdomain: {},
  }
}
```

- [ ] **Step 2: Write the failing tests `src/engine/mastery.test.js`**

```js
import { describe, expect, it } from 'vitest'
import { getCert } from '../content/certs.js'
import { graded, makeAttempt } from '../test/factories.js'
import {
  collectAnswers,
  LOW_CONFIDENCE_BELOW,
  MASTERY_WINDOW,
  masteryBand,
  masteryBySubdomain,
  NO_MASTERY,
  poolMastery,
  recommendNext,
} from './mastery.js'

/**
 * @param {string} subdomainId
 * @param {boolean[]} results oldest first
 */
function answers(subdomainId, results) {
  return results.map((correct, i) => ({
    itemId: `${subdomainId}#${i}`,
    subdomainId,
    correct,
    answeredAt: 1_000 + i,
  }))
}

const STRONG = { answered: 20, correct: 20, pct: 100, band: 'strong', lowConfidence: false }

describe('collectAnswers', () => {
  it('flattens graded responses and tags each with its sub-domain', () => {
    const attempt = makeAttempt({
      responses: {
        'clf-c02-1.1-0001': graded(true, 10),
        'clf-c02-2.3-0004': graded(false, 20),
        'clf-c02-1.1-0002': {
          selected: ['a'],
          submitted: false,
          correct: null,
          markedForReview: true,
          answeredAt: 30,
        },
      },
    })
    expect(collectAnswers([attempt])).toEqual([
      { itemId: 'clf-c02-1.1-0001', subdomainId: 'clf-c02/1.1', correct: true, answeredAt: 10 },
      { itemId: 'clf-c02-2.3-0004', subdomainId: 'clf-c02/2.3', correct: false, answeredAt: 20 },
    ])
  })

  it('skips answers without a timestamp and unrecognised item ids', () => {
    const attempt = makeAttempt({
      responses: { 'clf-c02-1.1-0001': graded(true, null), 'not-an-id': graded(true, 5) },
    })
    expect(collectAnswers([attempt])).toEqual([])
  })
})

describe('masteryBand', () => {
  it.each([
    [null, 'not-started'],
    [0, 'weak'],
    [49, 'weak'],
    [50, 'developing'],
    [74, 'developing'],
    [75, 'strong'],
    [100, 'strong'],
  ])('%s%% is %s', (pct, band) => {
    expect(masteryBand(pct)).toBe(band)
  })
})

describe('masteryBySubdomain', () => {
  it('scores only the most recent answers', () => {
    const results = [...Array(5).fill(false), ...Array(MASTERY_WINDOW).fill(true)]
    expect(masteryBySubdomain(answers('clf-c02/1.1', results)).get('clf-c02/1.1')).toEqual(STRONG)
  })

  it('uses answer time, not input order, to find the most recent answers', () => {
    const results = [...Array(5).fill(false), ...Array(MASTERY_WINDOW).fill(true)]
    const shuffled = answers('clf-c02/1.1', results).reverse()
    expect(masteryBySubdomain(shuffled).get('clf-c02/1.1')?.pct).toBe(100)
  })

  it('flags fewer than five answers as low confidence', () => {
    const few = answers('clf-c02/1.1', [true, false, true, false])
    expect(few).toHaveLength(LOW_CONFIDENCE_BELOW - 1)
    expect(masteryBySubdomain(few).get('clf-c02/1.1')).toEqual({
      answered: 4,
      correct: 2,
      pct: 50,
      band: 'developing',
      lowConfidence: true,
    })
    const enough = answers('clf-c02/1.1', [true, false, true, false, true])
    expect(masteryBySubdomain(enough).get('clf-c02/1.1')?.lowConfidence).toBe(false)
  })

  it('keeps sub-domains apart and leaves out untouched ones', () => {
    const result = masteryBySubdomain([
      ...answers('clf-c02/1.1', [true]),
      ...answers('clf-c02/2.1', [false]),
    ])
    expect([...result.keys()].sort()).toEqual(['clf-c02/1.1', 'clf-c02/2.1'])
    expect(result.get('clf-c02/2.1')?.band).toBe('weak')
  })
})

describe('poolMastery', () => {
  it('pools answers across sub-domains', () => {
    const half = { answered: 4, correct: 2, pct: 50, band: 'developing', lowConfidence: true }
    expect(poolMastery([STRONG, half, NO_MASTERY])).toEqual({ pct: 92, practiced: 2 })
  })

  it('is null when nothing has been answered', () => {
    expect(poolMastery([NO_MASTERY, NO_MASTERY])).toEqual({ pct: null, practiced: 0 })
  })
})

describe('recommendNext', () => {
  const cert = getCert('clf-c02')

  it('ranks untouched tasks by domain weight, keeping blueprint order on ties', () => {
    expect(recommendNext(cert, new Map()).map((r) => r.subdomain.code)).toEqual([
      '3.1',
      '3.2',
      '3.3',
    ])
  })

  it('weighs low mastery against the domain weight', () => {
    const mastery = new Map(cert.domains[2].subdomains.map((sub) => [sub.id, STRONG]))
    mastery.set('clf-c02/3.5', {
      answered: 10,
      correct: 2,
      pct: 20,
      band: 'weak',
      lowConfidence: false,
    })
    // 3.5: 0.8 × 0.34 = 0.272 sits between domain 2 (0.30) and domain 1 (0.24).
    expect(recommendNext(cert, mastery, 6).map((r) => r.subdomain.code)).toEqual([
      '2.1',
      '2.2',
      '2.3',
      '2.4',
      '3.5',
      '1.1',
    ])
  })
})
```

- [ ] **Step 3: Run them and watch them fail**

Run (PowerShell): `npm test -- src/engine/mastery.test.js`
Expected: FAIL, cannot resolve `./mastery.js`.

- [ ] **Step 4: Implement `src/engine/mastery.js`**

```js
import { parseItemId, subdomainId } from '../content/ids.js'

/** @typedef {import('../db/types.js').Attempt} Attempt */
/** @typedef {import('../content/certs.js').CertSummary} CertSummary */
/** @typedef {import('../content/certs.js').DomainSummary} DomainSummary */
/** @typedef {import('../content/certs.js').SubdomainSummary} SubdomainSummary */

/** Mastery looks at this many of the most recent answers in a sub-domain. */
export const MASTERY_WINDOW = 20

/** Fewer answers than this are flagged as low confidence. */
export const LOW_CONFIDENCE_BELOW = 5

/** @typedef {'not-started' | 'weak' | 'developing' | 'strong'} MasteryBand */

/**
 * One graded answer, flattened out of an attempt.
 * @typedef {object} Answer
 * @property {string} itemId
 * @property {string} subdomainId
 * @property {boolean} correct
 * @property {number} answeredAt epoch ms
 */

/**
 * @typedef {object} Mastery
 * @property {number} answered answers counted, at most MASTERY_WINDOW
 * @property {number} correct
 * @property {number | null} pct whole percent; null when nothing has been answered
 * @property {MasteryBand} band
 * @property {boolean} lowConfidence true for 1 to LOW_CONFIDENCE_BELOW - 1 answers
 */

/**
 * @typedef {object} Recommendation
 * @property {SubdomainSummary} subdomain
 * @property {DomainSummary} domain
 * @property {Mastery} mastery
 * @property {number} priority (1 − mastery) × domain weight
 */

/** @type {Mastery} */
export const NO_MASTERY = {
  answered: 0,
  correct: 0,
  pct: null,
  band: 'not-started',
  lowConfidence: false,
}

/**
 * Every graded answer across attempts. Responses that are not graded yet (exam mode before
 * submit) have `correct: null` and are skipped.
 * @param {Attempt[]} attempts
 * @returns {Answer[]}
 */
export function collectAnswers(attempts) {
  return attempts.flatMap((attempt) =>
    Object.entries(attempt.responses).flatMap(([itemId, response]) => {
      const parsed = parseItemId(itemId)
      if (!parsed || typeof response.correct !== 'boolean' || response.answeredAt === null) {
        return []
      }
      return [
        {
          itemId,
          subdomainId: subdomainId(parsed.certId, parsed.taskCode),
          correct: response.correct,
          answeredAt: response.answeredAt,
        },
      ]
    }),
  )
}

/**
 * @param {number | null} pct whole percent
 * @returns {MasteryBand}
 */
export function masteryBand(pct) {
  if (pct === null) return 'not-started'
  if (pct < 50) return 'weak'
  if (pct < 75) return 'developing'
  return 'strong'
}

/**
 * Accuracy over the most recent MASTERY_WINDOW answers in each sub-domain.
 * @param {Answer[]} answers
 * @returns {Map<string, Mastery>} keyed by sub-domain id; untouched sub-domains are absent
 */
export function masteryBySubdomain(answers) {
  /** @type {Map<string, Answer[]>} */
  const groups = new Map()
  for (const answer of answers) {
    const group = groups.get(answer.subdomainId)
    if (group) group.push(answer)
    else groups.set(answer.subdomainId, [answer])
  }

  /** @type {Map<string, Mastery>} */
  const result = new Map()
  for (const [id, group] of groups) {
    const recent = [...group]
      .sort((a, b) => b.answeredAt - a.answeredAt)
      .slice(0, MASTERY_WINDOW)
    const correct = recent.filter((answer) => answer.correct).length
    // Band from the rounded percent, so the label always matches the number shown.
    const pct = Math.round((correct / recent.length) * 100)
    result.set(id, {
      answered: recent.length,
      correct,
      pct,
      band: masteryBand(pct),
      lowConfidence: recent.length < LOW_CONFIDENCE_BELOW,
    })
  }
  return result
}

/**
 * Accuracy pooled across several sub-domains' mastery windows (a domain or a whole cert).
 * @param {Mastery[]} masteries
 * @returns {{ pct: number | null, practiced: number }} practiced = sub-domains with any answers
 */
export function poolMastery(masteries) {
  let answered = 0
  let correct = 0
  let practiced = 0
  for (const mastery of masteries) {
    answered += mastery.answered
    correct += mastery.correct
    if (mastery.answered > 0) practiced += 1
  }
  return { pct: answered > 0 ? Math.round((correct / answered) * 100) : null, practiced }
}

/**
 * Sub-domains to study next, highest priority first: (1 − mastery) × domain weight.
 * Untouched sub-domains count as 0% mastery. The sort is stable, so ties keep blueprint order.
 * @param {CertSummary} cert
 * @param {Map<string, Mastery>} mastery
 * @param {number} [limit]
 * @returns {Recommendation[]}
 */
export function recommendNext(cert, mastery, limit = 3) {
  return cert.domains
    .flatMap((domain) =>
      domain.subdomains.map((subdomain) => {
        const current = mastery.get(subdomain.id) ?? NO_MASTERY
        return {
          subdomain,
          domain,
          mastery: current,
          priority: (1 - (current.pct ?? 0) / 100) * domain.weight,
        }
      }),
    )
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit)
}
```

- [ ] **Step 5: Run the tests and watch them pass**

Run (PowerShell): `npm test -- src/engine/mastery.test.js`
Expected: PASS. `poolMastery` gives 22/24 = 91.67, which rounds to 92.

- [ ] **Step 6: Commit**

```bash
git add src/test/factories.js src/engine/mastery.js src/engine/mastery.test.js
git commit -m "feat: derive sub-domain mastery and study recommendations" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Sub-domain step status

**Files:**

- Create: `src/engine/subdomainStatus.js`
- Test: `src/engine/subdomainStatus.test.js`

- [ ] **Step 1: Write the failing tests**

```js
import { describe, expect, it } from 'vitest'
import { makeAttempt, makeResult } from '../test/factories.js'
import { deriveSubdomainStatus } from './subdomainStatus.js'

const SUB = 'clf-c02/1.1'
const reviewed = { subdomainId: SUB, certId: 'clf-c02', reviewCompletedAt: 5_000 }

describe('deriveSubdomainStatus', () => {
  it('starts at the Pre-Test', () => {
    expect(deriveSubdomainStatus(SUB, [], undefined)).toEqual({
      pre: { done: false, bestPct: null },
      review: { done: false, completedAt: null },
      post: { done: false, bestPct: null },
      next: 'pre',
    })
  })

  it('keeps the best submitted score and then recommends the review', () => {
    const attempts = [
      makeAttempt({ kind: 'pre', result: makeResult(40) }),
      makeAttempt({ kind: 'pre', result: makeResult(70) }),
      makeAttempt({ kind: 'post', status: 'in_progress', submittedAt: null }),
    ]
    const status = deriveSubdomainStatus(SUB, attempts, undefined)
    expect(status.pre).toEqual({ done: true, bestPct: 70 })
    expect(status.post).toEqual({ done: false, bestPct: null })
    expect(status.next).toBe('review')
  })

  it('ignores other sub-domains and other test kinds', () => {
    const attempts = [
      makeAttempt({ kind: 'pre', scopeId: 'clf-c02/1.2', result: makeResult(90) }),
      makeAttempt({ kind: 'domain', scopeId: 'clf-c02/d1', result: makeResult(90) }),
    ]
    expect(deriveSubdomainStatus(SUB, attempts, undefined).pre.done).toBe(false)
  })

  it('recommends the Post-Test once the lesson is reviewed, even without a Pre-Test', () => {
    const status = deriveSubdomainStatus(SUB, [], reviewed)
    expect(status.review).toEqual({ done: true, completedAt: 5_000 })
    expect(status.next).toBe('post')
  })

  it('recommends nothing once the Post-Test is done', () => {
    const attempts = [makeAttempt({ kind: 'post', result: makeResult(80) })]
    const status = deriveSubdomainStatus(SUB, attempts, undefined)
    expect(status.post).toEqual({ done: true, bestPct: 80 })
    expect(status.next).toBeNull()
  })
})
```

- [ ] **Step 2: Run them and watch them fail**

Run (PowerShell): `npm test -- src/engine/subdomainStatus.test.js`
Expected: FAIL, cannot resolve `./subdomainStatus.js`.

- [ ] **Step 3: Implement `src/engine/subdomainStatus.js`**

```js
/** @typedef {import('../db/types.js').Attempt} Attempt */
/** @typedef {import('../db/types.js').SubdomainProgress} SubdomainProgress */

/** @typedef {'pre' | 'review' | 'post'} StepKey */

/**
 * @typedef {object} TestStepStatus
 * @property {boolean} done at least one submitted attempt
 * @property {number | null} bestPct best score across submitted attempts
 */

/**
 * @typedef {object} SubdomainStatus
 * @property {TestStepStatus} pre
 * @property {{ done: boolean, completedAt: number | null }} review
 * @property {TestStepStatus} post
 * @property {StepKey | null} next the step to highlight; null once the Post-Test is done
 */

/**
 * @param {Attempt[]} attempts
 * @param {'pre' | 'post'} kind
 * @param {string} subdomainId
 * @returns {TestStepStatus}
 */
function testStep(attempts, kind, subdomainId) {
  const scores = attempts.flatMap((attempt) =>
    attempt.kind === kind &&
    attempt.scopeId === subdomainId &&
    attempt.status === 'submitted' &&
    attempt.result
      ? [attempt.result.pct]
      : [],
  )
  return { done: scores.length > 0, bestPct: scores.length > 0 ? Math.max(...scores) : null }
}

/**
 * Where the learner is in a sub-domain's Pre-Test → Review → Post-Test path. Test steps are
 * derived from attempts; only Review completion is stored (db/progress.js).
 * @param {string} subdomainId e.g. "clf-c02/1.1"
 * @param {Attempt[]} attempts any attempts; filtered here
 * @param {SubdomainProgress | undefined} progress
 * @returns {SubdomainStatus}
 */
export function deriveSubdomainStatus(subdomainId, attempts, progress) {
  const pre = testStep(attempts, 'pre', subdomainId)
  const post = testStep(attempts, 'post', subdomainId)
  const completedAt = progress?.reviewCompletedAt ?? null
  const review = { done: completedAt !== null, completedAt }
  // Recommend the step after the furthest one completed, so finishing a later step never
  // sends the learner back to an earlier one.
  const next = post.done ? null : review.done ? 'post' : pre.done ? 'review' : 'pre'
  return { pre, review, post, next }
}
```

- [ ] **Step 4: Run them and watch them pass**

Run (PowerShell): `npm test -- src/engine/subdomainStatus.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/subdomainStatus.js src/engine/subdomainStatus.test.js
git commit -m "feat: derive Pre-Test, Review and Post-Test status per task" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Test configuration rules

**Files:**

- Create: `src/engine/testConfig.js`
- Test: `src/engine/testConfig.test.js`

- [ ] **Step 1: Write the failing tests**

```js
import { describe, expect, it } from 'vitest'
import { getCert, getDomain, getSubdomain } from '../content/certs.js'
import { defaultLength, isExamKind, lengthChoices, resolveTestScope } from './testConfig.js'

const clf = getCert('clf-c02')

describe('resolveTestScope', () => {
  it('scopes Pre- and Post-Tests to a task', () => {
    expect(resolveTestScope(clf, 'pre', '1.1')).toEqual({
      scopeId: 'clf-c02/1.1',
      label: 'Task 1.1: Define the benefits of the AWS Cloud.',
      poolSize: getSubdomain('clf-c02', '1.1')?.itemCount,
    })
  })

  it('scopes a Domain Assessment to a domain', () => {
    expect(resolveTestScope(clf, 'domain', '3')).toEqual({
      scopeId: 'clf-c02/d3',
      label: 'Domain 3: Cloud Technology and Services',
      poolSize: getDomain('clf-c02', 3)?.itemCount,
    })
  })

  it('scopes cert-wide tests to the whole cert', () => {
    expect(resolveTestScope(clf, 'diagnostic', null)).toEqual({
      scopeId: 'clf-c02',
      label: 'CLF-C02: AWS Certified Cloud Practitioner',
      poolSize: clf?.itemCount,
    })
  })

  it.each([
    ['pre', null],
    ['post', '9.9'],
    ['domain', '1.1'],
    ['domain', null],
    ['diagnostic', '1.1'],
    ['drill', '2'],
  ])('rejects %s with scope %s', (kind, scope) => {
    expect(resolveTestScope(clf, kind, scope)).toBeNull()
  })
})

describe('lengthChoices', () => {
  it('turns off lengths the pool cannot fill', () => {
    expect(lengthChoices('post', 18)).toEqual([
      { value: 10, available: true },
      { value: 15, available: true },
      { value: 20, available: false },
      { value: 25, available: false },
    ])
  })
})

describe('defaultLength', () => {
  it('uses the spec default when the pool allows it', () => {
    expect(defaultLength('pre', 20)).toBe(10)
    expect(defaultLength('post', 40)).toBe(15)
    expect(defaultLength('domain', 80)).toBe(30)
    expect(defaultLength('drill', 300)).toBe(20)
  })

  it('falls back to the longest choice that fits', () => {
    expect(defaultLength('post', 12)).toBe(10)
  })

  it('is null when no choice fits', () => {
    expect(defaultLength('pre', 3)).toBeNull()
  })
})

describe('isExamKind', () => {
  it('is true only for the Diagnostic and Full exams', () => {
    expect(['pre', 'post', 'domain', 'drill', 'diagnostic', 'full'].filter(isExamKind)).toEqual([
      'diagnostic',
      'full',
    ])
  })
})
```

- [ ] **Step 2: Run them and watch them fail**

Run (PowerShell): `npm test -- src/engine/testConfig.test.js`
Expected: FAIL, cannot resolve `./testConfig.js`.

- [ ] **Step 3: Implement `src/engine/testConfig.js`**

```js
import { getDomain, getSubdomain } from '../content/certs.js'

/** @typedef {import('../db/types.js').AttemptKind} AttemptKind */
/** @typedef {import('../content/certs.js').CertSummary} CertSummary */
/** @typedef {'pre' | 'post' | 'domain' | 'drill'} SizedKind */

/**
 * Length choices for each test kind. The Diagnostic and Full exams always use the real exam
 * length.
 * @type {Record<SizedKind, number[]>}
 */
export const LENGTH_CHOICES = {
  pre: [5, 10, 15, 20],
  post: [10, 15, 20, 25],
  domain: [20, 30, 40, 50],
  drill: [10, 20, 30],
}

/** @type {Record<SizedKind, number>} */
export const DEFAULT_LENGTH = { pre: 10, post: 15, domain: 30, drill: 20 }

/**
 * @typedef {object} TestScope
 * @property {string} scopeId stored on the attempt: a sub-domain, domain or cert id
 * @property {string} label
 * @property {number} poolSize active questions available
 */

/**
 * @param {AttemptKind} kind
 * @returns {kind is 'diagnostic' | 'full'}
 */
export function isExamKind(kind) {
  return kind === 'diagnostic' || kind === 'full'
}

/**
 * Resolves the `scope` query parameter for a test kind. Returns null when it doesn't fit.
 * @param {CertSummary} cert
 * @param {AttemptKind} kind
 * @param {string | null} scope task code (pre/post), domain number (domain), or absent
 * @returns {TestScope | null}
 */
export function resolveTestScope(cert, kind, scope) {
  if (kind === 'pre' || kind === 'post') {
    const sub = scope ? getSubdomain(cert.id, scope) : null
    return sub && { scopeId: sub.id, label: `Task ${sub.code}: ${sub.title}`, poolSize: sub.itemCount }
  }
  if (kind === 'domain') {
    const domain = scope ? getDomain(cert.id, scope) : null
    return (
      domain && {
        scopeId: domain.id,
        label: `Domain ${domain.no}: ${domain.title}`,
        poolSize: domain.itemCount,
      }
    )
  }
  return scope === null
    ? { scopeId: cert.id, label: `${cert.code}: ${cert.title}`, poolSize: cert.itemCount }
    : null
}

/**
 * @param {SizedKind} kind
 * @param {number} poolSize
 * @returns {{ value: number, available: boolean }[]}
 */
export function lengthChoices(kind, poolSize) {
  return LENGTH_CHOICES[kind].map((value) => ({ value, available: value <= poolSize }))
}

/**
 * The spec default, or the longest choice that fits a smaller pool.
 * @param {SizedKind} kind
 * @param {number} poolSize
 * @returns {number | null} null when no choice fits
 */
export function defaultLength(kind, poolSize) {
  if (DEFAULT_LENGTH[kind] <= poolSize) return DEFAULT_LENGTH[kind]
  const fitting = LENGTH_CHOICES[kind].filter((value) => value <= poolSize)
  return fitting.length > 0 ? fitting[fitting.length - 1] : null
}
```

- [ ] **Step 4: Run them and watch them pass**

Run (PowerShell): `npm test -- src/engine/testConfig.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/testConfig.js src/engine/testConfig.test.js
git commit -m "feat: test scope validation and length choices" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Formatting and download helpers

**Files:**

- Create: `src/lib/format.js`, `src/lib/download.js`
- Test: `src/lib/format.test.js`, `src/lib/download.test.js`

- [ ] **Step 1: Write the failing tests**

`src/lib/format.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { describeMastery, formatDate, formatPct, formatWeight } from './format.js'

describe('format', () => {
  it('formats percentages, with a dash for no data', () => {
    expect(formatPct(85)).toBe('85%')
    expect(formatPct(null)).toBe('—')
  })

  it('formats domain weights as whole percentages', () => {
    expect(formatWeight(0.34)).toBe('34%')
    expect(formatWeight(0.3)).toBe('30%')
  })

  it('formats dates with the year', () => {
    expect(formatDate(new Date(2026, 9, 14).getTime())).toMatch(/2026/)
  })

  it('describes pooled mastery', () => {
    expect(describeMastery({ pct: null, practiced: 0 }, 19)).toBe('Not started yet')
    expect(describeMastery({ pct: 50, practiced: 1 }, 19)).toBe(
      'Mastery 50% · 1 of 19 tasks practiced',
    )
  })
})
```

`src/lib/download.test.js`:

```js
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadJson, fileDateStamp } from './download.js'

/** @type {Blob[]} */
let blobs = []

beforeEach(() => {
  blobs = []
  vi.useFakeTimers()
  // jsdom has no object URLs.
  URL.createObjectURL = vi.fn((blob) => {
    blobs.push(blob)
    return 'blob:test'
  })
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('downloadJson', () => {
  it('saves pretty-printed JSON under the given file name', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    downloadJson('report.json', { a: 1 })
    const link = click.mock.contexts[0]
    expect(link.download).toBe('report.json')
    expect(link.href).toBe('blob:test')
    expect(link.isConnected).toBe(false)
    expect(blobs[0].type).toBe('application/json')
    expect(await blobs[0].text()).toBe('{\n  "a": 1\n}')
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    vi.runAllTimers()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test')
  })
})

describe('fileDateStamp', () => {
  it('uses the local calendar date', () => {
    expect(fileDateStamp(new Date(2026, 9, 4, 12).getTime())).toBe('2026-10-04')
  })
})
```

- [ ] **Step 2: Run them and watch them fail**

Run (PowerShell): `npm test -- src/lib`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement `src/lib/format.js`**

```js
/**
 * @param {number | null} pct whole percent
 * @returns {string}
 */
export function formatPct(pct) {
  return pct === null ? '—' : `${pct}%`
}

/**
 * @param {number} weight share of the exam, 0–1
 * @returns {string}
 */
export function formatWeight(weight) {
  return `${Math.round(weight * 100)}%`
}

/**
 * @param {number} epochMs
 * @returns {string} e.g. "Oct 14, 2026" in the learner's locale
 */
export function formatDate(epochMs) {
  return new Date(epochMs).toLocaleDateString(undefined, { dateStyle: 'medium' })
}

/**
 * One-line summary of pooled mastery for a cert or domain card.
 * @param {{ pct: number | null, practiced: number }} pooled from poolMastery()
 * @param {number} taskCount
 * @returns {string}
 */
export function describeMastery(pooled, taskCount) {
  return pooled.pct === null
    ? 'Not started yet'
    : `Mastery ${pooled.pct}% · ${pooled.practiced} of ${taskCount} tasks practiced`
}
```

- [ ] **Step 4: Implement `src/lib/download.js`**

```js
/**
 * Saves `data` as a pretty-printed JSON file through the browser's download flow.
 * @param {string} filename
 * @param {unknown} data
 */
export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  // Revoke later: some browsers read the blob asynchronously after click().
  setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

/**
 * Local calendar date for file names, e.g. "2026-10-14".
 * @param {number} [now] epoch ms
 * @returns {string}
 */
export function fileDateStamp(now = Date.now()) {
  const date = new Date(now)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}
```

- [ ] **Step 5: Run them and watch them pass**

Run (PowerShell): `npm test -- src/lib`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib
git commit -m "feat: formatting and JSON download helpers" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: `useCertProgress` live hook

**Files:**

- Create: `src/hooks/useCertProgress.js`
- Test: `src/hooks/useCertProgress.test.js`

- [ ] **Step 1: Write the failing tests**

```js
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db.js'
import { markReviewComplete } from '../db/progress.js'
import { graded, makeAttempt } from '../test/factories.js'
import { resetDb } from '../test/resetDb.js'
import { useCertProgress } from './useCertProgress.js'

beforeEach(resetDb)

describe('useCertProgress', () => {
  it('is undefined while loading, then reports mastery and reviews', async () => {
    await db.attempts.add(
      makeAttempt({
        responses: { 'clf-c02-1.1-0001': graded(true, 10), 'clf-c02-1.1-0002': graded(false, 20) },
      }),
    )
    await markReviewComplete('clf-c02', 'clf-c02/1.1', 30)
    const { result } = renderHook(() => useCertProgress('clf-c02'))
    expect(result.current).toBeUndefined()
    await waitFor(() => expect(result.current).toBeDefined())
    expect(result.current?.mastery.get('clf-c02/1.1')).toMatchObject({
      answered: 2,
      pct: 50,
      band: 'developing',
    })
    expect(result.current?.reviews.get('clf-c02/1.1')?.reviewCompletedAt).toBe(30)
    expect(result.current?.answeredCount).toBe(2)
    expect(result.current?.attempts).toHaveLength(1)
  })

  it('updates when a new attempt is saved', async () => {
    const { result } = renderHook(() => useCertProgress('clf-c02'))
    await waitFor(() => expect(result.current?.answeredCount).toBe(0))
    await db.attempts.add(makeAttempt({ responses: { 'clf-c02-2.1-0001': graded(true, 10) } }))
    await waitFor(() => expect(result.current?.mastery.get('clf-c02/2.1')?.pct).toBe(100))
  })

  it('ignores other certifications', async () => {
    await db.attempts.add(
      makeAttempt({
        certId: 'aif-c01',
        scopeId: 'aif-c01/1.1',
        responses: { 'aif-c01-1.1-0001': graded(true, 10) },
      }),
    )
    const { result } = renderHook(() => useCertProgress('clf-c02'))
    await waitFor(() => expect(result.current).toBeDefined())
    expect(result.current?.answeredCount).toBe(0)
  })
})
```

- [ ] **Step 2: Run them and watch them fail**

Run (PowerShell): `npm test -- src/hooks/useCertProgress.test.js`
Expected: FAIL, cannot resolve `./useCertProgress.js`.

- [ ] **Step 3: Implement `src/hooks/useCertProgress.js`**

```js
import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { listAttempts } from '../db/attempts.js'
import { listProgressForCert } from '../db/progress.js'
import { collectAnswers, masteryBySubdomain } from '../engine/mastery.js'

/** @typedef {import('../db/types.js').Attempt} Attempt */
/** @typedef {import('../db/types.js').SubdomainProgress} SubdomainProgress */
/** @typedef {import('../engine/mastery.js').Mastery} Mastery */

/**
 * @typedef {object} CertProgress
 * @property {Attempt[]} attempts newest first
 * @property {Map<string, SubdomainProgress>} reviews keyed by sub-domain id
 * @property {Map<string, Mastery>} mastery keyed by sub-domain id
 * @property {number} answeredCount graded answers in the cert's whole history
 */

/**
 * Live view of one cert's progress. Re-renders whenever attempts or review marks change.
 * @param {string} certId
 * @returns {CertProgress | undefined} undefined while loading
 */
export function useCertProgress(certId) {
  const data = useLiveQuery(async () => {
    try {
      const [attempts, reviews] = await Promise.all([
        listAttempts(certId),
        listProgressForCert(certId),
      ])
      return { attempts, reviews }
    } catch (error) {
      // Storage blocked (StorageWarning already says so): show the page with no progress.
      console.error('Failed to read progress', error)
      return { attempts: [], reviews: [] }
    }
  }, [certId])

  return useMemo(() => {
    if (!data) return undefined
    const answers = collectAnswers(data.attempts)
    return {
      attempts: data.attempts,
      reviews: new Map(data.reviews.map((row) => [row.subdomainId, row])),
      mastery: masteryBySubdomain(answers),
      answeredCount: answers.length,
    }
  }, [data])
}
```

- [ ] **Step 4: Run them and watch them pass**

Run (PowerShell): `npm test -- src/hooks/useCertProgress.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCertProgress.js src/hooks/useCertProgress.test.js
git commit -m "feat: live per-cert progress hook" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: UI primitives (button styles, icons, loading)

**Files:**

- Create: `src/components/ui/styles.js`, `src/components/ui/icons.jsx`, `src/components/ui/Loading.jsx`
- Test: `src/components/ui/ui.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CheckCircleIcon } from './icons.jsx'
import Loading from './Loading.jsx'
import { buttonClass } from './styles.js'

describe('ui primitives', () => {
  it('announces loading politely', () => {
    render(<Loading label="Loading lesson…" />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading lesson…')
  })

  it('hides decorative icons from assistive technology', () => {
    const { container } = render(<CheckCircleIcon className="size-4" />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('gives each button variant a distinct style', () => {
    const variants = ['primary', 'secondary', 'danger'].map((variant) => buttonClass(variant))
    expect(new Set(variants).size).toBe(3)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run (PowerShell): `npm test -- src/components/ui`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement `src/components/ui/styles.js`**

```js
/** @typedef {'primary' | 'secondary' | 'danger'} ButtonVariant */

const BASE =
  'inline-flex items-center justify-center gap-2 rounded px-4 py-2 font-medium disabled:cursor-not-allowed disabled:opacity-50'

/** @type {Record<ButtonVariant, string>} */
const VARIANTS = {
  primary:
    'bg-slate-900 text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300',
  secondary:
    'border border-slate-300 hover:border-slate-500 dark:border-slate-700 dark:hover:border-slate-500',
  danger:
    'border border-red-300 text-red-700 hover:border-red-500 dark:border-red-800 dark:text-red-400 dark:hover:border-red-600',
}

/**
 * Classes for a <button> or a button-styled <Link>.
 * @param {ButtonVariant} [variant]
 */
export function buttonClass(variant = 'secondary') {
  return `${BASE} ${VARIANTS[variant]}`
}
```

- [ ] **Step 4: Implement `src/components/ui/icons.jsx`**

```jsx
/** @typedef {{ className?: string }} IconProps */

/** @param {IconProps & { children: import('react').ReactNode }} props */
function Icon({ className, children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {children}
    </svg>
  )
}

/** @param {IconProps} props */
export function CircleIcon({ className }) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="9" />
    </Icon>
  )
}

/** @param {IconProps} props */
export function CheckCircleIcon({ className }) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.5 2.5L16 9.5" />
    </Icon>
  )
}

/** @param {IconProps} props */
export function AlertCircleIcon({ className }) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5" />
      <path d="M12 16.5h.01" />
    </Icon>
  )
}

/** @param {IconProps} props */
export function HalfCircleIcon({ className }) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" />
    </Icon>
  )
}
```

- [ ] **Step 5: Implement `src/components/ui/Loading.jsx`**

```jsx
/** @param {{ label?: string }} props */
export default function Loading({ label = 'Loading…' }) {
  return (
    <p role="status" className="mt-6 text-slate-600 dark:text-slate-300">
      {label}
    </p>
  )
}
```

- [ ] **Step 6: Run the test and watch it pass**

Run (PowerShell): `npm test -- src/components/ui`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add src/components/ui
git commit -m "feat: shared button styles, icons and loading status" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Mastery badge and heatmap

**Files:**

- Create: `src/components/curriculum/masteryBands.js`, `src/components/curriculum/MasteryBadge.jsx`, `src/components/curriculum/MasteryHeatmap.jsx`
- Test: `src/components/curriculum/MasteryHeatmap.test.jsx`

- [ ] **Step 1: Write the failing tests**

```jsx
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { getCert } from '../../content/certs.js'
import MasteryBadge from './MasteryBadge.jsx'
import MasteryHeatmap from './MasteryHeatmap.jsx'

const cert = getCert('clf-c02')
const mastery = new Map([
  ['clf-c02/1.1', { answered: 20, correct: 16, pct: 80, band: 'strong', lowConfidence: false }],
  ['clf-c02/2.1', { answered: 3, correct: 1, pct: 33, band: 'weak', lowConfidence: true }],
])

function renderHeatmap() {
  render(
    <MemoryRouter>
      <MasteryHeatmap cert={cert} mastery={mastery} />
    </MemoryRouter>,
  )
}

describe('MasteryBadge', () => {
  it('pairs the band label with the percentage', () => {
    render(<MasteryBadge mastery={mastery.get('clf-c02/1.1')} />)
    expect(screen.getByText('Strong')).toBeInTheDocument()
    expect(screen.getByText('80%')).toBeInTheDocument()
  })

  it('shows no percentage before any answers', () => {
    render(
      <MasteryBadge
        mastery={{ answered: 0, correct: 0, pct: null, band: 'not-started', lowConfidence: false }}
      />,
    )
    expect(screen.getByText('Not started')).toBeInTheDocument()
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
  })
})

describe('MasteryHeatmap', () => {
  it('renders one labelled cell per task', () => {
    renderHeatmap()
    const cells = screen.getAllByRole('link')
    expect(cells).toHaveLength(19)
    const strong = screen.getByRole('link', { name: /^1\.1: Define the benefits/ })
    expect(strong).toHaveAttribute('href', '/clf-c02/s/1.1')
    expect(strong).toHaveTextContent('Strong')
    expect(strong).toHaveTextContent('80%')
    expect(cells.filter((cell) => cell.textContent?.includes('Not started'))).toHaveLength(17)
  })

  it('marks low-confidence cells in text, not only with the border', () => {
    renderHeatmap()
    const weak = screen.getByRole('link', { name: /^2\.1:/ })
    expect(weak).toHaveTextContent('Weak')
    expect(weak).toHaveTextContent('(few answers)')
  })

  it('groups cells under their domain', () => {
    renderHeatmap()
    const domain3 = screen.getByRole('list', { name: 'Domain 3: Cloud Technology and Services' })
    expect(within(domain3).getAllByRole('link')).toHaveLength(8)
  })

  it('explains every band in the legend', () => {
    renderHeatmap()
    const legend = screen.getByRole('list', { name: 'Legend' })
    expect(legend).toHaveTextContent('Weak (under 50%)')
    expect(legend).toHaveTextContent('Developing (50–74%)')
    expect(legend).toHaveTextContent('Strong (75% or more)')
    expect(legend).toHaveTextContent('Not started (no answers yet)')
  })
})
```

- [ ] **Step 2: Run them and watch them fail**

Run (PowerShell): `npm test -- src/components/curriculum/MasteryHeatmap.test.jsx`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement `src/components/curriculum/masteryBands.js`**

```js
/** @typedef {import('../../engine/mastery.js').MasteryBand} MasteryBand */

/**
 * Status colors per band. Bands are always shown with an icon and a text label as well, so
 * color is never the only signal. Text inside cells uses ink colors, never the band color.
 * @type {Record<MasteryBand, { label: string, cell: string, icon: string }>}
 */
export const BAND_STYLES = {
  'not-started': {
    label: 'Not started',
    cell: 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900',
    icon: 'text-slate-500 dark:text-slate-400',
  },
  weak: {
    label: 'Weak',
    cell: 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/50',
    icon: 'text-red-700 dark:text-red-400',
  },
  developing: {
    label: 'Developing',
    cell: 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50',
    icon: 'text-amber-700 dark:text-amber-300',
  },
  strong: {
    label: 'Strong',
    cell: 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/50',
    icon: 'text-emerald-700 dark:text-emerald-400',
  },
}
```

- [ ] **Step 4: Implement `src/components/curriculum/MasteryBadge.jsx`**

```jsx
import { AlertCircleIcon, CheckCircleIcon, CircleIcon, HalfCircleIcon } from '../ui/icons.jsx'
import { BAND_STYLES } from './masteryBands.js'

/** @typedef {import('../../engine/mastery.js').Mastery} Mastery */
/** @typedef {import('../../engine/mastery.js').MasteryBand} MasteryBand */

/**
 * A distinct shape per band, so bands can be told apart without color.
 * @param {{ band: MasteryBand, className?: string }} props
 */
export function BandIcon({ band, className }) {
  switch (band) {
    case 'strong':
      return <CheckCircleIcon className={className} />
    case 'developing':
      return <HalfCircleIcon className={className} />
    case 'weak':
      return <AlertCircleIcon className={className} />
    default:
      return <CircleIcon className={className} />
  }
}

/**
 * Band icon + label + percentage (+ a low-confidence note).
 * @param {{ mastery: Mastery }} props
 */
export default function MasteryBadge({ mastery }) {
  const style = BAND_STYLES[mastery.band]
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 text-sm">
      <BandIcon band={mastery.band} className={`size-4 shrink-0 ${style.icon}`} />
      <span>{style.label}</span>
      {mastery.pct !== null && <span className="tabular-nums">{mastery.pct}%</span>}
      {mastery.lowConfidence && (
        <span className="text-slate-600 dark:text-slate-300">(few answers)</span>
      )}
    </span>
  )
}
```

- [ ] **Step 5: Implement `src/components/curriculum/MasteryHeatmap.jsx`**

```jsx
import { Link } from 'react-router-dom'
import { LOW_CONFIDENCE_BELOW, MASTERY_WINDOW, NO_MASTERY } from '../../engine/mastery.js'
import MasteryBadge, { BandIcon } from './MasteryBadge.jsx'
import { BAND_STYLES } from './masteryBands.js'

/** @typedef {import('../../content/certs.js').CertSummary} CertSummary */
/** @typedef {import('../../engine/mastery.js').Mastery} Mastery */
/** @typedef {import('../../engine/mastery.js').MasteryBand} MasteryBand */

/** @type {{ band: MasteryBand, range: string }[]} */
const LEGEND = [
  { band: 'not-started', range: 'no answers yet' },
  { band: 'weak', range: 'under 50%' },
  { band: 'developing', range: '50–74%' },
  { band: 'strong', range: '75% or more' },
]

/**
 * Domains × tasks grid. Each cell links to its task and shows the band as tint, icon and text.
 * @param {{ cert: CertSummary, mastery: Map<string, Mastery> }} props
 */
export default function MasteryHeatmap({ cert, mastery }) {
  return (
    <section aria-labelledby="mastery-heading">
      <h2 id="mastery-heading" className="text-xl font-semibold">
        Mastery by task
      </h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Accuracy over your last {MASTERY_WINDOW} answers in each task. A dashed border means fewer
        than {LOW_CONFIDENCE_BELOW} answers so far.
      </p>
      <ul aria-label="Legend" className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {LEGEND.map(({ band, range }) => (
          <li key={band} className="inline-flex items-center gap-1.5">
            <BandIcon band={band} className={`size-4 ${BAND_STYLES[band].icon}`} />
            {BAND_STYLES[band].label} ({range})
          </li>
        ))}
      </ul>
      <div className="mt-4 space-y-4">
        {cert.domains.map((domain) => {
          const headingId = `heatmap-domain-${domain.no}`
          return (
            <div key={domain.id}>
              <h3 id={headingId} className="text-sm font-semibold">
                Domain {domain.no}: {domain.title}
              </h3>
              <ul aria-labelledby={headingId} className="mt-1 grid grid-cols-2 gap-0.5 sm:grid-cols-4">
                {domain.subdomains.map((sub) => {
                  const current = mastery.get(sub.id) ?? NO_MASTERY
                  return (
                    <li key={sub.id}>
                      <Link
                        to={`/${cert.id}/s/${sub.code}`}
                        title={sub.title}
                        className={`flex h-full flex-col gap-1 rounded-sm border-2 p-2 hover:ring-2 hover:ring-slate-400 ${BAND_STYLES[current.band].cell} ${current.lowConfidence ? 'border-dashed' : ''}`}
                      >
                        <span className="font-semibold tabular-nums">
                          {sub.code}
                          <span className="sr-only">: {sub.title}</span>
                        </span>
                        <MasteryBadge mastery={current} />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}
```

- [ ] **Step 6: Run the tests and watch them pass**

Run (PowerShell): `npm test -- src/components/curriculum/MasteryHeatmap.test.jsx`
Expected: PASS (6 tests).

- [ ] **Step 7: Commit**

```bash
git add src/components/curriculum
git commit -m "feat: mastery badge and domain-by-task heatmap" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Sub-domain stepper and step chips

**Files:**

- Create: `src/components/curriculum/SubdomainStepper.jsx`, `src/components/curriculum/StepChips.jsx`
- Test: `src/components/curriculum/SubdomainStepper.test.jsx`

- [ ] **Step 1: Write the failing tests**

```jsx
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { deriveSubdomainStatus } from '../../engine/subdomainStatus.js'
import { makeAttempt, makeResult } from '../../test/factories.js'
import StepChips from './StepChips.jsx'
import SubdomainStepper from './SubdomainStepper.jsx'

const SUB = 'clf-c02/1.1'

/** @param {import('../../engine/subdomainStatus.js').SubdomainStatus} status */
function renderStepper(status) {
  render(
    <MemoryRouter>
      <SubdomainStepper certId="clf-c02" taskCode="1.1" status={status} />
    </MemoryRouter>,
  )
  /** @param {string} label */
  const step = (label) => screen.getByRole('link', { name: label }).closest('li')
  return { step }
}

describe('SubdomainStepper', () => {
  it('links the three steps in order', () => {
    renderStepper(deriveSubdomainStatus(SUB, [], undefined))
    const links = within(screen.getByRole('list', { name: 'Learning path' }))
      .getAllByRole('link')
      .map((link) => [link.textContent, link.getAttribute('href')])
    expect(links).toEqual([
      ['Pre-Test', '/clf-c02/test/new?kind=pre&scope=1.1'],
      ['Review', '/clf-c02/s/1.1/review'],
      ['Post-Test', '/clf-c02/test/new?kind=post&scope=1.1'],
    ])
  })

  it('recommends the Pre-Test to a newcomer', () => {
    const { step } = renderStepper(deriveSubdomainStatus(SUB, [], undefined))
    expect(step('Pre-Test')).toHaveTextContent('Recommended next')
    expect(step('Pre-Test')).toHaveTextContent('Not taken yet')
    expect(step('Review')).toHaveTextContent('Not reviewed yet')
    expect(step('Review')).not.toHaveTextContent('Recommended next')
  })

  it('shows scores and moves the recommendation forward', () => {
    const status = deriveSubdomainStatus(
      SUB,
      [makeAttempt({ kind: 'pre', result: makeResult(60) })],
      { subdomainId: SUB, certId: 'clf-c02', reviewCompletedAt: new Date(2026, 9, 14).getTime() },
    )
    const { step } = renderStepper(status)
    expect(step('Pre-Test')).toHaveTextContent('Done · best score 60%')
    expect(step('Review')).toHaveTextContent(/Reviewed .*2026/)
    expect(step('Post-Test')).toHaveTextContent('Recommended next')
  })

  it('recommends nothing once the Post-Test is done', () => {
    renderStepper(
      deriveSubdomainStatus(SUB, [makeAttempt({ kind: 'post', result: makeResult(90) })], undefined),
    )
    expect(screen.queryByText('Recommended next')).not.toBeInTheDocument()
  })
})

describe('StepChips', () => {
  it('states each step as text', () => {
    render(
      <StepChips
        status={deriveSubdomainStatus(
          SUB,
          [makeAttempt({ kind: 'pre', result: makeResult(60) })],
          undefined,
        )}
      />,
    )
    const chips = within(screen.getByRole('list', { name: 'Steps' }))
      .getAllByRole('listitem')
      .map((chip) => chip.textContent)
    expect(chips).toEqual(['Pre-Test: done', 'Review: not done', 'Post-Test: not done'])
  })
})
```

- [ ] **Step 2: Run them and watch them fail**

Run (PowerShell): `npm test -- src/components/curriculum/SubdomainStepper.test.jsx`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement `src/components/curriculum/SubdomainStepper.jsx`**

```jsx
import { Link } from 'react-router-dom'
import { formatDate, formatPct } from '../../lib/format.js'
import { CheckCircleIcon } from '../ui/icons.jsx'
import { buttonClass } from '../ui/styles.js'

/** @typedef {import('../../engine/subdomainStatus.js').SubdomainStatus} SubdomainStatus */
/** @typedef {import('../../engine/subdomainStatus.js').StepKey} StepKey */

/** @type {{ key: StepKey, label: string, purpose: string }[]} */
const STEPS = [
  { key: 'pre', label: 'Pre-Test', purpose: 'Find out what you already know.' },
  { key: 'review', label: 'Review', purpose: 'Read the lesson for this task.' },
  { key: 'post', label: 'Post-Test', purpose: 'Check what you learned.' },
]

/**
 * @param {SubdomainStatus} status
 * @param {StepKey} key
 */
function summary(status, key) {
  if (key === 'review') {
    const { completedAt } = status.review
    return completedAt === null ? 'Not reviewed yet' : `Reviewed ${formatDate(completedAt)}`
  }
  const step = status[key]
  return step.done ? `Done · best score ${formatPct(step.bestPct)}` : 'Not taken yet'
}

/**
 * Pre-Test → Review → Post-Test. Nothing is locked. The recommended next step gets the
 * primary button and a visible "Recommended next" label.
 * @param {{ certId: string, taskCode: string, status: SubdomainStatus }} props
 */
export default function SubdomainStepper({ certId, taskCode, status }) {
  /** @type {Record<StepKey, string>} */
  const links = {
    pre: `/${certId}/test/new?kind=pre&scope=${taskCode}`,
    review: `/${certId}/s/${taskCode}/review`,
    post: `/${certId}/test/new?kind=post&scope=${taskCode}`,
  }
  return (
    <ol aria-label="Learning path" className="mt-6 space-y-4">
      {STEPS.map((step, index) => {
        const done = status[step.key].done
        const recommended = status.next === step.key
        return (
          <li
            key={step.key}
            className={`flex flex-wrap items-center gap-4 rounded-lg border p-4 ${recommended ? 'border-slate-900 dark:border-slate-100' : 'border-slate-200 dark:border-slate-800'}`}
          >
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-200 font-semibold dark:bg-slate-800"
            >
              {done ? (
                <CheckCircleIcon className="size-5 text-emerald-700 dark:text-emerald-400" />
              ) : (
                index + 1
              )}
            </span>
            <div className="min-w-48 flex-1">
              {recommended && (
                <p className="text-xs font-semibold tracking-wide text-amber-700 uppercase dark:text-amber-400">
                  Recommended next
                </p>
              )}
              <p className="text-slate-600 dark:text-slate-300">{step.purpose}</p>
              <p className="mt-1 text-sm">{summary(status, step.key)}</p>
            </div>
            <Link to={links[step.key]} className={buttonClass(recommended ? 'primary' : 'secondary')}>
              {step.label}
            </Link>
          </li>
        )
      })}
    </ol>
  )
}
```

- [ ] **Step 4: Implement `src/components/curriculum/StepChips.jsx`**

```jsx
import { CheckCircleIcon, CircleIcon } from '../ui/icons.jsx'

/** @typedef {import('../../engine/subdomainStatus.js').SubdomainStatus} SubdomainStatus */
/** @typedef {import('../../engine/subdomainStatus.js').StepKey} StepKey */

/** @type {{ key: StepKey, label: string }[]} */
const CHIPS = [
  { key: 'pre', label: 'Pre-Test' },
  { key: 'review', label: 'Review' },
  { key: 'post', label: 'Post-Test' },
]

/**
 * Compact step status for a task row: icon + label, with "done"/"not done" for screen readers.
 * @param {{ status: SubdomainStatus }} props
 */
export default function StepChips({ status }) {
  return (
    <ul aria-label="Steps" className="flex flex-wrap gap-1.5">
      {CHIPS.map(({ key, label }) => {
        const done = status[key].done
        return (
          <li
            key={key}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${done ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/50' : 'border-slate-300 dark:border-slate-700'}`}
          >
            {done ? (
              <CheckCircleIcon className="size-3.5 text-emerald-700 dark:text-emerald-400" />
            ) : (
              <CircleIcon className="size-3.5 text-slate-500 dark:text-slate-400" />
            )}
            {label}
            <span className="sr-only">{done ? ': done' : ': not done'}</span>
          </li>
        )
      })}
    </ul>
  )
}
```

- [ ] **Step 5: Run the tests and watch them pass**

Run (PowerShell): `npm test -- src/components/curriculum`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/curriculum
git commit -m "feat: sub-domain stepper and step chips" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Home page with cert cards

**Files:**

- Create: `src/components/curriculum/CertCard.jsx`
- Modify: `src/routes/HomePage.jsx` (full rewrite)
- Test: `src/routes/HomePage.test.jsx`

- [ ] **Step 1: Write the failing tests**

```jsx
import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { getCert } from '../content/certs.js'
import { db } from '../db/db.js'
import { graded, makeAttempt } from '../test/factories.js'
import { renderRoute } from '../test/renderRoute.jsx'
import { resetDb } from '../test/resetDb.js'

beforeEach(resetDb)

describe('HomePage', () => {
  it('shows each cert’s question count and overall mastery', async () => {
    await db.attempts.add(
      makeAttempt({
        responses: { 'clf-c02-1.1-0001': graded(true, 10), 'clf-c02-1.1-0002': graded(false, 20) },
      }),
    )
    renderRoute('/')
    const clf = await screen.findByRole('link', { name: /CLF-C02/ })
    expect(clf).toHaveTextContent(`${getCert('clf-c02')?.itemCount} questions · 19 tasks`)
    await waitFor(() => expect(clf).toHaveTextContent('Mastery 50% · 1 of 19 tasks practiced'))
    const aif = screen.getByRole('link', { name: /AIF-C01/ })
    await waitFor(() => expect(aif).toHaveTextContent('Not started yet'))
  })

  it('states the disclaimers up front', async () => {
    renderRoute('/')
    const about = await screen.findByRole('complementary', { name: 'About this app' })
    expect(within(about).getByText(/Not affiliated with AWS/)).toBeInTheDocument()
    expect(within(about).getByText(/AI-generated content/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run them and watch them fail**

Run (PowerShell): `npm test -- src/routes/HomePage.test.jsx`
Expected: FAIL, because the card has no counts and there is no `About this app` aside.

- [ ] **Step 3: Implement `src/components/curriculum/CertCard.jsx`**

```jsx
import { Link } from 'react-router-dom'
import { listSubdomains } from '../../content/certs.js'
import { poolMastery } from '../../engine/mastery.js'
import { useCertProgress } from '../../hooks/useCertProgress.js'
import { describeMastery } from '../../lib/format.js'

/** @param {{ cert: import('../../content/certs.js').CertSummary }} props */
export default function CertCard({ cert }) {
  const progress = useCertProgress(cert.id)
  const taskCount = listSubdomains(cert.id).length
  const summary = progress
    ? describeMastery(poolMastery([...progress.mastery.values()]), taskCount)
    : 'Loading progress…'
  return (
    <Link
      to={`/${cert.id}`}
      className="block h-full rounded-lg border border-slate-200 p-5 hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600"
    >
      <span className="block text-sm font-semibold tracking-wide text-amber-700 dark:text-amber-400">
        {cert.code}
      </span>
      <span className="mt-1 block text-lg font-medium">{cert.title}</span>
      <span className="mt-2 block text-sm text-slate-600 dark:text-slate-300">
        {cert.itemCount} questions · {taskCount} tasks
      </span>
      <span className="mt-1 block text-sm">{summary}</span>
    </Link>
  )
}
```

- [ ] **Step 4: Rewrite `src/routes/HomePage.jsx`**

```jsx
import CertCard from '../components/curriculum/CertCard.jsx'
import { CERTS } from '../content/certs.js'

export default function HomePage() {
  return (
    <>
      <h1 className="text-3xl font-bold">AWS Practitioner Exam Prep</h1>
      <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">
        Pick a certification. Start with a diagnostic exam to find your weak areas, work through
        each domain, then finish with a full practice exam.
      </p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {CERTS.map((cert) => (
          <li key={cert.id}>
            <CertCard cert={cert} />
          </li>
        ))}
      </ul>
      <aside
        aria-label="About this app"
        className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <p>
          <strong>Not affiliated with AWS.</strong> This is an independent study aid, not an
          official AWS product.
        </p>
        <p className="mt-2">
          <strong>AI-generated content.</strong> Questions and lessons were written with AI and may
          contain mistakes. Check the linked AWS documentation, and use “Report issue” on any
          question to flag a problem.
        </p>
      </aside>
    </>
  )
}
```

- [ ] **Step 5: Run the tests and watch them pass**

Run (PowerShell): `npm test -- src/routes/HomePage.test.jsx src/router.test.jsx`
Expected: PASS. The router's `home links to each certification dashboard` test still passes.

- [ ] **Step 6: Commit**

```bash
git add src/components/curriculum/CertCard.jsx src/routes/HomePage.jsx src/routes/HomePage.test.jsx
git commit -m "feat: home page cert cards with counts and mastery" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Cert dashboard

**Files:**

- Modify: `src/routes/CertDashboardPage.jsx` (full rewrite)
- Test: `src/routes/CertDashboardPage.test.jsx`

- [ ] **Step 1: Write the failing tests**

```jsx
import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db.js'
import { graded, makeAttempt } from '../test/factories.js'
import { renderRoute } from '../test/renderRoute.jsx'
import { resetDb } from '../test/resetDb.js'

beforeEach(resetDb)

describe('CertDashboardPage', () => {
  it('steers a new learner to the Diagnostic Exam and the heaviest domain', async () => {
    renderRoute('/clf-c02')
    expect(await screen.findByText(/Start with the Diagnostic Exam/)).toBeInTheDocument()
    const next = within(screen.getByRole('list', { name: 'Recommended next' }))
      .getAllByRole('link')
      .map((link) => link.textContent)
    expect(next).toEqual([
      expect.stringMatching(/^Task 3\.1:/),
      expect.stringMatching(/^Task 3\.2:/),
      expect.stringMatching(/^Task 3\.3:/),
    ])
  })

  it('shows mastery once questions have been answered', async () => {
    await db.attempts.add(makeAttempt({ responses: { 'clf-c02-1.1-0001': graded(true, 10) } }))
    renderRoute('/clf-c02')
    const cell = await screen.findByRole('link', { name: /^1\.1:/ })
    expect(cell).toHaveTextContent('Strong')
    expect(cell).toHaveTextContent('100%')
    expect(cell).toHaveTextContent('(few answers)')
    expect(screen.queryByText(/Start with the Diagnostic Exam/)).not.toBeInTheDocument()
  })

  it('links every cert-wide test', async () => {
    renderRoute('/clf-c02')
    await screen.findByRole('heading', { name: 'Practice exams' })
    expect(screen.getByRole('link', { name: 'Weak-Area Drill' })).toHaveAttribute(
      'href',
      '/clf-c02/test/new?kind=drill',
    )
    expect(screen.getByRole('link', { name: 'Full Practice Exam' })).toHaveAttribute(
      'href',
      '/clf-c02/test/new?kind=full',
    )
  })

  it('lists each domain with its exam weight', async () => {
    renderRoute('/clf-c02')
    const card = await screen.findByRole('link', { name: /^Domain 3: Cloud Technology/ })
    expect(card).toHaveAttribute('href', '/clf-c02/d/3')
    expect(card).toHaveTextContent('34% of the exam · 8 tasks')
    expect(card).toHaveTextContent('Not started yet')
  })
})
```

- [ ] **Step 2: Run them and watch them fail**

Run (PowerShell): `npm test -- src/routes/CertDashboardPage.test.jsx`
Expected: FAIL. None of the new sections exist yet.

- [ ] **Step 3: Rewrite `src/routes/CertDashboardPage.jsx`**

```jsx
import { Link } from 'react-router-dom'
import MasteryBadge from '../components/curriculum/MasteryBadge.jsx'
import MasteryHeatmap from '../components/curriculum/MasteryHeatmap.jsx'
import Loading from '../components/ui/Loading.jsx'
import { buttonClass } from '../components/ui/styles.js'
import { NO_MASTERY, poolMastery, recommendNext } from '../engine/mastery.js'
import { TEST_KIND_LABELS } from '../engine/testKinds.js'
import { useCert } from '../hooks/useCert.js'
import { useCertProgress } from '../hooks/useCertProgress.js'
import { describeMastery, formatWeight } from '../lib/format.js'

/** @typedef {import('../content/certs.js').CertSummary} CertSummary */
/** @typedef {import('../hooks/useCertProgress.js').CertProgress} CertProgress */

/** @type {import('../db/types.js').AttemptKind[]} */
const CERT_WIDE_TESTS = ['diagnostic', 'drill', 'full']

export default function CertDashboardPage() {
  const cert = useCert()
  const progress = useCertProgress(cert.id)
  return (
    <>
      <h1 className="text-3xl font-bold">
        {cert.code}: {cert.title}
      </h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        The real exam has {cert.exam.questions} questions in {cert.exam.minutes} minutes. A scaled
        score of {cert.exam.passScaled} passes.
      </p>
      {progress ? (
        <DashboardBody cert={cert} progress={progress} />
      ) : (
        <Loading label="Loading your progress…" />
      )}
    </>
  )
}

/** @param {{ cert: CertSummary, progress: CertProgress }} props */
function DashboardBody({ cert, progress }) {
  const isNew = progress.answeredCount === 0
  return (
    <>
      <section aria-labelledby="exams-heading" className="mt-6">
        <h2 id="exams-heading" className="text-xl font-semibold">
          Practice exams
        </h2>
        {isNew && (
          <p className="mt-2">New here? Start with the Diagnostic Exam to find your weak areas.</p>
        )}
        <ul className="mt-3 flex flex-wrap gap-3">
          {CERT_WIDE_TESTS.map((kind) => (
            <li key={kind}>
              <Link
                to={`/${cert.id}/test/new?kind=${kind}`}
                className={buttonClass(isNew && kind === 'diagnostic' ? 'primary' : 'secondary')}
              >
                {TEST_KIND_LABELS[kind]}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="next-heading" className="mt-8">
        <h2 id="next-heading" className="text-xl font-semibold">
          Recommended next
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          The tasks with the most to gain, weighted by how much of the exam their domain covers.
        </p>
        <ol aria-labelledby="next-heading" className="mt-3 space-y-2">
          {recommendNext(cert, progress.mastery).map(({ subdomain, domain, mastery }) => (
            <li
              key={subdomain.id}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
            >
              <div>
                <Link
                  to={`/${cert.id}/s/${subdomain.code}`}
                  className="font-medium underline-offset-2 hover:underline"
                >
                  Task {subdomain.code}: {subdomain.title}
                </Link>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Domain {domain.no}: {domain.title}
                </p>
              </div>
              <MasteryBadge mastery={mastery} />
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-8">
        <MasteryHeatmap cert={cert} mastery={progress.mastery} />
      </div>

      <section aria-labelledby="domains-heading" className="mt-8">
        <h2 id="domains-heading" className="text-xl font-semibold">
          Domains
        </h2>
        <ul className="mt-3 grid gap-4 sm:grid-cols-2">
          {cert.domains.map((domain) => {
            const pooled = poolMastery(
              domain.subdomains.map((sub) => progress.mastery.get(sub.id) ?? NO_MASTERY),
            )
            return (
              <li key={domain.id}>
                <Link
                  to={`/${cert.id}/d/${domain.no}`}
                  className="block h-full rounded-lg border border-slate-200 p-4 hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600"
                >
                  <span className="block font-semibold">
                    Domain {domain.no}: {domain.title}
                  </span>
                  <span className="mt-1 block text-sm text-slate-600 dark:text-slate-300">
                    {formatWeight(domain.weight)} of the exam · {domain.subdomains.length} tasks
                  </span>
                  <span className="mt-1 block text-sm">
                    {describeMastery(pooled, domain.subdomains.length)}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
    </>
  )
}
```

- [ ] **Step 4: Run the tests and watch them pass**

Run (PowerShell): `npm test -- src/routes/CertDashboardPage.test.jsx src/router.test.jsx`
Expected: PASS. The router's `cert dashboard links to the diagnostic exam setup` test still passes.

- [ ] **Step 5: Commit**

```bash
git add src/routes/CertDashboardPage.jsx src/routes/CertDashboardPage.test.jsx
git commit -m "feat: cert dashboard with recommendations, heatmap and domains" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Domain page

**Files:**

- Modify: `src/routes/DomainPage.jsx` (full rewrite), `src/router.test.jsx`
- Test: `src/routes/DomainPage.test.jsx`

- [ ] **Step 1: Write the failing tests**

`src/routes/DomainPage.test.jsx`:

```jsx
import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db.js'
import { makeAttempt, makeResult } from '../test/factories.js'
import { renderRoute } from '../test/renderRoute.jsx'
import { resetDb } from '../test/resetDb.js'

beforeEach(resetDb)

describe('DomainPage', () => {
  it('lists the domain’s tasks with step status and best Post-Test score', async () => {
    await db.attempts.add(makeAttempt({ kind: 'pre', result: makeResult(70) }))
    await db.attempts.add(makeAttempt({ kind: 'post', result: makeResult(85) }))
    renderRoute('/clf-c02/d/1')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Domain 1: Cloud Concepts' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/24% of the exam/)).toBeInTheDocument()
    const tasks = await screen.findByRole('list', { name: 'Tasks' })
    expect(within(tasks).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      '/clf-c02/s/1.1',
      '/clf-c02/s/1.2',
      '/clf-c02/s/1.3',
      '/clf-c02/s/1.4',
    ])
    const row = screen.getByRole('link', { name: /^Task 1\.1:/ }).closest('li')
    expect(row).toHaveTextContent('Pre-Test: done')
    expect(row).toHaveTextContent('Review: not done')
    expect(row).toHaveTextContent('Post-Test: done')
    expect(row).toHaveTextContent('Best Post-Test score: 85%')
  })

  it('links the Domain Assessment', async () => {
    renderRoute('/clf-c02/d/1')
    expect(await screen.findByRole('link', { name: 'Domain Assessment' })).toHaveAttribute(
      'href',
      '/clf-c02/test/new?kind=domain&scope=1',
    )
  })
})
```

In `src/router.test.jsx`, change the domain row of the first `it.each` to:

```js
    ['/aif-c01/d/3', 'Domain 3: Applications of Foundation Models'],
```

and add `'/clf-c02/d/9'` to the not-found `it.each` list.

- [ ] **Step 2: Run them and watch them fail**

Run (PowerShell): `npm test -- src/routes/DomainPage.test.jsx src/router.test.jsx`
Expected: FAIL on the new heading, the task list and the `/clf-c02/d/9` 404.

- [ ] **Step 3: Rewrite `src/routes/DomainPage.jsx`**

```jsx
import { Link, useParams } from 'react-router-dom'
import MasteryBadge from '../components/curriculum/MasteryBadge.jsx'
import StepChips from '../components/curriculum/StepChips.jsx'
import Loading from '../components/ui/Loading.jsx'
import { buttonClass } from '../components/ui/styles.js'
import { getDomain } from '../content/certs.js'
import { NO_MASTERY } from '../engine/mastery.js'
import { deriveSubdomainStatus } from '../engine/subdomainStatus.js'
import { useCert } from '../hooks/useCert.js'
import { useCertProgress } from '../hooks/useCertProgress.js'
import { formatPct, formatWeight } from '../lib/format.js'
import NotFoundPage from './NotFoundPage.jsx'

export default function DomainPage() {
  const cert = useCert()
  const { domainNo = '' } = useParams()
  const domain = getDomain(cert.id, domainNo)
  const progress = useCertProgress(cert.id)
  if (!domain) return <NotFoundPage />

  return (
    <>
      <h1 className="text-3xl font-bold">
        Domain {domain.no}: {domain.title}
      </h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        {formatWeight(domain.weight)} of the exam · {domain.subdomains.length} tasks ·{' '}
        {domain.itemCount} questions
      </p>
      <p className="mt-4">
        <Link
          to={`/${cert.id}/test/new?kind=domain&scope=${domain.no}`}
          className={buttonClass('primary')}
        >
          Domain Assessment
        </Link>
      </p>

      <section aria-labelledby="tasks-heading" className="mt-8">
        <h2 id="tasks-heading" className="text-xl font-semibold">
          Tasks
        </h2>
        {progress ? (
          <ol
            aria-labelledby="tasks-heading"
            className="mt-2 divide-y divide-slate-200 dark:divide-slate-800"
          >
            {domain.subdomains.map((sub) => {
              const status = deriveSubdomainStatus(
                sub.id,
                progress.attempts,
                progress.reviews.get(sub.id),
              )
              return (
                <li key={sub.id} className="py-4">
                  <Link
                    to={`/${cert.id}/s/${sub.code}`}
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    Task {sub.code}: {sub.title}
                  </Link>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                    <MasteryBadge mastery={progress.mastery.get(sub.id) ?? NO_MASTERY} />
                    <StepChips status={status} />
                    {status.post.done && (
                      <span>Best Post-Test score: {formatPct(status.post.bestPct)}</span>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        ) : (
          <Loading label="Loading your progress…" />
        )}
      </section>
    </>
  )
}
```

- [ ] **Step 4: Run the tests and watch them pass**

Run (PowerShell): `npm test -- src/routes/DomainPage.test.jsx src/router.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/routes/DomainPage.jsx src/routes/DomainPage.test.jsx src/router.test.jsx
git commit -m "feat: domain page with task status rows" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Sub-domain page

**Files:**

- Modify: `src/routes/SubdomainPage.jsx` (full rewrite), `src/router.test.jsx`
- Test: `src/routes/SubdomainPage.test.jsx`

- [ ] **Step 1: Write the failing tests**

`src/routes/SubdomainPage.test.jsx`:

```jsx
import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db.js'
import { markReviewComplete } from '../db/progress.js'
import { graded, makeAttempt, makeResult } from '../test/factories.js'
import { renderRoute } from '../test/renderRoute.jsx'
import { resetDb } from '../test/resetDb.js'

beforeEach(resetDb)

describe('SubdomainPage', () => {
  it('shows the task statement and recommends the Pre-Test first', async () => {
    renderRoute('/clf-c02/s/1.1')
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Task 1.1: Define the benefits of the AWS Cloud.',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Domain 1: Cloud Concepts' })).toHaveAttribute(
      'href',
      '/clf-c02/d/1',
    )
    const pre = (await screen.findByRole('link', { name: 'Pre-Test' })).closest('li')
    expect(pre).toHaveTextContent('Recommended next')
  })

  it('reflects earlier attempts and reviews', async () => {
    await db.attempts.add(
      makeAttempt({
        kind: 'pre',
        result: makeResult(60),
        responses: { 'clf-c02-1.1-0001': graded(true, 10) },
      }),
    )
    await markReviewComplete('clf-c02', 'clf-c02/1.1')
    renderRoute('/clf-c02/s/1.1')
    const post = (await screen.findByRole('link', { name: 'Post-Test' })).closest('li')
    expect(post).toHaveTextContent('Recommended next')
    expect(screen.getByRole('link', { name: 'Pre-Test' }).closest('li')).toHaveTextContent(
      'best score 60%',
    )
    expect(screen.getByRole('link', { name: 'Review' }).closest('li')).toHaveTextContent(
      /Reviewed /,
    )
    expect(screen.getByText('Your mastery:').parentElement).toHaveTextContent('100%')
  })
})
```

In `src/router.test.jsx`:

- Change the sub-domain row of the first `it.each` to `['/clf-c02/s/1.1', 'Task 1.1: Define the benefits of the AWS Cloud.'],`.
- Add `'/clf-c02/s/9.9'` to the not-found list.
- In `the sub-domain page links the Pre-Test, Review and Post-Test steps in order`, keep the assertions as they are. `findByRole` already waits for the stepper to load.

- [ ] **Step 2: Run them and watch them fail**

Run (PowerShell): `npm test -- src/routes/SubdomainPage.test.jsx src/router.test.jsx`
Expected: FAIL on the heading, the domain link, the recommendation and the 404.

- [ ] **Step 3: Rewrite `src/routes/SubdomainPage.jsx`**

```jsx
import { Link, useParams } from 'react-router-dom'
import MasteryBadge from '../components/curriculum/MasteryBadge.jsx'
import SubdomainStepper from '../components/curriculum/SubdomainStepper.jsx'
import Loading from '../components/ui/Loading.jsx'
import { getSubdomain } from '../content/certs.js'
import { NO_MASTERY } from '../engine/mastery.js'
import { deriveSubdomainStatus } from '../engine/subdomainStatus.js'
import { useCert } from '../hooks/useCert.js'
import { useCertProgress } from '../hooks/useCertProgress.js'
import NotFoundPage from './NotFoundPage.jsx'

export default function SubdomainPage() {
  const cert = useCert()
  const { taskCode = '' } = useParams()
  const subdomain = getSubdomain(cert.id, taskCode)
  const progress = useCertProgress(cert.id)
  if (!subdomain) return <NotFoundPage />
  const domain = cert.domains.find((candidate) => candidate.subdomains.includes(subdomain))

  return (
    <>
      <h1 className="text-3xl font-bold">
        Task {subdomain.code}: {subdomain.title}
      </h1>
      {domain && (
        <p className="mt-2">
          <Link
            to={`/${cert.id}/d/${domain.no}`}
            className="font-medium text-amber-700 underline underline-offset-2 dark:text-amber-400"
          >
            Domain {domain.no}: {domain.title}
          </Link>
        </p>
      )}
      {progress ? (
        <>
          <p className="mt-4 flex flex-wrap items-center gap-2">
            <span className="font-medium">Your mastery:</span>
            <MasteryBadge mastery={progress.mastery.get(subdomain.id) ?? NO_MASTERY} />
          </p>
          <SubdomainStepper
            certId={cert.id}
            taskCode={subdomain.code}
            status={deriveSubdomainStatus(
              subdomain.id,
              progress.attempts,
              progress.reviews.get(subdomain.id),
            )}
          />
        </>
      ) : (
        <Loading label="Loading your progress…" />
      )}
    </>
  )
}
```

- [ ] **Step 4: Run the tests and watch them pass**

Run (PowerShell): `npm test -- src/routes/SubdomainPage.test.jsx src/router.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/routes/SubdomainPage.jsx src/routes/SubdomainPage.test.jsx src/router.test.jsx
git commit -m "feat: sub-domain page with guided stepper" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: `useIsDark` and the lazy Mermaid block

**Files:**

- Create: `src/hooks/useIsDark.js`, `src/components/markdown/MermaidBlock.jsx`
- Test: `src/hooks/useIsDark.test.js`, `src/components/markdown/MermaidBlock.test.jsx`

- [ ] **Step 1: Write the failing tests**

`src/hooks/useIsDark.test.js`:

```js
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useIsDark } from './useIsDark.js'

afterEach(() => document.documentElement.classList.remove('dark'))

describe('useIsDark', () => {
  it('follows the dark class on <html>', async () => {
    const { result } = renderHook(() => useIsDark())
    expect(result.current).toBe(false)
    act(() => document.documentElement.classList.add('dark'))
    await waitFor(() => expect(result.current).toBe(true))
  })
})
```

`src/components/markdown/MermaidBlock.test.jsx`:

```jsx
import { act, render, screen, waitFor } from '@testing-library/react'
import mermaid from 'mermaid'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MermaidBlock from './MermaidBlock.jsx'

vi.mock('mermaid', () => ({ default: { initialize: vi.fn(), render: vi.fn() } }))

const CODE = 'flowchart TD\n  A --> B'

beforeEach(() => {
  vi.mocked(mermaid.initialize).mockClear()
  vi.mocked(mermaid.render)
    .mockReset()
    .mockImplementation(async (id) => ({ svg: `<svg data-testid="diagram" id="${id}"></svg>` }))
})

afterEach(() => {
  document.documentElement.classList.remove('dark')
  vi.restoreAllMocks()
})

describe('MermaidBlock', () => {
  it('draws the diagram with the light theme and strict security', async () => {
    render(<MermaidBlock code={CODE} />)
    expect(screen.getByText('Loading diagram…')).toBeInTheDocument()
    expect(await screen.findByTestId('diagram')).toBeInTheDocument()
    expect(mermaid.initialize).toHaveBeenLastCalledWith({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'default',
    })
    expect(mermaid.render).toHaveBeenCalledWith(expect.stringMatching(/^mermaid-[\w-]+$/), CODE)
  })

  it('redraws with the dark theme when the theme changes', async () => {
    render(<MermaidBlock code={CODE} />)
    await screen.findByTestId('diagram')
    act(() => document.documentElement.classList.add('dark'))
    await waitFor(() =>
      expect(mermaid.initialize).toHaveBeenLastCalledWith(
        expect.objectContaining({ theme: 'dark' }),
      ),
    )
  })

  it('shows the source when the diagram cannot be drawn', async () => {
    vi.mocked(mermaid.render).mockRejectedValue(new Error('Parse error'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<MermaidBlock code={CODE} />)
    expect(await screen.findByText(/couldn’t be drawn/)).toBeInTheDocument()
    expect(screen.getByText(/A --> B/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run them and watch them fail**

Run (PowerShell): `npm test -- src/hooks/useIsDark.test.js src/components/markdown/MermaidBlock.test.jsx`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement `src/hooks/useIsDark.js`**

```js
import { useSyncExternalStore } from 'react'

/** @param {() => void} onChange */
function subscribe(onChange) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}

function isDark() {
  return document.documentElement.classList.contains('dark')
}

/**
 * Whether the dark theme is showing. Follows applyTheme(), including OS changes while the
 * theme is "system", because both only toggle the `dark` class on <html>.
 */
export function useIsDark() {
  return useSyncExternalStore(subscribe, isDark)
}
```

- [ ] **Step 4: Implement `src/components/markdown/MermaidBlock.jsx`**

```jsx
import { useEffect, useId, useState } from 'react'
import { useIsDark } from '../../hooks/useIsDark.js'

/** @typedef {typeof import('mermaid').default} Mermaid */
/** @typedef {{ status: 'loading' } | { status: 'ready', svg: string } | { status: 'error' }} DiagramState */

/** @type {Promise<Mermaid> | null} */
let mermaidModule = null

/** Mermaid is large, so it is downloaded only when a diagram is actually on screen. */
function loadMermaid() {
  if (!mermaidModule) {
    mermaidModule = import('mermaid').then((module) => module.default)
    // Forget a failed download (e.g. offline) so the next diagram retries.
    mermaidModule.catch(() => {
      mermaidModule = null
    })
  }
  return mermaidModule
}

/**
 * Renders a ```mermaid fence as an SVG diagram in the current theme. Lesson authors are
 * trusted, and securityLevel "strict" still strips scripts and click handlers.
 * @param {{ code: string }} props
 */
export default function MermaidBlock({ code }) {
  const dark = useIsDark()
  // Mermaid uses the id in CSS selectors, so strip the punctuation React puts in useId values.
  const id = `mermaid-${useId().replace(/[^\w-]/g, '')}`
  const [state, setState] = useState(/** @type {DiagramState} */ ({ status: 'loading' }))

  useEffect(() => {
    let cancelled = false
    loadMermaid()
      .then(async (mermaid) => {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: dark ? 'dark' : 'default',
        })
        const { svg } = await mermaid.render(id, code)
        if (!cancelled) setState({ status: 'ready', svg })
      })
      .catch((error) => {
        console.error('Failed to draw diagram', error)
        if (!cancelled) setState({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [code, dark, id])

  if (state.status === 'loading') {
    return <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">Loading diagram…</p>
  }
  if (state.status === 'error') {
    return (
      <figure className="mt-4">
        <pre>
          <code>{code}</code>
        </pre>
        <figcaption className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          This diagram couldn’t be drawn, so its source is shown instead.
        </figcaption>
      </figure>
    )
  }
  return (
    <figure
      className="mermaid-diagram mt-4 overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: state.svg }}
    />
  )
}
```

- [ ] **Step 5: Run the tests and watch them pass**

Run (PowerShell): `npm test -- src/hooks/useIsDark.test.js src/components/markdown/MermaidBlock.test.jsx`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useIsDark.js src/hooks/useIsDark.test.js src/components/markdown
git commit -m "feat: theme-aware lazy Mermaid diagrams" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Markdown renderer, table of contents and lesson styles

**Files:**

- Create: `src/components/markdown/Markdown.jsx`, `src/components/markdown/TableOfContents.jsx`, `src/components/markdown/headings.js`
- Modify: `src/index.css`
- Test: `src/components/markdown/Markdown.test.jsx`, `src/components/markdown/TableOfContents.test.jsx`

- [ ] **Step 1: Write the failing tests**

`src/components/markdown/Markdown.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import mermaid from 'mermaid'
import { describe, expect, it, vi } from 'vitest'
import Markdown from './Markdown.jsx'

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async (id) => ({ svg: `<svg data-testid="diagram" id="${id}"></svg>` })),
  },
}))

const SAMPLE = [
  '# Lesson title',
  '',
  '## Key terms',
  '',
  '| Term | Meaning |',
  '| ---- | ------- |',
  '| Region | A geographic area |',
  '',
  '## Learn more',
  '',
  '- [AWS docs](https://docs.aws.amazon.com/)',
  '',
  '```mermaid',
  'flowchart TD',
  '  A --> B',
  '```',
  '',
  '```text',
  'plain code',
  '```',
].join('\n')

describe('Markdown', () => {
  it('renders GFM tables and gives headings slug ids', () => {
    render(<Markdown>{SAMPLE}</Markdown>)
    expect(screen.getByRole('heading', { level: 1, name: 'Lesson title' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Key terms' })).toHaveAttribute(
      'id',
      'key-terms',
    )
    expect(screen.getByRole('table')).toHaveTextContent('A geographic area')
  })

  it('opens links in a new tab and says so', () => {
    render(<Markdown>{SAMPLE}</Markdown>)
    const link = screen.getByRole('link', { name: 'AWS docs (opens in a new tab)' })
    expect(link).toHaveAttribute('href', 'https://docs.aws.amazon.com/')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noreferrer')
  })

  it('draws mermaid fences and leaves other code blocks alone', async () => {
    render(<Markdown>{SAMPLE}</Markdown>)
    expect(await screen.findByTestId('diagram')).toBeInTheDocument()
    expect(mermaid.render).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('A --> B'),
    )
    expect(screen.getByText('plain code').closest('pre')).toBeInTheDocument()
  })

  it('does not render raw HTML', () => {
    const { container } = render(<Markdown>{'<script>alert(1)</script> <b>bold</b>'}</Markdown>)
    expect(container.querySelector('script, b')).toBeNull()
  })
})
```

`src/components/markdown/TableOfContents.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { readHeadings } from './headings.js'
import TableOfContents from './TableOfContents.jsx'

describe('readHeadings', () => {
  it('collects h2 and h3 headings that have ids', () => {
    const container = document.createElement('div')
    container.innerHTML =
      '<h1 id="t">Title</h1><h2 id="a">A</h2><h3 id="b">B</h3><h2>No id</h2><h4 id="c">C</h4>'
    expect(readHeadings(container)).toEqual([
      { id: 'a', text: 'A', level: 2 },
      { id: 'b', text: 'B', level: 3 },
    ])
  })
})

describe('TableOfContents', () => {
  it('moves focus to the heading without changing the route', async () => {
    Element.prototype.scrollIntoView = vi.fn()
    const user = userEvent.setup()
    render(
      <>
        <TableOfContents entries={[{ id: 'key-terms', text: 'Key terms', level: 2 }]} />
        <h2 id="key-terms" tabIndex={-1}>
          Key terms
        </h2>
      </>,
    )
    await user.click(screen.getByRole('link', { name: 'Key terms' }))
    expect(screen.getByRole('heading', { name: 'Key terms', level: 2 })).toHaveFocus()
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
    expect(window.location.hash).toBe('')
  })

  it('renders nothing without entries', () => {
    const { container } = render(<TableOfContents entries={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
```

- [ ] **Step 2: Run them and watch them fail**

Run (PowerShell): `npm test -- src/components/markdown`
Expected: the Markdown and TableOfContents suites FAIL with modules not found. MermaidBlock still passes.

- [ ] **Step 3: Implement `src/components/markdown/headings.js`**

```js
/**
 * @typedef {object} TocEntry
 * @property {string} id
 * @property {string} text
 * @property {2 | 3} level
 */

/**
 * Reads the rendered lesson's section headings (ids come from rehype-slug).
 * @param {ParentNode} container
 * @returns {TocEntry[]}
 */
export function readHeadings(container) {
  return [...container.querySelectorAll('h2[id], h3[id]')].map((heading) => ({
    id: heading.id,
    text: heading.textContent ?? '',
    level: heading.tagName === 'H3' ? 3 : 2,
  }))
}
```

- [ ] **Step 4: Implement `src/components/markdown/TableOfContents.jsx`**

```jsx
/** @typedef {import('./headings.js').TocEntry} TocEntry */

/**
 * In-page links for a lesson. Uses focus() and scrollIntoView() instead of following
 * "#id", which HashRouter would treat as a route.
 * @param {{ entries: TocEntry[] }} props
 */
export default function TableOfContents({ entries }) {
  if (entries.length === 0) return null
  return (
    <nav aria-labelledby="toc-heading" className="text-sm">
      <h2 id="toc-heading" className="font-semibold">
        On this page
      </h2>
      <ul className="mt-2 space-y-1">
        {entries.map((entry) => (
          <li key={entry.id} className={entry.level === 3 ? 'pl-4' : ''}>
            <a
              href={`#${entry.id}`}
              onClick={(event) => {
                event.preventDefault()
                const target = document.getElementById(entry.id)
                target?.scrollIntoView({ block: 'start' })
                target?.focus({ preventScroll: true })
              }}
              className="text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline dark:text-slate-300 dark:hover:text-white"
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
```

- [ ] **Step 5: Implement `src/components/markdown/Markdown.jsx`**

```jsx
import ReactMarkdown from 'react-markdown'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'
import MermaidBlock from './MermaidBlock.jsx'

/** @typedef {import('hast').Element} HastElement */
/** @typedef {import('hast').ElementContent} HastContent */

/**
 * @param {HastContent} node
 * @returns {string}
 */
function textOf(node) {
  if (node.type === 'text') return node.value
  return 'children' in node ? node.children.map(textOf).join('') : ''
}

/**
 * The diagram source when this <pre> holds a ```mermaid fence, otherwise null.
 * @param {HastElement | undefined} pre
 */
function mermaidSource(pre) {
  const code = pre?.children[0]
  if (code?.type !== 'element' || code.tagName !== 'code') return null
  const classes = code.properties.className
  return Array.isArray(classes) && classes.includes('language-mermaid') ? textOf(code) : null
}

// Only the props each element needs are passed through. Never spread react-markdown's `node`
// onto the DOM.
/** @type {import('react-markdown').Components} */
const COMPONENTS = {
  pre({ node, children }) {
    const diagram = mermaidSource(node)
    return diagram === null ? <pre>{children}</pre> : <MermaidBlock code={diagram} />
  },
  a({ href, children }) {
    return (
      <a href={href} target="_blank" rel="noreferrer">
        {children}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    )
  },
  h2({ id, children }) {
    return (
      <h2 id={id} tabIndex={-1}>
        {children}
      </h2>
    )
  },
  h3({ id, children }) {
    return (
      <h3 id={id} tabIndex={-1}>
        {children}
      </h3>
    )
  },
  table({ children }) {
    return (
      <div className="table-wrap">
        <table>{children}</table>
      </div>
    )
  },
}

/**
 * Renders authored Markdown: GFM tables, Mermaid diagrams, slugged heading ids. Raw HTML in
 * the source is dropped, not rendered.
 * @param {{ children: string }} props
 */
export default function Markdown({ children }) {
  return (
    <div className="lesson">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]} components={COMPONENTS}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
```

- [ ] **Step 6: Add the lesson typography to `src/index.css`**

Append after the existing `@layer base { … }` block:

```css
@layer components {
  .lesson {
    @apply leading-7;
  }
  .lesson h1 {
    @apply text-3xl leading-tight font-bold;
  }
  .lesson h2 {
    @apply mt-10 scroll-mt-4 text-2xl font-semibold;
  }
  .lesson h3 {
    @apply mt-6 scroll-mt-4 text-xl font-semibold;
  }
  .lesson p,
  .lesson ul,
  .lesson ol,
  .lesson pre,
  .lesson .table-wrap {
    @apply mt-4;
  }
  .lesson ul {
    @apply list-disc pl-6;
  }
  .lesson ol {
    @apply list-decimal pl-6;
  }
  .lesson li + li {
    @apply mt-1;
  }
  .lesson a {
    @apply font-medium text-amber-700 underline underline-offset-2 dark:text-amber-400;
  }
  .lesson strong {
    @apply font-semibold;
  }
  .lesson code {
    @apply rounded bg-slate-100 px-1 py-0.5 text-sm dark:bg-slate-800;
  }
  .lesson pre {
    @apply overflow-x-auto rounded bg-slate-100 p-4 dark:bg-slate-800;
  }
  .lesson pre code {
    @apply bg-transparent p-0;
  }
  .lesson .table-wrap {
    @apply overflow-x-auto;
  }
  .lesson table {
    @apply w-full border-collapse text-left text-sm;
  }
  .lesson th,
  .lesson td {
    @apply border border-slate-300 px-3 py-2 align-top dark:border-slate-700;
  }
  .lesson th {
    @apply bg-slate-100 font-semibold dark:bg-slate-800;
  }
  .mermaid-diagram svg {
    @apply mx-auto h-auto max-w-full;
  }
}
```

- [ ] **Step 7: Run the tests and watch them pass**

Run (PowerShell): `npm test -- src/components/markdown`
Expected: PASS (all three suites).

- [ ] **Step 8: Typecheck the hast and Components types**

Run: `npm run typecheck`
Expected: no errors. If `import('hast')` does not resolve, run `npm ls @types/hast`. It ships with react-markdown, so it should be present. Do not add `@types/hast` to `types` in `jsconfig.json`, because explicit imports don't need it.

- [ ] **Step 9: Commit**

```bash
git add src/components/markdown src/index.css
git commit -m "feat: lesson Markdown renderer with table of contents" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: `useLesson` and the Review page

**Files:**

- Create: `src/hooks/useLesson.js`
- Modify: `src/routes/ReviewPage.jsx` (full rewrite), `src/router.test.jsx`, `e2e/app.spec.js`
- Test: `src/hooks/useLesson.test.js`, `src/routes/ReviewPage.test.jsx`

- [ ] **Step 1: Write the failing hook tests `src/hooks/useLesson.test.js`**

```js
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadReview } from '../content/loadReview.js'
import { useLesson } from './useLesson.js'

vi.mock('../content/loadReview.js', () => ({ loadReview: vi.fn() }))

beforeEach(() => {
  vi.mocked(loadReview).mockReset()
  vi.restoreAllMocks()
})

describe('useLesson', () => {
  it('loads the lesson for the task', async () => {
    vi.mocked(loadReview).mockResolvedValue('# Hello')
    const { result } = renderHook(() => useLesson('clf-c02', '1.1'))
    expect(result.current).toEqual({ status: 'loading' })
    await waitFor(() => expect(result.current).toEqual({ status: 'ready', markdown: '# Hello' }))
    expect(loadReview).toHaveBeenCalledWith('clf-c02', '1.1')
  })

  it('reports a failed load', async () => {
    vi.mocked(loadReview).mockRejectedValue(new Error('offline'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result } = renderHook(() => useLesson('clf-c02', '1.1'))
    await waitFor(() => expect(result.current).toEqual({ status: 'error' }))
  })

  it('does nothing without a task', () => {
    const { result } = renderHook(() => useLesson('clf-c02', null))
    expect(result.current).toEqual({ status: 'loading' })
    expect(loadReview).not.toHaveBeenCalled()
  })

  it('never shows the previous task’s lesson while the next one loads', async () => {
    vi.mocked(loadReview).mockImplementation(async (_certId, task) => `# ${task}`)
    const { result, rerender } = renderHook(({ task }) => useLesson('clf-c02', task), {
      initialProps: { task: '1.1' },
    })
    await waitFor(() => expect(result.current).toEqual({ status: 'ready', markdown: '# 1.1' }))
    rerender({ task: '1.2' })
    expect(result.current).toEqual({ status: 'loading' })
    await waitFor(() => expect(result.current).toEqual({ status: 'ready', markdown: '# 1.2' }))
  })
})
```

- [ ] **Step 2: Write the failing page tests `src/routes/ReviewPage.test.jsx`**

```jsx
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getProgress } from '../db/progress.js'
import { renderRoute } from '../test/renderRoute.jsx'
import { resetDb } from '../test/resetDb.js'

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async (id) => ({ svg: `<svg data-testid="diagram" id="${id}"></svg>` })),
  },
}))

beforeEach(async () => {
  await resetDb()
  Element.prototype.scrollIntoView = vi.fn()
})

describe('ReviewPage', () => {
  it('renders the lesson with a table of contents and its diagram', async () => {
    renderRoute('/clf-c02/s/1.1/review')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Define the benefits of the AWS Cloud' }),
    ).toBeInTheDocument()
    const toc = screen.getByRole('navigation', { name: 'On this page' })
    expect(within(toc).getByRole('link', { name: 'Key concepts' })).toHaveAttribute(
      'href',
      '#key-concepts',
    )
    expect(await screen.findByTestId('diagram')).toBeInTheDocument()
  })

  it('marks the task as reviewed and promotes the Post-Test', async () => {
    const user = userEvent.setup()
    renderRoute('/clf-c02/s/1.1/review')
    await user.click(await screen.findByRole('button', { name: 'Mark as reviewed' }))
    expect(await screen.findByText(/^Marked as reviewed on/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark as reviewed' })).not.toBeInTheDocument()
    expect((await getProgress('clf-c02/1.1'))?.reviewCompletedAt).toEqual(expect.any(Number))
    expect(screen.getByRole('link', { name: 'Take the Post-Test' })).toHaveAttribute(
      'href',
      '/clf-c02/test/new?kind=post&scope=1.1',
    )
  })
})
```

- [ ] **Step 3: Update `src/router.test.jsx` for lesson headings**

- Add at the top, after the imports:

```js
vi.mock('mermaid', () => ({
  default: { initialize: vi.fn(), render: vi.fn(async () => ({ svg: '<svg></svg>' })) },
}))
```

and add `vi` to the `vitest` import.

- Change the review row of the first `it.each` to `['/clf-c02/s/1.1/review', 'Define the benefits of the AWS Cloud'],`.
- Add `'/clf-c02/s/9.9/review'` to the not-found list.
- In `breadcrumbs trace the curriculum path`, change the awaited heading to `screen.findByRole('heading', { level: 1, name: 'Define the benefits of the AWS Cloud' })`. The breadcrumb labels stay `['Home', 'CLF-C02', 'Task 1.1', 'Review']`.

- [ ] **Step 4: Update `e2e/app.spec.js`**

In `a deep link survives a full reload`, change the heading to:

```js
const heading = page.getByRole('heading', {
  level: 1,
  name: 'Explain the basic concepts of generative AI (GenAI)',
})
```

- [ ] **Step 5: Run the tests and watch them fail**

Run (PowerShell): `npm test -- src/hooks/useLesson.test.js src/routes/ReviewPage.test.jsx src/router.test.jsx`
Expected: FAIL. `useLesson.js` is missing and the review page still shows the stub.

- [ ] **Step 6: Implement `src/hooks/useLesson.js`**

```js
import { useEffect, useState } from 'react'
import { loadReview } from '../content/loadReview.js'

/** @typedef {{ status: 'loading' } | { status: 'ready', markdown: string } | { status: 'error' }} LessonState */

/** @type {LessonState} */
const LOADING = { status: 'loading' }

/**
 * Lazily loads a task's lesson Markdown.
 * @param {string} certId
 * @param {string | null} taskCode null when there is no lesson to load
 * @returns {LessonState}
 */
export function useLesson(certId, taskCode) {
  const key = taskCode ? `${certId}/${taskCode}` : null
  // Results are tagged with their key, so a stale lesson is never shown for a new task.
  const [result, setResult] = useState(
    /** @type {{ key: string, state: LessonState } | null} */ (null),
  )

  useEffect(() => {
    if (!key || !taskCode) return
    let cancelled = false
    loadReview(certId, taskCode).then(
      (markdown) => {
        if (!cancelled) setResult({ key, state: { status: 'ready', markdown } })
      },
      (error) => {
        console.error('Failed to load lesson', error)
        if (!cancelled) setResult({ key, state: { status: 'error' } })
      },
    )
    return () => {
      cancelled = true
    }
  }, [certId, taskCode, key])

  return result && result.key === key ? result.state : LOADING
}
```

- [ ] **Step 7: Rewrite `src/routes/ReviewPage.jsx`**

```jsx
import { useLiveQuery } from 'dexie-react-hooks'
import { useLayoutEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { readHeadings } from '../components/markdown/headings.js'
import Markdown from '../components/markdown/Markdown.jsx'
import TableOfContents from '../components/markdown/TableOfContents.jsx'
import Loading from '../components/ui/Loading.jsx'
import { buttonClass } from '../components/ui/styles.js'
import { getSubdomain } from '../content/certs.js'
import { getProgress, markReviewComplete } from '../db/progress.js'
import { useCert } from '../hooks/useCert.js'
import { useLesson } from '../hooks/useLesson.js'
import { formatDate } from '../lib/format.js'
import NotFoundPage from './NotFoundPage.jsx'

/** @typedef {import('../content/certs.js').CertSummary} CertSummary */
/** @typedef {import('../content/certs.js').SubdomainSummary} SubdomainSummary */
/** @typedef {import('../components/markdown/headings.js').TocEntry} TocEntry */

export default function ReviewPage() {
  const cert = useCert()
  const { taskCode = '' } = useParams()
  const subdomain = getSubdomain(cert.id, taskCode)
  const lesson = useLesson(cert.id, subdomain?.hasLesson ? subdomain.code : null)

  if (!subdomain?.hasLesson) return <NotFoundPage />
  if (lesson.status === 'loading') return <Loading label="Loading lesson…" />
  if (lesson.status === 'error') {
    return (
      <div role="alert">
        <h1 className="text-3xl font-bold">Lesson unavailable</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          The lesson failed to load. Check your connection and reload the page.
        </p>
      </div>
    )
  }
  return <Lesson cert={cert} subdomain={subdomain} markdown={lesson.markdown} />
}

/** @param {{ cert: CertSummary, subdomain: SubdomainSummary, markdown: string }} props */
function Lesson({ cert, subdomain, markdown }) {
  const articleRef = useRef(/** @type {HTMLElement | null} */ (null))
  const [toc, setToc] = useState(/** @type {TocEntry[]} */ ([]))
  const [saveFailed, setSaveFailed] = useState(false)
  const reviewedAt = useLiveQuery(
    () =>
      getProgress(subdomain.id)
        .then((row) => row?.reviewCompletedAt ?? null)
        .catch((error) => {
          console.error('Failed to read review progress', error)
          return null
        }),
    [subdomain.id],
  )

  // rehype-slug assigns heading ids during render, so read them back from the DOM.
  useLayoutEffect(() => {
    if (articleRef.current) setToc(readHeadings(articleRef.current))
  }, [markdown])

  async function markReviewed() {
    setSaveFailed(false)
    try {
      await markReviewComplete(cert.id, subdomain.id)
    } catch (error) {
      console.error('Failed to save review progress', error)
      setSaveFailed(true)
    }
  }

  const reviewed = typeof reviewedAt === 'number'
  return (
    <>
      <p className="text-sm font-semibold tracking-wide text-amber-700 dark:text-amber-400">
        Review · Task {subdomain.code}
      </p>
      <div className="mt-2 lg:grid lg:grid-cols-[minmax(0,1fr)_14rem] lg:gap-10">
        <article ref={articleRef} className="min-w-0">
          <Markdown>{markdown}</Markdown>
        </article>
        <aside className="hidden lg:block">
          <div className="sticky top-4">
            <TableOfContents entries={toc} />
          </div>
        </aside>
      </div>

      <section
        aria-labelledby="finish-heading"
        className="mt-10 border-t border-slate-200 pt-6 dark:border-slate-800"
      >
        <h2 id="finish-heading" className="text-xl font-semibold">
          Finished reading?
        </h2>
        <p role="status" className="mt-2">
          {reviewed ? `Marked as reviewed on ${formatDate(reviewedAt)}.` : ''}
        </p>
        {saveFailed && (
          <p role="alert" className="mt-2 text-red-700 dark:text-red-400">
            Couldn’t save your progress. Your browser may be blocking storage.
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-3">
          {reviewedAt === null && (
            <button type="button" onClick={markReviewed} className={buttonClass('primary')}>
              Mark as reviewed
            </button>
          )}
          <Link
            to={`/${cert.id}/test/new?kind=post&scope=${subdomain.code}`}
            className={buttonClass(reviewed ? 'primary' : 'secondary')}
          >
            Take the Post-Test
          </Link>
        </div>
      </section>
    </>
  )
}
```

- [ ] **Step 8: Run the tests and watch them pass**

Run (PowerShell): `npm test -- src/hooks/useLesson.test.js src/routes/ReviewPage.test.jsx src/router.test.jsx`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/hooks/useLesson.js src/hooks/useLesson.test.js src/routes/ReviewPage.jsx src/routes/ReviewPage.test.jsx src/router.test.jsx e2e/app.spec.js
git commit -m "feat: review page with lesson, contents and mark-as-reviewed" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: Test setup page

**Files:**

- Create: `src/components/test/TestSetupForm.jsx`
- Modify: `src/routes/TestSetupPage.jsx` (full rewrite), `src/router.test.jsx`
- Test: `src/routes/TestSetupPage.test.jsx`

- [ ] **Step 1: Write the failing tests**

`src/routes/TestSetupPage.test.jsx`:

```jsx
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { getSubdomain } from '../content/certs.js'
import { renderRoute } from '../test/renderRoute.jsx'

describe('TestSetupPage', () => {
  it('offers the Pre-Test lengths with 10 selected', async () => {
    renderRoute('/clf-c02/test/new?kind=pre&scope=1.1')
    expect(await screen.findByRole('heading', { level: 1, name: 'Pre-Test' })).toBeInTheDocument()
    expect(screen.getByText('Task 1.1: Define the benefits of the AWS Cloud.')).toBeInTheDocument()
    expect(screen.getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual([
      '5',
      '10',
      '15',
      '20',
    ])
    expect(screen.getByRole('radio', { name: '10' })).toBeChecked()
    expect(screen.getByText(/^Untimed/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Start/ })).toBeDisabled()
  })

  it('turns off lengths longer than the question pool', async () => {
    const pool = getSubdomain('clf-c02', '1.1')?.itemCount ?? 0
    renderRoute('/clf-c02/test/new?kind=post&scope=1.1')
    await screen.findByRole('heading', { level: 1, name: 'Post-Test' })
    for (const value of [10, 15, 20, 25]) {
      expect(screen.getByRole('radio', { name: String(value) })).toHaveProperty(
        'disabled',
        value > pool,
      )
    }
  })

  it('lets the learner choose Exam or Study mode for the Diagnostic Exam', async () => {
    const user = userEvent.setup()
    renderRoute('/clf-c02/test/new?kind=diagnostic')
    await screen.findByRole('heading', { level: 1, name: 'Diagnostic Exam' })
    expect(screen.queryByRole('radio', { name: '10' })).not.toBeInTheDocument()
    expect(screen.getByText(/^65 questions/)).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Exam mode' })).toBeChecked()
    expect(screen.getByText(/90-minute timer/)).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Study mode' }))
    expect(screen.getByText('Study mode has no timer.')).toBeInTheDocument()
  })
})
```

In `src/router.test.jsx`, add these to the not-found `it.each` list:

```js
'/clf-c02/test/new?kind=pre',
'/clf-c02/test/new?kind=pre&scope=9.9',
'/clf-c02/test/new?kind=diagnostic&scope=1.1',
'/clf-c02/test/new?kind=domain&scope=7',
```

- [ ] **Step 2: Run them and watch them fail**

Run (PowerShell): `npm test -- src/routes/TestSetupPage.test.jsx src/router.test.jsx`
Expected: FAIL. There are no radios yet and the bad scopes still render.

- [ ] **Step 3: Implement `src/components/test/TestSetupForm.jsx`**

```jsx
import { useId, useState } from 'react'
import { defaultLength, isExamKind, lengthChoices } from '../../engine/testConfig.js'
import { TEST_KIND_LABELS } from '../../engine/testKinds.js'
import { buttonClass } from '../ui/styles.js'

/** @typedef {import('../../content/certs.js').CertSummary} CertSummary */
/** @typedef {import('../../db/types.js').AttemptKind} AttemptKind */
/** @typedef {import('../../db/types.js').AttemptMode} AttemptMode */
/** @typedef {import('../../engine/testConfig.js').TestScope} TestScope */

/** @type {{ value: AttemptMode, label: string }[]} */
const MODES = [
  { value: 'exam', label: 'Exam mode' },
  { value: 'study', label: 'Study mode' },
]

/**
 * Length and mode choices before a test. The Start button is wired to the exam engine in
 * Phase 4; until then it stays disabled with a note.
 * @param {{ cert: CertSummary, kind: AttemptKind, scope: TestScope }} props
 */
export default function TestSetupForm({ cert, kind, scope }) {
  const examKind = isExamKind(kind)
  const choices = isExamKind(kind) ? [] : lengthChoices(kind, scope.poolSize)
  const [length, setLength] = useState(
    isExamKind(kind) ? cert.exam.questions : defaultLength(kind, scope.poolSize),
  )
  const [mode, setMode] = useState(/** @type {AttemptMode} */ (examKind ? 'exam' : 'study'))
  const idPrefix = useId()
  const minutes = cert.exam.minutes

  /** @type {Record<AttemptMode, string>} */
  const modeHints = {
    exam: `Timed (${minutes} minutes). See your answers and explanations at the end.`,
    study: 'Untimed. See the answer and explanation after each question.',
  }
  const notice = !examKind
    ? 'Untimed. You’ll see the answer and explanation after each question.'
    : mode === 'exam'
      ? `A ${minutes}-minute timer starts when you begin. The exam submits itself when time runs out.`
      : 'Study mode has no timer.'

  return (
    <>
      <h1 className="text-3xl font-bold">{TEST_KIND_LABELS[kind]}</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">{scope.label}</p>
      <form className="mt-6 max-w-xl space-y-6" onSubmit={(event) => event.preventDefault()}>
        {examKind ? (
          <p>{cert.exam.questions} questions, weighted by domain like the real exam.</p>
        ) : (
          <fieldset>
            <legend className="font-semibold">Number of questions</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {choices.map(({ value, available }) => (
                <label
                  key={value}
                  className={`flex items-center gap-2 rounded border px-3 py-2 ${available ? 'cursor-pointer border-slate-300 dark:border-slate-700' : 'border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400'}`}
                >
                  <input
                    type="radio"
                    name="length"
                    value={value}
                    checked={length === value}
                    disabled={!available}
                    onChange={() => setLength(value)}
                  />
                  {value}
                </label>
              ))}
            </div>
            {choices.some((choice) => !choice.available) && (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Only {scope.poolSize} questions are available here, so longer tests are turned off.
              </p>
            )}
          </fieldset>
        )}

        {examKind && (
          <fieldset>
            <legend className="font-semibold">Mode</legend>
            <div className="mt-2 space-y-3">
              {MODES.map((option) => (
                <div key={option.value}>
                  <label className="flex items-center gap-2 font-medium">
                    <input
                      type="radio"
                      name="mode"
                      value={option.value}
                      checked={mode === option.value}
                      onChange={() => setMode(option.value)}
                      aria-describedby={`${idPrefix}-${option.value}`}
                    />
                    {option.label}
                  </label>
                  <p
                    id={`${idPrefix}-${option.value}`}
                    className="ml-6 text-sm text-slate-600 dark:text-slate-300"
                  >
                    {modeHints[option.value]}
                  </p>
                </div>
              ))}
            </div>
          </fieldset>
        )}

        <p aria-live="polite">{notice}</p>

        <div>
          <button
            type="submit"
            disabled
            aria-describedby={`${idPrefix}-start`}
            className={buttonClass('primary')}
          >
            Start {TEST_KIND_LABELS[kind]}
          </button>
          <p id={`${idPrefix}-start`} className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Starting tests arrives in the next update of this app.
          </p>
        </div>
      </form>
    </>
  )
}
```

- [ ] **Step 4: Rewrite `src/routes/TestSetupPage.jsx`**

```jsx
import { useSearchParams } from 'react-router-dom'
import TestSetupForm from '../components/test/TestSetupForm.jsx'
import { resolveTestScope } from '../engine/testConfig.js'
import { isTestKind } from '../engine/testKinds.js'
import { useCert } from '../hooks/useCert.js'
import NotFoundPage from './NotFoundPage.jsx'

export default function TestSetupPage() {
  const cert = useCert()
  const [searchParams] = useSearchParams()
  const kind = searchParams.get('kind')
  if (!isTestKind(kind)) return <NotFoundPage />
  const scope = resolveTestScope(cert, kind, searchParams.get('scope'))
  if (!scope) return <NotFoundPage />
  // Remount on a new kind or scope so the form's defaults reset.
  return <TestSetupForm key={`${kind}:${scope.scopeId}`} cert={cert} kind={kind} scope={scope} />
}
```

- [ ] **Step 5: Run the tests and watch them pass**

Run (PowerShell): `npm test -- src/routes/TestSetupPage.test.jsx src/router.test.jsx`
Expected: PASS. The router rows `/clf-c02/test/new?kind=diagnostic` → `Diagnostic Exam` and `/aif-c01/test/new?kind=pre&scope=2.1` → `Pre-Test` still pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/test src/routes/TestSetupPage.jsx src/routes/TestSetupPage.test.jsx src/router.test.jsx
git commit -m "feat: test setup page with length and mode choices" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 19: Data helpers for Settings (`resetProgress`, report export)

**Files:**

- Modify: `src/db/backup.js`, `src/db/flags.js`
- Test: `src/db/backup.test.js`, `src/db/flags.test.js`

- [ ] **Step 1: Write the failing tests**

In `src/db/backup.test.js`:

- Change the backup import to `import { BACKUP_FORMAT, BACKUP_VERSION, BackupError, exportBackup, importBackup, resetProgress } from './backup.js'`.
- Add `import { db } from './db.js'` and `import { recordAnswer } from './itemStats.js'`.
- Append:

```js
describe('resetProgress', () => {
  it('clears attempts, answer history and review marks but keeps reports and settings', async () => {
    await createAttempt({
      certId: 'clf-c02',
      kind: 'pre',
      scopeId: 'clf-c02/1.1',
      mode: 'study',
      itemIds: [],
      optionOrder: {},
    })
    await recordAnswer({
      itemId: 'clf-c02-1.1-0001',
      certId: 'clf-c02',
      subdomainId: 'clf-c02/1.1',
      itemVersion: 1,
      correct: true,
      at: 1_000,
    })
    await markReviewComplete('clf-c02', 'clf-c02/1.1')
    await setSetting('k', 1)
    await addFlag({ itemId: 'clf-c02-1.1-0001', itemVersion: 1, certId: 'clf-c02', reason: 'typo' })

    await resetProgress()

    expect(await db.attempts.count()).toBe(0)
    expect(await db.itemStats.count()).toBe(0)
    expect(await listProgressForCert('clf-c02')).toEqual([])
    expect(await listFlags()).toHaveLength(1)
    expect(await getSetting('k', 0)).toBe(1)
  })
})
```

In `src/db/flags.test.js`, change the import to `import { addFlag, buildReportsExport, clearFlags, deleteFlag, FLAG_REASON_LABELS, FLAG_REASONS, listFlags } from './flags.js'` and append inside `describe('flags', …)`:

```js
it('has a label for every reason', () => {
  expect(Object.keys(FLAG_REASON_LABELS).sort()).toEqual([...FLAG_REASONS].sort())
})

it('wraps reports in a versioned export', async () => {
  await addFlag(report(), 1_000)
  const flags = await listFlags()
  expect(buildReportsExport(flags, Date.UTC(2026, 9, 14))).toEqual({
    format: 'awsprep-reports',
    version: 1,
    exportedAt: '2026-10-14T00:00:00.000Z',
    reports: flags,
  })
})
```

- [ ] **Step 2: Run them and watch them fail**

Run (PowerShell): `npm test -- src/db/backup.test.js src/db/flags.test.js`
Expected: FAIL, the new exports are missing.

- [ ] **Step 3: Add `resetProgress` to `src/db/backup.js`**

Append:

```js
/**
 * Deletes learning progress (attempts, answer history, review marks) atomically. Reports and
 * settings are kept.
 */
export async function resetProgress() {
  await db.transaction('rw', [db.attempts, db.itemStats, db.subdomainProgress], async () => {
    await Promise.all([db.attempts.clear(), db.itemStats.clear(), db.subdomainProgress.clear()])
  })
}
```

- [ ] **Step 4: Add labels and the export to `src/db/flags.js`**

After `FLAG_REASONS`, add:

```js
/** @type {Record<FlagReason, string>} */
export const FLAG_REASON_LABELS = {
  'wrong-answer': 'Wrong answer',
  unclear: 'Unclear',
  outdated: 'Outdated',
  typo: 'Typo',
  other: 'Other',
}

export const REPORTS_FORMAT = 'awsprep-reports'
export const REPORTS_VERSION = 1
```

Append at the end of the file:

```js
/**
 * The "My reports" export file: each report carries the item id and version a maintainer
 * needs to find and fix the question.
 * @param {Flag[]} flags
 * @param {number} [now] epoch ms
 */
export function buildReportsExport(flags, now = Date.now()) {
  return {
    format: REPORTS_FORMAT,
    version: REPORTS_VERSION,
    exportedAt: new Date(now).toISOString(),
    reports: flags,
  }
}
```

- [ ] **Step 5: Run the tests and watch them pass**

Run (PowerShell): `npm test -- src/db/backup.test.js src/db/flags.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/db/backup.js src/db/backup.test.js src/db/flags.js src/db/flags.test.js
git commit -m "feat: reset progress and export reports" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 20: Settings — Backup section

**Files:**

- Create: `src/components/settings/BackupSection.jsx`
- Test: `src/components/settings/BackupSection.test.jsx`

- [ ] **Step 1: Write the failing tests**

```jsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BACKUP_FORMAT, exportBackup } from '../../db/backup.js'
import { db } from '../../db/db.js'
import { setSetting } from '../../db/settings.js'
import { downloadJson } from '../../lib/download.js'
import { makeAttempt } from '../../test/factories.js'
import { resetDb } from '../../test/resetDb.js'
import BackupSection from './BackupSection.jsx'

vi.mock('../../lib/download.js', async (importOriginal) => ({
  ...(await importOriginal()),
  downloadJson: vi.fn(),
}))

/** @param {unknown} data */
const jsonFile = (data) =>
  new File([typeof data === 'string' ? data : JSON.stringify(data)], 'backup.json', {
    type: 'application/json',
  })

beforeEach(async () => {
  await resetDb()
  vi.mocked(downloadJson).mockClear()
})

afterEach(() => vi.restoreAllMocks())

describe('BackupSection', () => {
  it('downloads a backup of everything stored', async () => {
    await setSetting('k', 1)
    const user = userEvent.setup()
    render(<BackupSection />)
    await user.click(screen.getByRole('button', { name: 'Download backup' }))
    await waitFor(() => expect(downloadJson).toHaveBeenCalledTimes(1))
    const [name, data] = vi.mocked(downloadJson).mock.calls[0]
    expect(name).toMatch(/^awsprep-backup-\d{4}-\d{2}-\d{2}\.json$/)
    expect(data).toMatchObject({ format: BACKUP_FORMAT, tables: { settings: [{ key: 'k', value: 1 }] } })
    expect(screen.getByRole('status')).toHaveTextContent('Backup downloaded.')
  })

  it('restores a backup after confirmation', async () => {
    await db.attempts.add(makeAttempt({ id: 'from-backup' }))
    const backup = await exportBackup()
    await resetDb()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    render(<BackupSection />)
    await user.upload(screen.getByLabelText('Restore from backup'), jsonFile(backup))
    expect(await screen.findByText('Progress restored from the backup.')).toBeInTheDocument()
    expect(await db.attempts.get('from-backup')).toBeDefined()
  })

  it('leaves data alone when the learner cancels', async () => {
    const backup = await exportBackup()
    await db.attempts.add(makeAttempt({ id: 'keep-me' }))
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    render(<BackupSection />)
    await user.upload(screen.getByLabelText('Restore from backup'), jsonFile(backup))
    await waitFor(() => expect(confirm).toHaveBeenCalled())
    expect(await db.attempts.get('keep-me')).toBeDefined()
  })

  it('rejects files that are not JSON without asking', async () => {
    const confirm = vi.spyOn(window, 'confirm')
    const user = userEvent.setup()
    render(<BackupSection />)
    await user.upload(screen.getByLabelText('Restore from backup'), jsonFile('not json'))
    expect(await screen.findByRole('alert')).toHaveTextContent('The file is not valid JSON.')
    expect(confirm).not.toHaveBeenCalled()
  })

  it('rejects JSON that is not a backup', async () => {
    const user = userEvent.setup()
    render(<BackupSection />)
    await user.upload(screen.getByLabelText('Restore from backup'), jsonFile({ hello: 'world' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This file is not a progress backup from this app.',
    )
  })
})
```

- [ ] **Step 2: Run them and watch them fail**

Run (PowerShell): `npm test -- src/components/settings/BackupSection.test.jsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `src/components/settings/BackupSection.jsx`**

```jsx
import { useId, useState } from 'react'
import { assertValidBackup, BackupError, exportBackup, importBackup } from '../../db/backup.js'
import { downloadJson, fileDateStamp } from '../../lib/download.js'
import { buttonClass } from '../ui/styles.js'

export default function BackupSection() {
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const inputId = useId()

  /** @param {string} text */
  function succeed(text) {
    setError('')
    setStatus(text)
  }

  /** @param {string} text */
  function fail(text) {
    setStatus('')
    setError(text)
  }

  async function handleExport() {
    try {
      downloadJson(`awsprep-backup-${fileDateStamp()}.json`, await exportBackup())
      succeed('Backup downloaded.')
    } catch (cause) {
      console.error('Failed to export backup', cause)
      fail('Couldn’t create the backup. Your browser may be blocking storage.')
    }
  }

  /** @param {import('react').ChangeEvent<HTMLInputElement>} event */
  async function handleImport(event) {
    const input = event.currentTarget
    const file = input.files?.[0]
    input.value = '' // so choosing the same file again still fires onChange
    if (!file) return
    try {
      /** @type {unknown} */
      let parsed
      try {
        parsed = JSON.parse(await file.text())
      } catch {
        throw new BackupError('The file is not valid JSON.')
      }
      assertValidBackup(parsed)
      const confirmed = window.confirm(
        'Replace all progress in this browser with this backup? This can’t be undone.',
      )
      if (!confirmed) return
      await importBackup(parsed)
      succeed('Progress restored from the backup.')
    } catch (cause) {
      if (cause instanceof BackupError) {
        fail(cause.message)
      } else {
        console.error('Failed to import backup', cause)
        fail('Couldn’t restore the backup.')
      }
    }
  }

  return (
    <section aria-labelledby="backup-heading" className="mt-8">
      <h2 id="backup-heading" className="text-xl font-semibold">
        Backup
      </h2>
      <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">
        Your progress lives only in this browser. Download a backup to keep it safe or to move it
        to another device. Restoring a backup replaces everything stored here.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={handleExport} className={buttonClass('primary')}>
          Download backup
        </button>
        <input
          id={inputId}
          type="file"
          accept="application/json,.json"
          onChange={handleImport}
          className="peer sr-only"
        />
        <label
          htmlFor={inputId}
          className={`${buttonClass('secondary')} cursor-pointer peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-amber-500`}
        >
          Restore from backup
        </label>
      </div>
      <p role="status" className="mt-2">
        {status}
      </p>
      {error && (
        <p role="alert" className="mt-2 text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </section>
  )
}
```

- [ ] **Step 4: Run the tests and watch them pass**

Run (PowerShell): `npm test -- src/components/settings/BackupSection.test.jsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/settings/BackupSection.jsx src/components/settings/BackupSection.test.jsx
git commit -m "feat: download and restore progress backups" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 21: Settings — My reports, Reset progress, page composition

**Files:**

- Create: `src/components/settings/ReportsSection.jsx`, `src/components/settings/ResetSection.jsx`
- Modify: `src/routes/SettingsPage.jsx`, `src/routes/SettingsPage.test.jsx`
- Test: `src/components/settings/ReportsSection.test.jsx`, `src/components/settings/ResetSection.test.jsx`

- [ ] **Step 1: Write the failing tests**

`src/components/settings/ReportsSection.test.jsx`:

```jsx
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addFlag } from '../../db/flags.js'
import { downloadJson } from '../../lib/download.js'
import { resetDb } from '../../test/resetDb.js'
import ReportsSection from './ReportsSection.jsx'

vi.mock('../../lib/download.js', async (importOriginal) => ({
  ...(await importOriginal()),
  downloadJson: vi.fn(),
}))

beforeEach(async () => {
  await resetDb()
  vi.mocked(downloadJson).mockClear()
})

describe('ReportsSection', () => {
  it('explains when there are no reports', async () => {
    render(<ReportsSection />)
    expect(await screen.findByText(/haven’t reported any questions/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Export reports' })).not.toBeInTheDocument()
  })

  it('lists, exports and deletes reports', async () => {
    await addFlag(
      {
        itemId: 'clf-c02-1.1-0001',
        itemVersion: 2,
        certId: 'clf-c02',
        reason: 'wrong-answer',
        note: 'B is also right',
      },
      1_000,
    )
    await addFlag(
      { itemId: 'aif-c01-2.1-0003', itemVersion: 1, certId: 'aif-c01', reason: 'typo' },
      2_000,
    )
    const user = userEvent.setup()
    render(<ReportsSection />)
    const list = await screen.findByRole('list', { name: 'Reports' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(list).toHaveTextContent('Wrong answer')
    expect(list).toHaveTextContent('B is also right')

    await user.click(screen.getByRole('button', { name: 'Export reports' }))
    expect(downloadJson).toHaveBeenCalledWith(
      expect.stringMatching(/^awsprep-reports-\d{4}-\d{2}-\d{2}\.json$/),
      expect.objectContaining({
        format: 'awsprep-reports',
        reports: expect.arrayContaining([expect.objectContaining({ itemId: 'clf-c02-1.1-0001' })]),
      }),
    )

    await user.click(screen.getByRole('button', { name: 'Delete report on aif-c01-2.1-0003' }))
    await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(1))
  })
})
```

`src/components/settings/ResetSection.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/db.js'
import { addFlag } from '../../db/flags.js'
import { markReviewComplete } from '../../db/progress.js'
import { makeAttempt } from '../../test/factories.js'
import { resetDb } from '../../test/resetDb.js'
import ResetSection from './ResetSection.jsx'

beforeEach(async () => {
  await resetDb()
  await db.attempts.add(makeAttempt())
  await markReviewComplete('clf-c02', 'clf-c02/1.1')
  await addFlag({ itemId: 'clf-c02-1.1-0001', itemVersion: 1, certId: 'clf-c02', reason: 'typo' })
})

afterEach(() => vi.restoreAllMocks())

describe('ResetSection', () => {
  it('clears progress but keeps reports after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    render(<ResetSection />)
    await user.click(screen.getByRole('button', { name: 'Reset progress' }))
    expect(await screen.findByText('Progress reset.')).toBeInTheDocument()
    expect(await db.attempts.count()).toBe(0)
    expect(await db.subdomainProgress.count()).toBe(0)
    expect(await db.flags.count()).toBe(1)
  })

  it('does nothing when cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    render(<ResetSection />)
    await user.click(screen.getByRole('button', { name: 'Reset progress' }))
    expect(await db.attempts.count()).toBe(1)
    expect(screen.queryByText('Progress reset.')).not.toBeInTheDocument()
  })
})
```

Append to `src/routes/SettingsPage.test.jsx`, inside `describe('SettingsPage', …)`:

```jsx
it('groups backup, reports and reset sections', async () => {
  stubStorage({ persisted: async () => true })
  render(<SettingsPage />)
  for (const name of ['Backup', 'My reports', 'Reset progress']) {
    expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument()
  }
  expect(await screen.findByText(/haven’t reported any questions/)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run them and watch them fail**

Run (PowerShell): `npm test -- src/components/settings src/routes/SettingsPage.test.jsx`
Expected: FAIL, the modules and headings are missing.

- [ ] **Step 3: Implement `src/components/settings/ReportsSection.jsx`**

```jsx
import { useLiveQuery } from 'dexie-react-hooks'
import { buildReportsExport, deleteFlag, FLAG_REASON_LABELS, listFlags } from '../../db/flags.js'
import { downloadJson, fileDateStamp } from '../../lib/download.js'
import { formatDate } from '../../lib/format.js'
import Loading from '../ui/Loading.jsx'
import { buttonClass } from '../ui/styles.js'

export default function ReportsSection() {
  const flags = useLiveQuery(
    () =>
      listFlags().catch((error) => {
        console.error('Failed to read reports', error)
        return []
      }),
    [],
  )

  return (
    <section aria-labelledby="reports-heading" className="mt-8">
      <h2 id="reports-heading" className="text-xl font-semibold">
        My reports
      </h2>
      <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">
        Questions you flagged with “Report issue”. Reports stay in this browser. Export them to
        share with the app’s maintainer.
      </p>
      {flags === undefined ? (
        <Loading label="Loading reports…" />
      ) : flags.length === 0 ? (
        <p className="mt-3">You haven’t reported any questions yet.</p>
      ) : (
        <>
          <button
            type="button"
            onClick={() =>
              downloadJson(`awsprep-reports-${fileDateStamp()}.json`, buildReportsExport(flags))
            }
            className={`${buttonClass('primary')} mt-3`}
          >
            Export reports
          </button>
          <ul aria-label="Reports" className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
            {flags.map((flag) => (
              <li key={flag.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    <code className="text-sm">{flag.itemId}</code> ·{' '}
                    {FLAG_REASON_LABELS[flag.reason]}
                  </p>
                  {flag.note && <p className="mt-1 text-sm break-words">{flag.note}</p>}
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    Reported {formatDate(flag.createdAt)} · question version {flag.itemVersion}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteFlag(flag.id)}
                  aria-label={`Delete report on ${flag.itemId}`}
                  className={buttonClass('secondary')}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
```

- [ ] **Step 4: Implement `src/components/settings/ResetSection.jsx`**

```jsx
import { useState } from 'react'
import { resetProgress } from '../../db/backup.js'
import { buttonClass } from '../ui/styles.js'

export default function ResetSection() {
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  async function handleReset() {
    const confirmed = window.confirm(
      'Delete all test attempts, answer history and review checkmarks in this browser? This can’t be undone.',
    )
    if (!confirmed) return
    try {
      await resetProgress()
      setError('')
      setStatus('Progress reset.')
    } catch (cause) {
      console.error('Failed to reset progress', cause)
      setStatus('')
      setError('Couldn’t reset progress. Your browser may be blocking storage.')
    }
  }

  return (
    <section aria-labelledby="reset-heading" className="mt-8">
      <h2 id="reset-heading" className="text-xl font-semibold">
        Reset progress
      </h2>
      <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">
        Deletes all test attempts, answer history and review checkmarks. Your reports and theme
        are kept. Download a backup first if you might want them back.
      </p>
      <button type="button" onClick={handleReset} className={`${buttonClass('danger')} mt-3`}>
        Reset progress
      </button>
      <p role="status" className="mt-2">
        {status}
      </p>
      {error && (
        <p role="alert" className="mt-2 text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </section>
  )
}
```

- [ ] **Step 5: Compose the sections in `src/routes/SettingsPage.jsx`**

Add the imports:

```jsx
import BackupSection from '../components/settings/BackupSection.jsx'
import ReportsSection from '../components/settings/ReportsSection.jsx'
import ResetSection from '../components/settings/ResetSection.jsx'
```

and render them after the closing `</section>` of the Storage section, before the fragment closes:

```jsx
      <BackupSection />
      <ReportsSection />
      <ResetSection />
```

- [ ] **Step 6: Run the tests and watch them pass**

Run (PowerShell): `npm test -- src/components/settings src/routes/SettingsPage.test.jsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/settings src/routes/SettingsPage.jsx src/routes/SettingsPage.test.jsx
git commit -m "feat: My reports and reset progress in Settings" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 22: End-to-end flow and axe accessibility checks

**Files:**

- Create: `e2e/curriculum.spec.js`, `e2e/a11y.spec.js`

- [ ] **Step 1: Write `e2e/curriculum.spec.js`**

```js
import { expect, test } from '@playwright/test'

const REVIEWED = /^Marked as reviewed on/

test('guided path: dashboard → task → lesson → mark reviewed', async ({ page }) => {
  await page.goto('./#/clf-c02')
  await expect(page.getByRole('heading', { name: 'Recommended next' })).toBeVisible()
  await page.getByRole('link', { name: /^1\.1:/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: /^Task 1\.1:/ })).toBeVisible()

  const path = page.getByRole('list', { name: 'Learning path' })
  await path.getByRole('link', { name: 'Review' }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Define the benefits of the AWS Cloud' }),
  ).toBeVisible()
  await expect(page.locator('.mermaid-diagram svg')).toBeVisible()

  await page.getByRole('button', { name: 'Mark as reviewed' }).click()
  await expect(page.getByText(REVIEWED)).toBeVisible()
  await page.reload()
  await expect(page.getByText(REVIEWED)).toBeVisible()

  await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Task 1.1' }).click()
  const postStep = path.getByRole('listitem').filter({ hasText: 'Check what you learned.' })
  await expect(postStep).toContainText('Recommended next')
  await expect(path).toContainText(/Reviewed /)
})

test('progress survives export, reset and restore', async ({ page }) => {
  await page.goto('./#/clf-c02/s/1.1/review')
  await page.getByRole('button', { name: 'Mark as reviewed' }).click()
  await expect(page.getByText(REVIEWED)).toBeVisible()

  await page.goto('./#/settings')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download backup' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^awsprep-backup-\d{4}-\d{2}-\d{2}\.json$/)
  const backupPath = await download.path()

  page.on('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Reset progress' }).click()
  await expect(page.getByText('Progress reset.')).toBeVisible()

  await page.getByLabel('Restore from backup').setInputFiles(backupPath)
  await expect(page.getByText('Progress restored from the backup.')).toBeVisible()

  await page.goto('./#/clf-c02/s/1.1/review')
  await expect(page.getByText(REVIEWED)).toBeVisible()
})
```

- [ ] **Step 2: Write `e2e/a11y.spec.js`**

```js
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

/** Each page plus a selector that only appears once its async content has rendered. */
const PAGES = [
  // Each Playwright test gets a fresh browser context, so the cards say "Not started yet".
  { name: 'home', url: './', ready: 'text=Not started yet' },
  { name: 'dashboard', url: './#/clf-c02', ready: '#mastery-heading' },
  { name: 'domain', url: './#/clf-c02/d/3', ready: 'ol[aria-labelledby="tasks-heading"]' },
  { name: 'task', url: './#/clf-c02/s/1.1', ready: 'ol[aria-label="Learning path"]' },
  { name: 'lesson', url: './#/clf-c02/s/1.1/review', ready: '.mermaid-diagram svg' },
  { name: 'test setup', url: './#/clf-c02/test/new?kind=diagnostic', ready: 'form' },
  { name: 'settings', url: './#/settings', ready: '#reports-heading' },
]

for (const theme of ['light', 'dark']) {
  for (const { name, url, ready } of PAGES) {
    test(`${name} has no WCAG A/AA violations (${theme} theme)`, async ({ page }) => {
      await page.addInitScript((value) => localStorage.setItem('theme', value), theme)
      await page.goto(url)
      await expect(page.locator(ready).first()).toBeVisible()
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
      expect(results.violations).toEqual([])
    })
  }
}
```

- [ ] **Step 3: Run the E2E suite**

Run (PowerShell): `npm run test:e2e`
Expected: all tests pass. That is the 4 existing tests, 2 curriculum tests and 14 axe tests.

If axe reports violations, fix the cause and don't exclude elements. Likely causes and fixes:
- `color-contrast` inside `.mermaid-diagram`: pass `themeVariables` (for example `primaryTextColor`) to `mermaid.initialize` in `MermaidBlock.jsx` for that theme.
- `scrollable-region-focusable` on `.table-wrap` or `.mermaid-diagram`: let the content wrap instead of scrolling. For example, add `break-words` to table cells, or `max-w-full` to the SVG.
- Contrast on a component's text: switch to the next darker (light theme) or lighter (dark theme) Tailwind step.

Re-run until it is green.

- [ ] **Step 4: Commit**

```bash
git add e2e
git commit -m "test: e2e curriculum flow, backup round-trip and axe checks" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 23: Docs and full verification

**Files:**

- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the status line in `CLAUDE.md`**

Replace:

```
- Phases 1 (app shell, data layer) and 2 (content engine, seed content) are done. Phase 3 (curriculum UI), 4 (exam engine), 5 (deploy), and 6 (bulk content) are not built yet.
```

with:

```
- Phases 1 (app shell, data layer), 2 (content engine, seed content) and 3 (curriculum UI) are done. Phase 4 (exam engine), 5 (deploy), and 6 (bulk content) are not built yet. Until Phase 4, the test setup page's Start button is disabled on purpose.
```

- [ ] **Step 2: Add a curriculum section to `CLAUDE.md`**

Insert this block after the **State.** paragraph and its bullets, before **Routing.**:

```markdown
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
- Table-of-contents links use `focus()` + `scrollIntoView()`, never `#id` navigation (the HashRouter reason as the skip link).
- Confirmations use `window.confirm`, because jsdom has no `<dialog>.showModal`. Tests spy on it.
- `e2e/a11y.spec.js` runs axe (WCAG 2.1 A/AA) on every page in both themes. Fix violations at the source; don't exclude elements.
```

- [ ] **Step 3: Run the full verification**

Run (Bash): `npm run validate:content && npm run lint && npm run typecheck && npm run format:check`
Expected: content passes, and lint, typecheck and format all report no errors.

Run (PowerShell): `npm test`
Expected: all suites pass.

Run (PowerShell): `npm run test:e2e`
Expected: all tests pass.

- [ ] **Step 4: Manual check in the dev server**

Run: `npm run dev`, open http://localhost:5173/SupervisedLearning/ and walk through Home → CLF-C02 → a heatmap cell → Review. Confirm that:
- the diagram renders in both themes (switch the theme in Settings);
- the layout holds at 320 px wide (DevTools device toolbar);
- DevTools Network shows the `mermaid` chunk only after opening a lesson that has a diagram.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document the Phase 3 curriculum UI" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Finish the branch**

Use superpowers:finishing-a-development-branch to open a PR from `phase-3-curriculum` into `phase-1-init`.

---

## Spec coverage check

| Spec Phase 3 item | Task |
| --- | --- |
| 1. Home: cert cards (code, title, item count, overall mastery), disclaimers | 11 |
| 2. Dashboard: domain cards with weight %, heatmap (color + label + icon), CTAs (Diagnostic highlighted when no data), Recommended next | 9, 12 |
| 3. Domain page: 3-step status rows + best Post score, Domain Assessment CTA | 10, 13 |
| 4. `SubdomainStepper`: nothing locked, next step visually primary | 4, 10, 14 |
| 5. Review: Markdown + remark-gfm, lazy theme-aware Mermaid, TOC, Mark as reviewed, Post-Test CTA | 15, 16, 17 |
| 6. Test setup: length pickers, Study/Exam toggle, timer notice | 5, 18 |
| 7. Settings: theme and storage (Phase 1), export/import, My Reports, reset | 19, 20, 21 |
| 8. Responsive ≥ 320 px, keyboard, `aria-live` | throughout; 22, 23 (manual 320 px) |
| `engine/mastery.js` live via `useLiveQuery` | 3, 7 |
| Exit: guided navigation on seed data; RTL for stepper status + heatmap labels; axe in E2E | 9, 10, 14, 22 |
