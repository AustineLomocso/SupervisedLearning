# Phase 4 — Assessment & Exam Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the app usable end to end. A learner can start any test kind, answer questions with instant feedback (Study mode) or exam conditions (Exam mode with a timer), submit, and see results. Progress feeds the Phase 3 mastery heatmap and recommendations.

**Architecture:** Pure engine modules in `src/engine/` (seeded RNG, blueprint allocation, unseen-first selection, drill, grading, scaled score) with no DB access. A thin DB layer (`src/db/session.js`) applies answers and finishing atomically in Dexie transactions. `src/engine/startTest.js` orchestrates selection, shard loading and attempt creation. React components in `src/components/test/` render the runner and explanations. `AttemptPage` is the runner and `ResultsPage` the results. `useAttempt` loads a live attempt plus its items.

**Tech Stack:** React 19, React Router 7 (hash router), Dexie 4 + dexie-react-hooks, Zustand 5, Tailwind 4, react-markdown (already installed), Vitest 5 + RTL, Playwright + @axe-core/playwright.

**Spec:** `docs/superpowers/specs/2026-10-13-aws-cert-review-design.md`, section "Phase 4". **Branch:** `phase-4-exam-engine` (from `phase-1-init`, which contains merged Phases 1–3). Wave 0 is already committed on it: the cert index now carries a `retired` map (`id → "<task>/<shardNo>"`) that `createItemLoader` uses, so retired items stay loadable for old attempts, and the Vitest timeout is 15 s.

---

## Conventions for every task

- Run Vitest **only through the PowerShell tool**: `npm test -- <files>`. From Git Bash it collects 0 tests. Use Bash for git and everything else. Never call `npx vitest` directly (it skips the `build:index` pre-hook).
- Before every commit: `npm run format`, `npm run lint`, `npm run typecheck`, then `git status` to confirm only the task's files are staged.
- Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`, passed as a second `-m`.
- **Worktree agents:** a fresh worktree starts from an old commit. First run `git merge --ff-only phase-4-exam-engine` (the local branch), then `npm ci`.
- JSDoc gotcha: never write the literal text `@typedef {…} Name` inside prose in a comment.
- `oxlint` runs with `--deny-warnings`:
  - A `.jsx` file may export only components, so put constants and helpers in `.js` files.
  - `jsx-a11y` prefers semantic tags over roles: use `<output>` for status text, not `<p role="status">`.
  - `react/exhaustive-deps` is a warning, so any missing dependency fails the lint.
- Never spread react-markdown's `node` prop onto DOM elements.
- Test files and `src/test/` are excluded from `tsc`, so test code needs no type casts.
- Tests that render anything containing `Markdown` and a lesson must `vi.mock('mermaid')`. Question stems and explanations use the inline variant and never draw diagrams, so they don't need the mock.
- Component tests that need items mock `../../content/loadItems.js` and use the fixtures from `src/test/itemFactories.js` (created in Task 5). Avoid depending on real content ids except where a task says so.

## Design decisions (made concrete)

- **Unanswered counts as wrong everywhere.** `finalizeResponses` (Task 5) gives every unanswered item `{ selected: [], correct: false }`, so score, mastery and `itemStats` agree.
- **`itemStats` are written** at lock time in Study mode (same transaction as the response), and for all items together with `submitAttempt` in Exam mode. `finishAttempt` writes `itemStats` only for items that were not already locked, so nothing is counted twice.
- **Scaled score and pass/fail** are shown only for Diagnostic and Full exams (they follow the blueprint). Other kinds show raw % and breakdowns. `result.scaledEstimate` and `passed` are still stored on every attempt.
- **Selection:**
  - Unseen-first within each task: unseen ids are sampled at random, then seen ids by oldest `lastSeenAt`.
  - Pre/Post use one task. Domain spreads the length evenly across the domain's tasks (random starting order). Diagnostic/Full allocate 65 questions across domains by weight (largest remainder), then spread evenly across tasks. Any shortfall is topped up from the rest of the scope.
- **Study and Exam modes:** Pre, Post, Domain and Drill are always `study`. Diagnostic and Full let the learner choose; only `exam` mode gets `deadlineAt`.
- **Resume rules:** the runner redirects a submitted attempt to its results, and results redirect an in-progress attempt to the runner. A timed attempt past its deadline auto-finishes when opened (the Timer calls `onExpire` immediately).
- **Report issue** is an inline form in the explanation (no modal).
- **Keyboard:** A–F and 1–6 choose an option, Enter submits the answer (Study mode only, and only when the focus is not on a button or link), N goes to the next question. Keys are ignored with modifiers or inside text fields.

## File structure

```
src/
├─ engine/
│  ├─ rng.js, blueprint.js, selectItems.js, drill.js          # Wave 1A (Tasks 1–4)
│  ├─ grading.js, scaledScore.js                              # Wave 1B (Tasks 5–6)
│  └─ startTest.js                                            # Wave 2D (Task 9)
├─ db/{itemStats.js, attempts.js}  (modified)                 # Wave 1C (Task 7)
├─ db/session.js                                              # Wave 2D (Task 8)
├─ hooks/useAttempt.js                                        # Wave 2D (Task 10)
├─ test/itemFactories.js                                      # Wave 1B (Task 5)
├─ components/markdown/Markdown.jsx  (inline variant)         # Wave 2E (Task 11)
├─ components/test/
│  ├─ TestSetupForm.jsx (modified)                            # Task 10
│  ├─ words.js, QuestionCard.jsx, OptionList.jsx              # Task 11
│  ├─ OptionRationale.jsx, ReferenceList.jsx,
│  │  ReportIssueForm.jsx, ExplanationPanel.jsx              # Task 12
│  └─ timer.js, Timer.jsx, QuestionNavigator.jsx             # Task 13
├─ routes/AttemptPage.jsx                                     # Wave 3F (Task 14)
├─ routes/ResultsPage.jsx, lib/format.js (+formatDuration)    # Wave 3G (Task 15)
├─ routes/CertDashboardPage.jsx (In progress section)         # Wave 3G (Task 16)
└─ index.css (+ .lesson-inline)                               # Task 11
e2e/{attempt.spec.js, a11y.spec.js (extended)}                # Wave 4 (Task 17)
```

## Waves

- **Wave 0 (done):** branch, retired map, timeout.
- **Wave 1 (parallel, disjoint files):** A = Tasks 1–4, B = Tasks 5–6, C = Task 7.
- **Wave 2 (parallel, after Wave 1 is merged):** D = Tasks 8–10, E = Tasks 11–13.
- **Wave 3 (parallel, after Wave 2 is merged):** F = Task 14, G = Tasks 15–16.
- **Wave 4:** Tasks 17–18.

---

## WAVE 1

### Task 1: Seeded random numbers

**Files:**

- Create: `src/engine/rng.js`
- Test: `src/engine/rng.test.js`

- [ ] **Step 1: Write the failing test `src/engine/rng.test.js`**

```js
import { describe, expect, it } from 'vitest'
import { createRng, randomSeed, shuffle } from './rng.js'

describe('createRng', () => {
  it('repeats the same sequence for the same seed', () => {
    const a = createRng(42)
    const b = createRng(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('differs between seeds', () => {
    expect(createRng(1)()).not.toBe(createRng(2)())
  })

  it('stays within [0, 1)', () => {
    const rng = createRng(7)
    for (let i = 0; i < 1000; i += 1) {
      const value = rng()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})

describe('shuffle', () => {
  const input = Array.from({ length: 20 }, (_, i) => i)

  it('keeps every element and leaves the input untouched', () => {
    const copy = [...input]
    const result = shuffle(createRng(3), input)
    expect([...result].sort((a, b) => a - b)).toEqual(input)
    expect(input).toEqual(copy)
  })

  it('is deterministic for a seed and actually reorders', () => {
    expect(shuffle(createRng(5), input)).toEqual(shuffle(createRng(5), input))
    expect(shuffle(createRng(5), input)).not.toEqual(input)
  })
})

describe('randomSeed', () => {
  it('returns an unsigned 32-bit integer', () => {
    const seed = randomSeed()
    expect(Number.isInteger(seed)).toBe(true)
    expect(seed).toBeGreaterThanOrEqual(0)
    expect(seed).toBeLessThan(2 ** 32)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run (PowerShell): `npm test -- src/engine/rng.test.js`
Expected: FAIL, cannot resolve `./rng.js`.

- [ ] **Step 3: Implement `src/engine/rng.js`**

```js
/**
 * A function returning a pseudo-random number in [0, 1).
 * @typedef {() => number} Rng
 */

/**
 * Small, fast seeded generator (mulberry32). Tests pass a fixed seed so selection is
 * deterministic; the app seeds it with randomSeed().
 * @param {number} seed
 * @returns {Rng}
 */
export function createRng(seed) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** @returns {number} an unsigned 32-bit integer from the browser's secure random source */
export function randomSeed() {
  return crypto.getRandomValues(new Uint32Array(1))[0]
}

/**
 * Fisher–Yates shuffle that returns a new array.
 * @template T
 * @param {Rng} rng
 * @param {readonly T[]} items
 * @returns {T[]}
 */
export function shuffle(rng, items) {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
```

- [ ] **Step 4: Run it and watch it pass**

Run (PowerShell): `npm test -- src/engine/rng.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/rng.js src/engine/rng.test.js
git commit -m "feat: seeded random numbers and shuffle" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Blueprint allocation

**Files:**

- Create: `src/engine/blueprint.js`
- Test: `src/engine/blueprint.test.js`

- [ ] **Step 1: Write the failing test `src/engine/blueprint.test.js`**

```js
import { describe, expect, it } from 'vitest'
import { getCert } from '../content/certs.js'
import { allocateByWeight, spreadEvenly } from './blueprint.js'
import { createRng } from './rng.js'

const weightsOf = (certId) => getCert(certId).domains.map((domain) => domain.weight)

describe('allocateByWeight', () => {
  it('gives the CLF-C02 exam 16/19/22/8 questions per domain', () => {
    expect(allocateByWeight(65, weightsOf('clf-c02'))).toEqual([16, 19, 22, 8])
  })

  it('gives the AIF-C01 exam 13/16/18/9/9 questions per domain', () => {
    expect(allocateByWeight(65, weightsOf('aif-c01'))).toEqual([13, 16, 18, 9, 9])
  })

  it('always adds up to the total', () => {
    for (const total of [1, 7, 10, 33, 65, 100]) {
      const counts = allocateByWeight(total, weightsOf('clf-c02'))
      expect(counts.reduce((a, b) => a + b, 0)).toBe(total)
    }
  })

  it('treats the weights as relative, so they need not sum to 1', () => {
    expect(allocateByWeight(10, [1, 1])).toEqual([5, 5])
    expect(allocateByWeight(10, [3, 1])).toEqual([8, 2])
  })

  it('gives nothing when the total is zero', () => {
    expect(allocateByWeight(0, [0.5, 0.5])).toEqual([0, 0])
  })
})

describe('spreadEvenly', () => {
  it('splits a count as evenly as possible', () => {
    const counts = spreadEvenly(createRng(1), 30, Array(8).fill(100))
    expect(counts.reduce((a, b) => a + b, 0)).toBe(30)
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1)
  })

  it('never exceeds a capacity and hands the rest to the others', () => {
    expect(spreadEvenly(createRng(1), 12, [2, 10, 10])).toEqual([2, 5, 5])
  })

  it('stops at the total capacity', () => {
    expect(spreadEvenly(createRng(1), 50, [3, 4])).toEqual([3, 4])
  })

  it('varies which entries get the extra one between seeds', () => {
    const firsts = new Set()
    for (let seed = 0; seed < 20; seed += 1) {
      firsts.add(spreadEvenly(createRng(seed), 1, [5, 5, 5]).indexOf(1))
    }
    expect(firsts.size).toBeGreaterThan(1)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run (PowerShell): `npm test -- src/engine/blueprint.test.js`
Expected: FAIL, cannot resolve `./blueprint.js`.

- [ ] **Step 3: Implement `src/engine/blueprint.js`**

```js
import { shuffle } from './rng.js'

/** @typedef {import('./rng.js').Rng} Rng */

/**
 * Largest-remainder allocation: whole numbers proportional to `weights` that add up to
 * exactly `total`. Ties go to the earlier entry.
 * @param {number} total
 * @param {number[]} weights relative weights (need not sum to 1)
 * @returns {number[]}
 */
export function allocateByWeight(total, weights) {
  const sum = weights.reduce((a, b) => a + b, 0)
  const exact = weights.map((weight) => (weight / sum) * total)
  const counts = exact.map(Math.floor)
  let left = total - counts.reduce((a, b) => a + b, 0)
  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index)
  for (const { index } of byRemainder) {
    if (left <= 0) break
    counts[index] += 1
    left -= 1
  }
  return counts
}

/**
 * Deals `count` out one at a time across entries, skipping any that are full. The order
 * entries are visited in is shuffled, so the entries that get the extra one vary.
 * @param {Rng} rng
 * @param {number} count
 * @param {number[]} capacities how many each entry can take
 * @returns {number[]} how many each entry gets; sums to min(count, total capacity)
 */
export function spreadEvenly(rng, count, capacities) {
  const counts = capacities.map(() => 0)
  const order = shuffle(
    rng,
    capacities.map((_, index) => index),
  )
  let left = Math.min(
    count,
    capacities.reduce((a, b) => a + b, 0),
  )
  while (left > 0) {
    for (const index of order) {
      if (left <= 0) break
      if (counts[index] < capacities[index]) {
        counts[index] += 1
        left -= 1
      }
    }
  }
  return counts
}
```

- [ ] **Step 4: Run it and watch it pass**

Run (PowerShell): `npm test -- src/engine/blueprint.test.js`
Expected: PASS (9 tests). If the CLF or AIF row fails, print the exact allocation and re-check the remainders by hand (CLF 15.6/19.5/22.1/7.8 → 16/19/22/8); don't tweak the expected numbers.

- [ ] **Step 5: Commit**

```bash
git add src/engine/blueprint.js src/engine/blueprint.test.js
git commit -m "feat: blueprint allocation and even spreading" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Unseen-first selection

**Files:**

- Create: `src/engine/selectItems.js`
- Test: `src/engine/selectItems.test.js`

- [ ] **Step 1: Write the failing test `src/engine/selectItems.test.js`**

```js
import { describe, expect, it } from 'vitest'
import { getCert } from '../content/certs.js'
import { parseItemId } from '../content/ids.js'
import { createRng } from './rng.js'
import { pickUnseenFirst, selectForTest } from './selectItems.js'

/** @param {string} certId @param {number} [perTask] */
function makePools(certId, perTask = 30) {
  const cert = getCert(certId)
  /** @type {Record<string, string[]>} */
  const pools = {}
  for (const domain of cert.domains) {
    for (const sub of domain.subdomains) {
      pools[sub.code] = Array.from(
        { length: perTask },
        (_, i) => `${certId}-${sub.code}-${String(i + 1).padStart(4, '0')}`,
      )
    }
  }
  return pools
}

/** @param {Record<string, number>} seen item id → lastSeenAt */
const statsOf = (seen) =>
  new Map(Object.entries(seen).map(([itemId, lastSeenAt]) => [itemId, { itemId, lastSeenAt }]))

const domainOf = (id) => Number(parseItemId(id).taskCode.split('.')[0])

/** @param {string[]} ids */
function countByDomain(ids) {
  /** @type {Record<number, number>} */
  const counts = {}
  for (const id of ids) counts[domainOf(id)] = (counts[domainOf(id)] ?? 0) + 1
  return counts
}

describe('pickUnseenFirst', () => {
  const ids = Array.from({ length: 10 }, (_, i) => `x-${i}`)

  it('prefers unseen ids', () => {
    const stats = statsOf({ 'x-0': 1, 'x-1': 2, 'x-2': 3 })
    const picked = pickUnseenFirst(createRng(1), ids, 7, stats)
    expect(picked.sort()).toEqual(['x-3', 'x-4', 'x-5', 'x-6', 'x-7', 'x-8', 'x-9'])
  })

  it('then fills with the least recently seen', () => {
    const stats = statsOf(Object.fromEntries(ids.map((id, i) => [id, 100 - i])))
    // Everything is seen; x-9 was seen longest ago (lastSeenAt 91), then x-8, x-7.
    expect(pickUnseenFirst(createRng(1), ids, 3, stats)).toEqual(['x-9', 'x-8', 'x-7'])
  })

  it('never repeats an id and skips excluded ones', () => {
    const picked = pickUnseenFirst(createRng(1), ids, 10, new Map(), new Set(['x-0', 'x-1']))
    expect(new Set(picked).size).toBe(8)
    expect(picked).not.toContain('x-0')
  })

  it('returns fewer when the pool is short', () => {
    expect(pickUnseenFirst(createRng(1), ids, 99, new Map())).toHaveLength(10)
  })
})

describe('selectForTest', () => {
  const clf = getCert('clf-c02')
  const aif = getCert('aif-c01')

  it('picks Pre-Test questions from one task, unseen first', () => {
    const pools = makePools('clf-c02')
    const seen = Object.fromEntries(pools['1.1'].slice(0, 25).map((id, i) => [id, i + 1]))
    const picked = selectForTest({
      rng: createRng(1),
      cert: clf,
      kind: 'pre',
      scopeId: 'clf-c02/1.1',
      length: 10,
      pools,
      stats: statsOf(seen),
    })
    expect(picked).toHaveLength(10)
    expect(new Set(picked).size).toBe(10)
    expect(picked.every((id) => pools['1.1'].includes(id))).toBe(true)
    // 5 unseen (0026–0030) + the 5 least recently seen (0001–0005).
    expect(picked.sort()).toEqual(
      [...pools['1.1'].slice(25), ...pools['1.1'].slice(0, 5)].sort(),
    )
  })

  it('does not repeat Pre-Test questions in the Post-Test while unseen ones remain', () => {
    const pools = makePools('clf-c02', 20)
    const args = { cert: clf, scopeId: 'clf-c02/1.1', length: 10, pools }
    const pre = selectForTest({ rng: createRng(1), kind: 'pre', stats: new Map(), ...args })
    const stats = statsOf(Object.fromEntries(pre.map((id) => [id, 1])))
    const post = selectForTest({ rng: createRng(2), kind: 'post', stats, ...args })
    expect(post.filter((id) => pre.includes(id))).toEqual([])
  })

  it('spreads a Domain Assessment evenly across the domain’s tasks', () => {
    const pools = makePools('clf-c02')
    const picked = selectForTest({
      rng: createRng(1),
      cert: clf,
      kind: 'domain',
      scopeId: 'clf-c02/d3',
      length: 30,
      pools,
      stats: new Map(),
    })
    expect(picked).toHaveLength(30)
    const perTask = {}
    for (const id of picked) perTask[parseItemId(id).taskCode] = (perTask[parseItemId(id).taskCode] ?? 0) + 1
    expect(Object.keys(perTask).sort()).toEqual(['3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8'])
    expect(Math.max(...Object.values(perTask)) - Math.min(...Object.values(perTask))).toBeLessThanOrEqual(1)
  })

  it.each([
    ['clf-c02', clf, { 1: 16, 2: 19, 3: 22, 4: 8 }],
    ['aif-c01', aif, { 1: 13, 2: 16, 3: 18, 4: 9, 5: 9 }],
  ])('follows the %s exam blueprint for a 65-question exam', (certId, cert, expected) => {
    for (const kind of ['diagnostic', 'full']) {
      const picked = selectForTest({
        rng: createRng(9),
        cert,
        kind,
        scopeId: certId,
        length: 65,
        pools: makePools(certId),
        stats: new Map(),
      })
      expect(picked).toHaveLength(65)
      expect(new Set(picked).size).toBe(65)
      expect(countByDomain(picked)).toEqual(expected)
    }
  })

  it('tops up from other domains when one domain cannot fill its share', () => {
    const pools = makePools('clf-c02')
    for (const code of ['4.1', '4.2', '4.3']) pools[code] = pools[code].slice(0, 1)
    const picked = selectForTest({
      rng: createRng(4),
      cert: clf,
      kind: 'full',
      scopeId: 'clf-c02',
      length: 65,
      pools,
      stats: new Map(),
    })
    expect(picked).toHaveLength(65)
    expect(new Set(picked).size).toBe(65)
    expect(countByDomain(picked)[4]).toBe(3)
  })

  it('only returns ids that are in the pools (so retired ids, which are not in them, never appear)', () => {
    const pools = makePools('clf-c02', 12)
    const all = new Set(Object.values(pools).flat())
    const picked = selectForTest({
      rng: createRng(8),
      cert: clf,
      kind: 'full',
      scopeId: 'clf-c02',
      length: 65,
      pools,
      stats: new Map(),
    })
    expect(picked.every((id) => all.has(id))).toBe(true)
  })

  it('is deterministic for a seed', () => {
    const args = { cert: clf, kind: 'full', scopeId: 'clf-c02', length: 65, pools: makePools('clf-c02'), stats: new Map() }
    expect(selectForTest({ rng: createRng(11), ...args })).toEqual(selectForTest({ rng: createRng(11), ...args }))
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run (PowerShell): `npm test -- src/engine/selectItems.test.js`
Expected: FAIL, cannot resolve `./selectItems.js`.

- [ ] **Step 3: Implement `src/engine/selectItems.js`**

```js
import { allocateByWeight, spreadEvenly } from './blueprint.js'
import { shuffle } from './rng.js'
import { isExamKind } from './testConfig.js'

/** @typedef {import('./rng.js').Rng} Rng */
/** @typedef {import('../content/certs.js').CertSummary} CertSummary */
/** @typedef {import('../db/types.js').AttemptKind} AttemptKind */
/** @typedef {import('../db/types.js').ItemStat} ItemStat */
/** @typedef {Record<string, string[]>} Pools active item ids per task code */

/**
 * Picks up to `count` ids, unseen ones first (random order), then seen ones starting with
 * the least recently seen. Never returns duplicates or excluded ids.
 * @param {Rng} rng
 * @param {string[]} ids
 * @param {number} count
 * @param {Map<string, Pick<ItemStat, 'lastSeenAt'>>} stats
 * @param {Set<string>} [exclude]
 * @returns {string[]}
 */
export function pickUnseenFirst(rng, ids, count, stats, exclude = new Set()) {
  const candidates = [...new Set(ids)].filter((id) => !exclude.has(id))
  const unseen = shuffle(
    rng,
    candidates.filter((id) => !stats.has(id)),
  )
  const seen = candidates
    .filter((id) => stats.has(id))
    .sort((a, b) => (stats.get(a)?.lastSeenAt ?? 0) - (stats.get(b)?.lastSeenAt ?? 0))
  return [...unseen, ...seen].slice(0, count)
}

/**
 * Task codes a test draws from, read from its scope id: "<cert>/1.1" (a task),
 * "<cert>/d3" (a domain) or "<cert>" (everything).
 * @param {CertSummary} cert
 * @param {AttemptKind} kind
 * @param {string} scopeId
 * @returns {string[]}
 */
function scopeTasks(cert, kind, scopeId) {
  const key = scopeId.slice(cert.id.length + 1)
  if (kind === 'pre' || kind === 'post') return [key]
  if (kind === 'domain') {
    const domain = cert.domains.find((candidate) => `d${candidate.no}` === key)
    return domain ? domain.subdomains.map((sub) => sub.code) : []
  }
  return cert.domains.flatMap((domain) => domain.subdomains.map((sub) => sub.code))
}

/**
 * Spreads `count` evenly across tasks, unseen-first inside each, skipping ids already chosen.
 * @param {Rng} rng
 * @param {string[]} tasks
 * @param {number} count
 * @param {Pools} pools
 * @param {Map<string, Pick<ItemStat, 'lastSeenAt'>>} stats
 * @param {Set<string>} chosen
 * @returns {string[]}
 */
function pickAcross(rng, tasks, count, pools, stats, chosen) {
  const capacities = tasks.map(
    (task) => (pools[task] ?? []).filter((id) => !chosen.has(id)).length,
  )
  const counts = spreadEvenly(rng, count, capacities)
  return tasks.flatMap((task, i) =>
    pickUnseenFirst(rng, pools[task] ?? [], counts[i], stats, chosen),
  )
}

/**
 * Chooses the questions for a Pre-Test, Post-Test, Domain Assessment, Diagnostic or Full
 * exam. (Weak-Area Drill has its own selector in drill.js.)
 * @param {object} options
 * @param {Rng} options.rng
 * @param {CertSummary} options.cert
 * @param {AttemptKind} options.kind
 * @param {string} options.scopeId
 * @param {number} options.length
 * @param {Pools} options.pools
 * @param {Map<string, Pick<ItemStat, 'lastSeenAt'>>} options.stats
 * @returns {string[]} item ids in presentation order
 */
export function selectForTest({ rng, cert, kind, scopeId, length, pools, stats }) {
  const tasks = scopeTasks(cert, kind, scopeId)
  /** @type {Set<string>} */
  const chosen = new Set()

  if (isExamKind(kind)) {
    const shares = allocateByWeight(
      length,
      cert.domains.map((domain) => domain.weight),
    )
    cert.domains.forEach((domain, i) => {
      const codes = domain.subdomains.map((sub) => sub.code)
      for (const id of pickAcross(rng, codes, shares[i], pools, stats, chosen)) chosen.add(id)
    })
  } else {
    for (const id of pickAcross(rng, tasks, length, pools, stats, chosen)) chosen.add(id)
  }

  // A task or domain with too few questions leaves a gap: fill it from the rest of the scope.
  if (chosen.size < length) {
    for (const id of pickAcross(rng, tasks, length - chosen.size, pools, stats, chosen)) {
      chosen.add(id)
    }
  }
  return shuffle(rng, [...chosen])
}
```

- [ ] **Step 4: Run it and watch it pass**

Run (PowerShell): `npm test -- src/engine/selectItems.test.js`
Expected: PASS. `src/engine/testConfig.js` already exports `isExamKind` (Phase 3). If the 5-unseen + 5-oldest assertion fails, check that `statsOf` stores `lastSeenAt` as the value, with ids 0001–0025 seen at times 1–25.

- [ ] **Step 5: Commit**

```bash
git add src/engine/selectItems.js src/engine/selectItems.test.js
git commit -m "feat: unseen-first question selection with exam blueprint" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Weak-Area Drill selection

**Files:**

- Create: `src/engine/drill.js`
- Test: `src/engine/drill.test.js`

- [ ] **Step 1: Write the failing test `src/engine/drill.test.js`**

```js
import { describe, expect, it } from 'vitest'
import { getCert } from '../content/certs.js'
import { parseItemId } from '../content/ids.js'
import { selectDrill } from './drill.js'
import { createRng } from './rng.js'

const clf = getCert('clf-c02')

/** @param {number} [perTask] */
function makePools(perTask = 30) {
  /** @type {Record<string, string[]>} */
  const pools = {}
  for (const domain of clf.domains) {
    for (const sub of domain.subdomains) {
      pools[sub.code] = Array.from(
        { length: perTask },
        (_, i) => `clf-c02-${sub.code}-${String(i + 1).padStart(4, '0')}`,
      )
    }
  }
  return pools
}

/** @param {Record<string, { lastSeenAt: number, lastCorrect: boolean }>} rows */
const statsOf = (rows) =>
  new Map(Object.entries(rows).map(([itemId, row]) => [itemId, { itemId, ...row }]))

/** @param {number} pct */
const strength = (pct) => ({ answered: 20, correct: pct / 5, pct, band: 'x', lowConfidence: false })

/** @param {Record<string, number>} pctByTask others default to 100 */
function masteryOf(pctByTask) {
  const map = new Map()
  for (const domain of clf.domains) {
    for (const sub of domain.subdomains) map.set(sub.id, strength(pctByTask[sub.code] ?? 100))
  }
  return map
}

const taskOf = (id) => parseItemId(id).taskCode

describe('selectDrill', () => {
  it('takes about half from previously missed questions', () => {
    const pools = makePools()
    const missed = pools['2.1'].slice(0, 12)
    const stats = statsOf(Object.fromEntries(missed.map((id) => [id, { lastSeenAt: 1, lastCorrect: false }])))
    const picked = selectDrill({
      rng: createRng(1),
      cert: clf,
      length: 10,
      pools,
      stats,
      mastery: masteryOf({}),
    })
    expect(picked).toHaveLength(10)
    expect(new Set(picked).size).toBe(10)
    expect(picked.filter((id) => missed.includes(id))).toHaveLength(5)
  })

  it('uses fewer missed questions when fewer exist and fills from weak areas', () => {
    const pools = makePools()
    const missed = pools['2.1'].slice(0, 2)
    const stats = statsOf(Object.fromEntries(missed.map((id) => [id, { lastSeenAt: 1, lastCorrect: false }])))
    const picked = selectDrill({
      rng: createRng(1),
      cert: clf,
      length: 10,
      pools,
      stats,
      mastery: masteryOf({ '1.1': 0 }),
    })
    expect(picked.filter((id) => missed.includes(id))).toHaveLength(2)
    expect(picked.filter((id) => taskOf(id) === '1.1')).toHaveLength(8)
  })

  it('focuses the rest on the weakest task', () => {
    const picked = selectDrill({
      rng: createRng(2),
      cert: clf,
      length: 10,
      pools: makePools(),
      stats: new Map(),
      mastery: masteryOf({ '3.4': 0 }),
    })
    expect(picked.every((id) => taskOf(id) === '3.4')).toBe(true)
  })

  it('treats a task with no answers as the weakest', () => {
    const mastery = masteryOf({})
    mastery.delete('clf-c02/2.3')
    const picked = selectDrill({
      rng: createRng(2),
      cert: clf,
      length: 10,
      pools: makePools(),
      stats: new Map(),
      mastery,
    })
    expect(picked.every((id) => taskOf(id) === '2.3')).toBe(true)
  })

  it('falls back to domain weights when everything is mastered', () => {
    const picked = selectDrill({
      rng: createRng(3),
      cert: clf,
      length: 20,
      pools: makePools(),
      stats: new Map(),
      mastery: masteryOf({}),
    })
    expect(picked).toHaveLength(20)
    expect(new Set(picked).size).toBe(20)
  })

  it('tops up from other tasks when the weakest has too few questions', () => {
    const pools = makePools()
    pools['1.1'] = pools['1.1'].slice(0, 3)
    const picked = selectDrill({
      rng: createRng(5),
      cert: clf,
      length: 10,
      pools,
      stats: new Map(),
      mastery: masteryOf({ '1.1': 0 }),
    })
    expect(picked).toHaveLength(10)
    expect(picked.filter((id) => taskOf(id) === '1.1')).toHaveLength(3)
  })

  it('is deterministic for a seed', () => {
    const args = { cert: clf, length: 10, pools: makePools(), stats: new Map(), mastery: masteryOf({ '4.1': 10 }) }
    expect(selectDrill({ rng: createRng(7), ...args })).toEqual(selectDrill({ rng: createRng(7), ...args }))
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run (PowerShell): `npm test -- src/engine/drill.test.js`
Expected: FAIL, cannot resolve `./drill.js`.

- [ ] **Step 3: Implement `src/engine/drill.js`**

```js
import { allocateByWeight } from './blueprint.js'
import { shuffle } from './rng.js'
import { pickUnseenFirst } from './selectItems.js'

/** @typedef {import('./rng.js').Rng} Rng */
/** @typedef {import('../content/certs.js').CertSummary} CertSummary */
/** @typedef {import('../db/types.js').ItemStat} ItemStat */
/** @typedef {import('./mastery.js').Mastery} Mastery */

/**
 * Weak-Area Drill: about half previously missed questions, the rest drawn from the weakest
 * tasks in proportion to (1 − mastery) × domain weight. A task with no answers counts as 0%.
 * @param {object} options
 * @param {Rng} options.rng
 * @param {CertSummary} options.cert
 * @param {number} options.length
 * @param {Record<string, string[]>} options.pools active item ids per task code
 * @param {Map<string, ItemStat>} options.stats
 * @param {Map<string, Mastery>} options.mastery keyed by sub-domain id
 * @returns {string[]} item ids in presentation order
 */
export function selectDrill({ rng, cert, length, pools, stats, mastery }) {
  const tasks = cert.domains.flatMap((domain) =>
    domain.subdomains.map((sub) => ({ sub, domain })),
  )
  /** @type {Set<string>} */
  const chosen = new Set()

  const missed = shuffle(
    rng,
    tasks.flatMap(({ sub }) =>
      (pools[sub.code] ?? []).filter((id) => stats.get(id)?.lastCorrect === false),
    ),
  )
  for (const id of missed.slice(0, Math.ceil(length / 2))) chosen.add(id)

  const priorities = tasks.map(
    ({ sub, domain }) => (1 - (mastery.get(sub.id)?.pct ?? 0) / 100) * domain.weight,
  )
  // Everything mastered: fall back to plain domain weights so the drill still has a spread.
  const weights = priorities.some((value) => value > 0)
    ? priorities
    : tasks.map(({ domain }) => domain.weight)

  const shares = allocateByWeight(length - chosen.size, weights)
  tasks.forEach(({ sub }, i) => {
    for (const id of pickUnseenFirst(rng, pools[sub.code] ?? [], shares[i], stats, chosen)) {
      chosen.add(id)
    }
  })

  // A weak task with too few questions leaves a gap: fill it, weakest tasks first.
  if (chosen.size < length) {
    const byPriority = tasks.map((_, i) => i).sort((a, b) => weights[b] - weights[a])
    for (const i of byPriority) {
      if (chosen.size >= length) break
      const more = pickUnseenFirst(
        rng,
        pools[tasks[i].sub.code] ?? [],
        length - chosen.size,
        stats,
        chosen,
      )
      for (const id of more) chosen.add(id)
    }
  }
  return shuffle(rng, [...chosen])
}
```

- [ ] **Step 4: Run it and watch it pass**

Run (PowerShell): `npm test -- src/engine/drill.test.js`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/drill.js src/engine/drill.test.js
git commit -m "feat: weak-area drill selection" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Item test fixtures and grading

**Files:**

- Create: `src/test/itemFactories.js`, `src/engine/grading.js`
- Test: `src/engine/grading.test.js`

- [ ] **Step 1: Create the shared fixtures `src/test/itemFactories.js`**

```js
/** @typedef {import('../content/types.js').LoadedItem} LoadedItem */

/**
 * A single-answer item (correct option: "a"), tagged as the loader would.
 * @param {Partial<LoadedItem>} [overrides]
 * @returns {LoadedItem}
 */
export function makeItem(overrides = {}) {
  return {
    id: 'clf-c02-1.1-0001',
    version: 1,
    type: 'single',
    selectCount: 1,
    difficulty: 2,
    stem: 'Which AWS service provides object storage with 11 nines of durability?',
    options: [
      { id: 'a', text: 'Amazon S3', correct: true, rationale: 'S3 is AWS object storage.' },
      { id: 'b', text: 'Amazon EBS', correct: false, rationale: 'EBS is block storage for EC2.' },
      { id: 'c', text: 'Amazon EC2', correct: false, rationale: 'EC2 provides compute capacity.' },
      { id: 'd', text: 'Amazon RDS', correct: false, rationale: 'RDS is a managed database.' },
    ],
    explanation: 'Amazon S3 stores objects in buckets and is designed for 11 nines of durability.',
    references: [{ title: 'What is Amazon S3?', url: 'https://docs.aws.amazon.com/s3/' }],
    certId: 'clf-c02',
    taskCode: '1.1',
    ...overrides,
  }
}

/**
 * A "choose two" item (correct options: "a" and "c").
 * @param {Partial<LoadedItem>} [overrides]
 * @returns {LoadedItem}
 */
export function makeMultiItem(overrides = {}) {
  return makeItem({
    id: 'clf-c02-1.1-0002',
    type: 'multiple',
    selectCount: 2,
    stem: 'Which TWO are benefits of cloud computing? (Choose TWO.)',
    options: [
      { id: 'a', text: 'Pay-as-you-go pricing', correct: true, rationale: 'You pay only for use.' },
      { id: 'b', text: 'Buying servers up front', correct: false, rationale: 'That is on-premises.' },
      { id: 'c', text: 'Elastic capacity', correct: true, rationale: 'Scale up and down on demand.' },
      { id: 'd', text: 'Fixed capacity', correct: false, rationale: 'The cloud is not fixed.' },
      { id: 'e', text: 'Manual patching of hardware', correct: false, rationale: 'AWS runs hardware.' },
    ],
    ...overrides,
  })
}
```

- [ ] **Step 2: Write the failing test `src/engine/grading.test.js`**

```js
import { describe, expect, it } from 'vitest'
import { makeItem, makeMultiItem } from '../test/itemFactories.js'
import { buildResult, finalizeResponses, isCorrect, scoreAttempt } from './grading.js'

const response = (selected, extra = {}) => ({
  selected,
  submitted: true,
  correct: null,
  markedForReview: false,
  answeredAt: 5,
  ...extra,
})

describe('isCorrect', () => {
  it('accepts the right single answer and rejects a wrong or empty one', () => {
    const item = makeItem()
    expect(isCorrect(item, ['a'])).toBe(true)
    expect(isCorrect(item, ['b'])).toBe(false)
    expect(isCorrect(item, [])).toBe(false)
  })

  it('is all-or-nothing for multiple response', () => {
    const item = makeMultiItem()
    expect(isCorrect(item, ['a', 'c'])).toBe(true)
    expect(isCorrect(item, ['c', 'a'])).toBe(true)
    expect(isCorrect(item, ['a'])).toBe(false)
    expect(isCorrect(item, ['a', 'b'])).toBe(false)
    expect(isCorrect(item, ['a', 'c', 'd'])).toBe(false)
    expect(isCorrect(item, [])).toBe(false)
  })

  it('ignores duplicate ids in the selection', () => {
    expect(isCorrect(makeMultiItem(), ['a', 'a'])).toBe(false)
    expect(isCorrect(makeMultiItem(), ['a', 'c', 'c'])).toBe(true)
  })
})

describe('finalizeResponses', () => {
  const single = makeItem({ id: 'clf-c02-1.1-0001' })
  const multi = makeMultiItem({ id: 'clf-c02-2.1-0002', taskCode: '2.1' })
  const skipped = makeItem({ id: 'clf-c02-3.1-0003', taskCode: '3.1' })

  it('grades answers, keeps marks, and treats unanswered questions as wrong', () => {
    const result = finalizeResponses(
      [single, multi, skipped],
      {
        [single.id]: response(['a'], { markedForReview: true, answeredAt: 11 }),
        [multi.id]: response(['a', 'b']),
      },
      99,
    )
    expect(result[single.id]).toEqual({
      selected: ['a'],
      submitted: true,
      correct: true,
      markedForReview: true,
      answeredAt: 11,
    })
    expect(result[multi.id].correct).toBe(false)
    expect(result[skipped.id]).toEqual({
      selected: [],
      submitted: true,
      correct: false,
      markedForReview: false,
      answeredAt: 99,
    })
  })

  it('gives a deselected exam answer a timestamp so mastery can count it', () => {
    const result = finalizeResponses([single], { [single.id]: response([], { answeredAt: null }) }, 50)
    expect(result[single.id].answeredAt).toBe(50)
  })
})

describe('scoreAttempt', () => {
  const ids = ['clf-c02-1.1-0001', 'clf-c02-1.2-0002', 'clf-c02-2.1-0003', 'clf-c02-2.1-0004']

  it('counts right answers overall and by domain and sub-domain', () => {
    const responses = {
      'clf-c02-1.1-0001': response(['a'], { correct: true }),
      'clf-c02-1.2-0002': response(['b'], { correct: false }),
      'clf-c02-2.1-0003': response(['a'], { correct: true }),
    }
    expect(scoreAttempt(ids, responses)).toEqual({
      correct: 2,
      total: 4,
      pct: 50,
      byDomain: {
        'clf-c02/d1': { correct: 1, total: 2 },
        'clf-c02/d2': { correct: 1, total: 2 },
      },
      bySubdomain: {
        'clf-c02/1.1': { correct: 1, total: 1 },
        'clf-c02/1.2': { correct: 0, total: 1 },
        'clf-c02/2.1': { correct: 1, total: 2 },
      },
    })
  })

  it('scores an empty attempt as 0%', () => {
    expect(scoreAttempt([], {}).pct).toBe(0)
  })
})

describe('buildResult', () => {
  it('adds the scaled estimate and pass flag', () => {
    const ids = Array.from({ length: 10 }, (_, i) => `clf-c02-1.1-${String(i + 1).padStart(4, '0')}`)
    const responses = Object.fromEntries(
      ids.map((id, i) => [id, response(['a'], { correct: i < 7 })]),
    )
    const result = buildResult(ids, responses)
    expect(result).toMatchObject({ correct: 7, total: 10, pct: 70, scaledEstimate: 700, passed: true })
    const worse = buildResult(ids, { ...responses, [ids[0]]: response(['b'], { correct: false }) })
    expect(worse).toMatchObject({ pct: 60, passed: false })
  })
})
```

- [ ] **Step 3: Run it and watch it fail**

Run (PowerShell): `npm test -- src/engine/grading.test.js`
Expected: FAIL, cannot resolve `./grading.js` (and `./scaledScore.js` once you add `buildResult`; implement Task 6 right after this task, then return here).

- [ ] **Step 4: Implement `src/engine/grading.js`**

```js
import { domainId, parseItemId, subdomainId } from '../content/ids.js'
import { scaledScoreEstimate } from './scaledScore.js'

/** @typedef {import('../content/types.js').LoadedItem} LoadedItem */
/** @typedef {import('../db/types.js').ItemResponse} ItemResponse */
/** @typedef {import('../db/types.js').AttemptResult} AttemptResult */
/** @typedef {import('../db/types.js').Tally} Tally */

/**
 * Exact set match. Multiple-response questions are all-or-nothing: a subset, a superset or
 * any wrong choice is incorrect.
 * @param {Pick<LoadedItem, 'options'>} item
 * @param {string[]} selected option ids the learner chose
 * @returns {boolean}
 */
export function isCorrect(item, selected) {
  const right = item.options.filter((option) => option.correct).map((option) => option.id)
  const chosen = new Set(selected)
  return chosen.size === right.length && right.every((id) => chosen.has(id))
}

/**
 * The final response for every item when an attempt ends. Unanswered items become wrong
 * answers (selected: []), so score, mastery and answer history all agree.
 * @param {Pick<LoadedItem, 'id' | 'options'>[]} items
 * @param {Record<string, ItemResponse>} responses what the learner saved so far
 * @param {number} now epoch ms, used as the answer time for unanswered items
 * @returns {Record<string, ItemResponse>}
 */
export function finalizeResponses(items, responses, now) {
  /** @type {Record<string, ItemResponse>} */
  const result = {}
  for (const item of items) {
    const previous = responses[item.id]
    const selected = previous?.selected ?? []
    result[item.id] = {
      selected,
      submitted: true,
      correct: isCorrect(item, selected),
      markedForReview: previous?.markedForReview ?? false,
      answeredAt: previous?.answeredAt ?? now,
    }
  }
  return result
}

/**
 * @param {Record<string, Tally>} tallies
 * @param {string} key
 * @param {boolean} right
 */
function tally(tallies, key, right) {
  const entry = (tallies[key] ??= { correct: 0, total: 0 })
  entry.total += 1
  if (right) entry.correct += 1
}

/**
 * Raw score with per-domain and per-sub-domain breakdowns. Items without a graded answer
 * count as wrong.
 * @param {string[]} itemIds every item in the attempt
 * @param {Record<string, ItemResponse>} responses
 * @returns {Pick<AttemptResult, 'correct' | 'total' | 'pct' | 'byDomain' | 'bySubdomain'>}
 */
export function scoreAttempt(itemIds, responses) {
  /** @type {Record<string, Tally>} */
  const byDomain = {}
  /** @type {Record<string, Tally>} */
  const bySubdomain = {}
  let correct = 0
  for (const id of itemIds) {
    const right = responses[id]?.correct === true
    if (right) correct += 1
    const parsed = parseItemId(id)
    if (!parsed) continue
    tally(bySubdomain, subdomainId(parsed.certId, parsed.taskCode), right)
    tally(byDomain, domainId(parsed.certId, parsed.taskCode.split('.')[0]), right)
  }
  const total = itemIds.length
  return {
    correct,
    total,
    pct: total === 0 ? 0 : Math.round((correct / total) * 100),
    byDomain,
    bySubdomain,
  }
}

/**
 * The full stored result: score, breakdowns, scaled estimate and pass flag.
 * @param {string[]} itemIds
 * @param {Record<string, ItemResponse>} responses
 * @param {number} [passScaled] scaled score needed to pass
 * @returns {AttemptResult}
 */
export function buildResult(itemIds, responses, passScaled = 700) {
  const score = scoreAttempt(itemIds, responses)
  const scaledEstimate = scaledScoreEstimate(score.pct)
  return { ...score, scaledEstimate, passed: scaledEstimate >= passScaled }
}
```

- [ ] **Step 5: Do Task 6, then run the tests and watch them pass**

Run (PowerShell): `npm test -- src/engine/grading.test.js src/engine/scaledScore.test.js`
Expected: PASS.

- [ ] **Step 6: Commit (after Task 6's file exists, as one commit per task is fine: commit Task 5 files once Task 6 is done, or commit both together)**

```bash
git add src/test/itemFactories.js src/engine/grading.js src/engine/grading.test.js
git commit -m "feat: grading, scoring and item test fixtures" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Scaled score estimate

**Files:**

- Create: `src/engine/scaledScore.js`
- Test: `src/engine/scaledScore.test.js`

Do this task **before** committing Task 5, since `grading.js` imports it.

- [ ] **Step 1: Write the failing test `src/engine/scaledScore.test.js`**

```js
import { describe, expect, it } from 'vitest'
import { PASS_SCALED, scaledScoreEstimate } from './scaledScore.js'

describe('scaledScoreEstimate', () => {
  it.each([
    [0, 100],
    [35, 400],
    [70, 700],
    [85, 850],
    [100, 1000],
  ])('%s%% scales to %s', (pct, scaled) => {
    expect(scaledScoreEstimate(pct)).toBe(scaled)
  })

  it('clamps out-of-range percentages', () => {
    expect(scaledScoreEstimate(-5)).toBe(100)
    expect(scaledScoreEstimate(130)).toBe(1000)
  })

  it('puts 69% just under the pass mark', () => {
    expect(scaledScoreEstimate(69)).toBeLessThan(PASS_SCALED)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run (PowerShell): `npm test -- src/engine/scaledScore.test.js`
Expected: FAIL, cannot resolve `./scaledScore.js`.

- [ ] **Step 3: Implement `src/engine/scaledScore.js`**

```js
/** AWS passes at a scaled score of 700 (the real mapping is not public). */
export const PASS_SCALED = 700

/**
 * A rough estimate of the AWS scaled score, piecewise linear: 0% → 100, 70% → 700,
 * 100% → 1000. Always shown to learners as an estimate.
 * @param {number} pct percent correct, 0–100
 * @returns {number} 100–1000
 */
export function scaledScoreEstimate(pct) {
  const clamped = Math.min(100, Math.max(0, pct))
  const scaled =
    clamped <= 70 ? 100 + (clamped / 70) * 600 : 700 + ((clamped - 70) / 30) * 300
  return Math.round(scaled)
}
```

- [ ] **Step 4: Run it and watch it pass**

Run (PowerShell): `npm test -- src/engine/scaledScore.test.js src/engine/grading.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/scaledScore.js src/engine/scaledScore.test.js
git commit -m "feat: estimated scaled score" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Answer history and attempt helpers

**Files:**

- Modify: `src/db/itemStats.js`, `src/db/attempts.js`
- Test: `src/db/itemStats.test.js`, `src/db/attempts.test.js`

- [ ] **Step 1: Write the failing tests**

Add these imports at the top of `src/db/itemStats.test.js` (keep the existing ones; add only what is missing): `import { db } from './db.js'` and `recordAnswers` to the `./itemStats.js` import. Append inside the file (as a new `describe`):

```js
describe('recordAnswers', () => {
  /** @param {string} itemId @param {boolean} correct @param {number} at */
  const answer = (itemId, correct, at) => ({
    itemId,
    certId: 'clf-c02',
    subdomainId: 'clf-c02/1.1',
    itemVersion: 1,
    correct,
    at,
  })

  it('records a batch in one go', async () => {
    await recordAnswers([answer('clf-c02-1.1-0001', true, 10), answer('clf-c02-1.1-0002', false, 20)])
    const rows = await db.itemStats.toArray()
    expect(rows.map((row) => [row.itemId, row.seenCount, row.lastCorrect]).sort()).toEqual([
      ['clf-c02-1.1-0001', 1, true],
      ['clf-c02-1.1-0002', 1, false],
    ])
  })

  it('counts the same item twice when it repeats in a batch', async () => {
    await recordAnswers([answer('clf-c02-1.1-0001', true, 10), answer('clf-c02-1.1-0001', false, 20)])
    expect(await db.itemStats.get('clf-c02-1.1-0001')).toMatchObject({
      seenCount: 2,
      correctCount: 1,
      lastSeenAt: 20,
      lastCorrect: false,
    })
  })

  it('rolls back with an enclosing transaction', async () => {
    await expect(
      db.transaction('rw', [db.attempts, db.itemStats], async () => {
        await recordAnswers([answer('clf-c02-1.1-0001', true, 10)])
        throw new Error('abort')
      }),
    ).rejects.toThrow('abort')
    expect(await db.itemStats.count()).toBe(0)
  })
})
```

In `src/db/attempts.test.js`, add `deleteAttempt` and `saveCurrentIndex` to the `./attempts.js` import (and `db` from `./db.js` if missing), then append:

```js
describe('deleteAttempt', () => {
  it('removes the attempt', async () => {
    const attempt = await createAttempt({
      certId: 'clf-c02',
      kind: 'pre',
      scopeId: 'clf-c02/1.1',
      mode: 'study',
      itemIds: ['clf-c02-1.1-0001'],
      optionOrder: {},
    })
    await deleteAttempt(attempt.id)
    expect(await getAttempt(attempt.id)).toBeUndefined()
  })
})

describe('saveCurrentIndex', () => {
  it('remembers where the learner is', async () => {
    const attempt = await createAttempt({
      certId: 'clf-c02',
      kind: 'pre',
      scopeId: 'clf-c02/1.1',
      mode: 'study',
      itemIds: ['clf-c02-1.1-0001', 'clf-c02-1.1-0002'],
      optionOrder: {},
    })
    await saveCurrentIndex(attempt.id, 1)
    expect((await getAttempt(attempt.id))?.currentIndex).toBe(1)
  })

  it('complains about an unknown attempt', async () => {
    await expect(saveCurrentIndex('missing', 1)).rejects.toThrow('Attempt not found')
  })
})
```

- [ ] **Step 2: Run them and watch them fail**

Run (PowerShell): `npm test -- src/db/itemStats.test.js src/db/attempts.test.js`
Expected: FAIL, the new exports are missing.

- [ ] **Step 3: Implement in `src/db/itemStats.js`**

Replace the existing `recordAnswer` function (and its doc comment) with:

```js
/**
 * Updates per-item history used for unseen-first selection and mastery. Safe to call inside
 * an enclosing transaction that includes `itemStats` (Dexie joins it), which is how a Study
 * mode answer is saved together with its history.
 * @param {RecordedAnswer[]} answers
 */
export async function recordAnswers(answers) {
  await db.transaction('rw', db.itemStats, async () => {
    for (const answer of answers) {
      const existing = await db.itemStats.get(answer.itemId)
      await db.itemStats.put({
        itemId: answer.itemId,
        certId: answer.certId,
        subdomainId: answer.subdomainId,
        itemVersion: answer.itemVersion,
        seenCount: (existing?.seenCount ?? 0) + 1,
        correctCount: (existing?.correctCount ?? 0) + (answer.correct ? 1 : 0),
        lastSeenAt: answer.at,
        lastCorrect: answer.correct,
      })
    }
  })
}

/**
 * @param {RecordedAnswer} answer
 */
export function recordAnswer(answer) {
  return recordAnswers([answer])
}
```

- [ ] **Step 4: Implement in `src/db/attempts.js`**

Append:

```js
/**
 * Remembers which question the learner is on (the answers themselves go through
 * saveResponse). A plain update is safe here: "currentIndex" has no dots.
 * @param {string} attemptId
 * @param {number} currentIndex
 */
export async function saveCurrentIndex(attemptId, currentIndex) {
  const count = await db.attempts.update(attemptId, { currentIndex })
  if (count === 0) throw new Error(`Attempt not found: ${attemptId}`)
}

/**
 * Discards an attempt (the dashboard's "Discard" for an unfinished test).
 * @param {string} attemptId
 */
export async function deleteAttempt(attemptId) {
  await db.attempts.delete(attemptId)
}
```

- [ ] **Step 5: Run them and watch them pass**

Run (PowerShell): `npm test -- src/db`
Expected: PASS, including all the existing db tests.

- [ ] **Step 6: Commit**

```bash
git add src/db/itemStats.js src/db/itemStats.test.js src/db/attempts.js src/db/attempts.test.js
git commit -m "feat: batch answer history, current index and attempt deletion" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
## WAVE 2 (start after Wave 1 is merged into `phase-4-exam-engine`)

### Task 8: Saving answers and finishing an attempt

**Files:**

- Create: `src/db/session.js`
- Test: `src/db/session.test.js`

- [ ] **Step 1: Write the failing test `src/db/session.test.js`**

```js
import { beforeEach, describe, expect, it } from 'vitest'
import { makeItem, makeMultiItem } from '../test/itemFactories.js'
import { resetDb } from '../test/resetDb.js'
import { createAttempt, getAttempt } from './attempts.js'
import { db } from './db.js'
import { finishAttempt, lockAnswer, saveSelection, toggleMarked } from './session.js'

beforeEach(resetDb)

const single = makeItem({ id: 'clf-c02-1.1-0001', taskCode: '1.1' })
const multi = makeMultiItem({ id: 'clf-c02-1.1-0002', taskCode: '1.1' })
const other = makeItem({ id: 'clf-c02-2.1-0003', taskCode: '2.1' })
const ITEMS = [single, multi, other]

/** @param {'study' | 'exam'} [mode] */
function start(mode = 'study') {
  return createAttempt({
    certId: 'clf-c02',
    kind: 'pre',
    scopeId: 'clf-c02/1.1',
    mode,
    itemIds: ITEMS.map((item) => item.id),
    optionOrder: {},
  })
}

describe('lockAnswer', () => {
  it('grades the answer, saves it and records the item history together', async () => {
    const attempt = await start()
    const response = await lockAnswer(attempt.id, single, ['a'], 0, 1_000)
    expect(response).toEqual({
      selected: ['a'],
      submitted: true,
      correct: true,
      markedForReview: false,
      answeredAt: 1_000,
    })
    expect((await getAttempt(attempt.id))?.responses[single.id]).toEqual(response)
    expect(await db.itemStats.get(single.id)).toMatchObject({
      seenCount: 1,
      correctCount: 1,
      lastCorrect: true,
      subdomainId: 'clf-c02/1.1',
      lastSeenAt: 1_000,
    })
  })

  it('records a wrong answer as wrong', async () => {
    const attempt = await start()
    await lockAnswer(attempt.id, multi, ['a', 'b'], 1, 2_000)
    expect(await db.itemStats.get(multi.id)).toMatchObject({ correctCount: 0, lastCorrect: false })
  })

  it('remembers the question the learner is on', async () => {
    const attempt = await start()
    await lockAnswer(attempt.id, multi, ['a', 'c'], 1, 2_000)
    expect((await getAttempt(attempt.id))?.currentIndex).toBe(1)
  })

  it('ignores a second answer to the same question, so history is not counted twice', async () => {
    const attempt = await start()
    await lockAnswer(attempt.id, single, ['a'], 0, 1_000)
    const again = await lockAnswer(attempt.id, single, ['b'], 0, 2_000)
    expect(again.selected).toEqual(['a'])
    expect((await db.itemStats.get(single.id))?.seenCount).toBe(1)
  })

  it('rejects an unknown attempt', async () => {
    await expect(lockAnswer('missing', single, ['a'], 0)).rejects.toThrow('Attempt not found')
  })
})

describe('saveSelection', () => {
  it('stores a changeable, ungraded selection without touching history', async () => {
    const attempt = await start('exam')
    await saveSelection(attempt.id, single, ['b'], 0, 1_000)
    await saveSelection(attempt.id, single, ['a'], 0, 2_000)
    expect((await getAttempt(attempt.id))?.responses[single.id]).toEqual({
      selected: ['a'],
      submitted: false,
      correct: null,
      markedForReview: false,
      answeredAt: 2_000,
    })
    expect(await db.itemStats.count()).toBe(0)
  })

  it('has no answer time once the selection is cleared', async () => {
    const attempt = await start('exam')
    await saveSelection(attempt.id, single, ['a'], 0, 1_000)
    await saveSelection(attempt.id, single, [], 0, 2_000)
    expect((await getAttempt(attempt.id))?.responses[single.id].answeredAt).toBeNull()
  })
})

describe('toggleMarked', () => {
  it('flips the mark and keeps the selection', async () => {
    const attempt = await start('exam')
    await saveSelection(attempt.id, single, ['a'], 0, 1_000)
    await toggleMarked(attempt.id, single.id, 0)
    expect((await getAttempt(attempt.id))?.responses[single.id]).toMatchObject({
      selected: ['a'],
      markedForReview: true,
    })
    await toggleMarked(attempt.id, single.id, 0)
    expect((await getAttempt(attempt.id))?.responses[single.id].markedForReview).toBe(false)
  })

  it('can mark a question that has no answer yet', async () => {
    const attempt = await start('exam')
    await toggleMarked(attempt.id, other.id, 2)
    expect((await getAttempt(attempt.id))?.responses[other.id]).toEqual({
      selected: [],
      submitted: false,
      correct: null,
      markedForReview: true,
      answeredAt: null,
    })
  })
})

describe('finishAttempt', () => {
  it('in Study mode scores locked answers once and counts unanswered questions as wrong', async () => {
    const attempt = await start('study')
    await lockAnswer(attempt.id, single, ['a'], 0, 1_000)
    const result = await finishAttempt(attempt.id, ITEMS, 9_000)
    expect(result).toMatchObject({ correct: 1, total: 3, pct: 33 })
    expect(result.bySubdomain['clf-c02/1.1']).toEqual({ correct: 1, total: 2 })
    expect(result.byDomain['clf-c02/d2']).toEqual({ correct: 0, total: 1 })
    const stored = await getAttempt(attempt.id)
    expect(stored?.status).toBe('submitted')
    expect(stored?.submittedAt).toBe(9_000)
    expect(stored?.result).toEqual(result)
    expect(stored?.responses[other.id]).toMatchObject({ selected: [], correct: false, submitted: true })
    expect((await db.itemStats.get(single.id))?.seenCount).toBe(1)
    expect(await db.itemStats.get(multi.id)).toMatchObject({ seenCount: 1, lastCorrect: false })
    expect(await db.itemStats.count()).toBe(3)
  })

  it('in Exam mode grades everything at the end and records every item', async () => {
    const attempt = await start('exam')
    await saveSelection(attempt.id, single, ['a'], 0, 1_000)
    await saveSelection(attempt.id, multi, ['a', 'c'], 1, 2_000)
    expect(await db.itemStats.count()).toBe(0)
    const result = await finishAttempt(attempt.id, ITEMS, 9_000)
    expect(result).toMatchObject({ correct: 2, total: 3, pct: 67 })
    expect(await db.itemStats.count()).toBe(3)
    expect((await db.itemStats.get(multi.id))?.lastCorrect).toBe(true)
  })

  it('is safe to call twice', async () => {
    const attempt = await start('exam')
    await saveSelection(attempt.id, single, ['a'], 0, 1_000)
    const first = await finishAttempt(attempt.id, ITEMS, 9_000)
    const second = await finishAttempt(attempt.id, ITEMS, 10_000)
    expect(second).toEqual(first)
    expect((await getAttempt(attempt.id))?.submittedAt).toBe(9_000)
    expect((await db.itemStats.get(single.id))?.seenCount).toBe(1)
  })

  it('uses the cert’s pass mark for pass/fail', async () => {
    const attempt = await start('exam')
    await saveSelection(attempt.id, single, ['a'], 0, 1_000)
    expect((await finishAttempt(attempt.id, ITEMS, 9_000)).passed).toBe(false)
  })

  it('rejects an unknown attempt', async () => {
    await expect(finishAttempt('missing', ITEMS)).rejects.toThrow('Attempt not found')
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run (PowerShell): `npm test -- src/db/session.test.js`
Expected: FAIL, cannot resolve `./session.js`.

- [ ] **Step 3: Implement `src/db/session.js`**

```js
import { getCert } from '../content/certs.js'
import { subdomainId } from '../content/ids.js'
import { buildResult, finalizeResponses, isCorrect } from '../engine/grading.js'
import { getAttempt, saveResponse, submitAttempt } from './attempts.js'
import { db } from './db.js'
import { recordAnswers } from './itemStats.js'
import { requestPersistence } from './persist.js'

/** @typedef {import('../content/types.js').LoadedItem} LoadedItem */
/** @typedef {import('./types.js').ItemResponse} ItemResponse */
/** @typedef {import('./types.js').AttemptResult} AttemptResult */

/** @type {ItemResponse} */
const EMPTY_RESPONSE = {
  selected: [],
  submitted: false,
  correct: null,
  markedForReview: false,
  answeredAt: null,
}

/**
 * @param {string} attemptId
 * @returns {Promise<import('./types.js').Attempt>}
 */
async function requireAttempt(attemptId) {
  const attempt = await getAttempt(attemptId)
  if (!attempt) throw new Error(`Attempt not found: ${attemptId}`)
  return attempt
}

/**
 * Study mode: locks the learner's answer, grades it, and records the item's history in the
 * same transaction. A second answer to a locked question is ignored.
 * @param {string} attemptId
 * @param {LoadedItem} item
 * @param {string[]} selected option ids
 * @param {number} index the question's position, saved as the current question
 * @param {number} [now] epoch ms
 * @returns {Promise<ItemResponse>}
 */
export function lockAnswer(attemptId, item, selected, index, now = Date.now()) {
  return db.transaction('rw', [db.attempts, db.itemStats], async () => {
    const attempt = await requireAttempt(attemptId)
    const existing = attempt.responses[item.id]
    if (existing?.submitted) return existing
    const correct = isCorrect(item, selected)
    /** @type {ItemResponse} */
    const response = {
      selected,
      submitted: true,
      correct,
      markedForReview: existing?.markedForReview ?? false,
      answeredAt: now,
    }
    await saveResponse(attemptId, item.id, response, index)
    await recordAnswers([
      {
        itemId: item.id,
        certId: attempt.certId,
        subdomainId: subdomainId(attempt.certId, item.taskCode),
        itemVersion: item.version,
        correct,
        at: now,
      },
    ])
    return response
  })
}

/**
 * Exam mode: saves a changeable, ungraded selection. Nothing is graded or recorded until
 * the attempt is finished.
 * @param {string} attemptId
 * @param {LoadedItem} item
 * @param {string[]} selected
 * @param {number} index
 * @param {number} [now] epoch ms
 * @returns {Promise<ItemResponse>}
 */
export async function saveSelection(attemptId, item, selected, index, now = Date.now()) {
  const attempt = await requireAttempt(attemptId)
  const existing = attempt.responses[item.id] ?? EMPTY_RESPONSE
  /** @type {ItemResponse} */
  const response = {
    ...existing,
    selected,
    answeredAt: selected.length > 0 ? now : null,
  }
  await saveResponse(attemptId, item.id, response, index)
  return response
}

/**
 * Exam mode: flips "mark for review" for a question.
 * @param {string} attemptId
 * @param {string} itemId
 * @param {number} index
 */
export async function toggleMarked(attemptId, itemId, index) {
  const attempt = await requireAttempt(attemptId)
  const existing = attempt.responses[itemId] ?? EMPTY_RESPONSE
  await saveResponse(
    attemptId,
    itemId,
    { ...existing, markedForReview: !existing.markedForReview },
    index,
  )
}

/**
 * Ends an attempt: grades everything (unanswered counts as wrong), records history for the
 * items that were not already recorded at lock time, and stores the result, all in one
 * transaction. Calling it again returns the stored result. Afterwards it asks the browser to
 * keep the learner's data.
 * @param {string} attemptId
 * @param {LoadedItem[]} items every item in the attempt
 * @param {number} [now] epoch ms
 * @returns {Promise<AttemptResult>}
 */
export async function finishAttempt(attemptId, items, now = Date.now()) {
  const result = await db.transaction('rw', [db.attempts, db.itemStats], async () => {
    const attempt = await requireAttempt(attemptId)
    if (attempt.status === 'submitted' && attempt.result) return attempt.result

    const responses = finalizeResponses(items, attempt.responses, now)
    const unrecorded = items.filter((item) => !attempt.responses[item.id]?.submitted)
    await recordAnswers(
      unrecorded.map((item) => ({
        itemId: item.id,
        certId: attempt.certId,
        subdomainId: subdomainId(attempt.certId, item.taskCode),
        itemVersion: item.version,
        correct: responses[item.id].correct === true,
        at: responses[item.id].answeredAt ?? now,
      })),
    )
    // Replacing the whole "responses" key is safe: only dotted *nested* paths are the problem.
    await db.attempts.update(attemptId, { responses })
    const passScaled = getCert(attempt.certId)?.exam.passScaled
    const built = buildResult(attempt.itemIds, responses, passScaled)
    await submitAttempt(attemptId, built, now)
    return built
  })
  requestPersistence().catch(() => {})
  return result
}
```

- [ ] **Step 4: Run it and watch it pass**

Run (PowerShell): `npm test -- src/db/session.test.js`
Expected: PASS. Note `passed` in the last `finishAttempt` test is false because 1 of 3 is 33%.

- [ ] **Step 5: Commit**

```bash
git add src/db/session.js src/db/session.test.js
git commit -m "feat: lock, save and finish attempts atomically" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Starting a test

**Files:**

- Create: `src/engine/startTest.js`
- Test: `src/engine/startTest.test.js`

This test uses the real seed content (about 20 questions per task).

- [ ] **Step 1: Write the failing test `src/engine/startTest.test.js`**

```js
import { beforeEach, describe, expect, it } from 'vitest'
import { getCert } from '../content/certs.js'
import { loadItems } from '../content/loadItems.js'
import { getAttempt } from '../db/attempts.js'
import { recordAnswers } from '../db/itemStats.js'
import { resetDb } from '../test/resetDb.js'
import { createRng } from './rng.js'
import { startTest } from './startTest.js'

beforeEach(resetDb)

const clf = getCert('clf-c02')

describe('startTest', () => {
  it('creates a Study-mode Pre-Test from one task and stores it', async () => {
    const attempt = await startTest({
      cert: clf,
      kind: 'pre',
      scopeId: 'clf-c02/1.1',
      length: 5,
      mode: 'study',
      rng: createRng(1),
    })
    expect(attempt).toMatchObject({
      certId: 'clf-c02',
      kind: 'pre',
      scopeId: 'clf-c02/1.1',
      mode: 'study',
      status: 'in_progress',
      deadlineAt: null,
    })
    expect(attempt.itemIds).toHaveLength(5)
    expect(attempt.itemIds.every((id) => id.startsWith('clf-c02-1.1-'))).toBe(true)
    expect(await getAttempt(attempt.id)).toEqual(attempt)
  })

  it('stores a shuffled order of every option for each item', async () => {
    const attempt = await startTest({
      cert: clf,
      kind: 'pre',
      scopeId: 'clf-c02/1.1',
      length: 5,
      mode: 'study',
      rng: createRng(2),
    })
    const items = await loadItems('clf-c02', attempt.itemIds)
    for (const item of items) {
      expect([...attempt.optionOrder[item.id]].sort()).toEqual(item.options.map((o) => o.id).sort())
    }
  })

  it('makes a timed 65-question Diagnostic Exam in Exam mode', async () => {
    const attempt = await startTest({
      cert: clf,
      kind: 'diagnostic',
      scopeId: 'clf-c02',
      length: 10,
      mode: 'exam',
      rng: createRng(3),
    })
    expect(attempt.itemIds).toHaveLength(65)
    expect(attempt.mode).toBe('exam')
    expect(attempt.deadlineAt).toBe(attempt.startedAt + 90 * 60 * 1000)
  })

  it('has no timer in Study mode', async () => {
    const attempt = await startTest({
      cert: clf,
      kind: 'full',
      scopeId: 'clf-c02',
      length: 65,
      mode: 'study',
      rng: createRng(4),
    })
    expect(attempt.mode).toBe('study')
    expect(attempt.deadlineAt).toBeNull()
  })

  it('always uses Study mode for tests that are not exams', async () => {
    const attempt = await startTest({
      cert: clf,
      kind: 'post',
      scopeId: 'clf-c02/1.1',
      length: 10,
      mode: 'exam',
      rng: createRng(5),
    })
    expect(attempt.mode).toBe('study')
    expect(attempt.deadlineAt).toBeNull()
  })

  it('does not repeat Pre-Test questions in the Post-Test while unseen ones remain', async () => {
    const pre = await startTest({
      cert: clf,
      kind: 'pre',
      scopeId: 'clf-c02/1.1',
      length: 10,
      mode: 'study',
      rng: createRng(6),
    })
    await recordAnswers(
      pre.itemIds.map((itemId) => ({
        itemId,
        certId: 'clf-c02',
        subdomainId: 'clf-c02/1.1',
        itemVersion: 1,
        correct: true,
        at: 1_000,
      })),
    )
    const post = await startTest({
      cert: clf,
      kind: 'post',
      scopeId: 'clf-c02/1.1',
      length: 10,
      mode: 'study',
      rng: createRng(7),
    })
    expect(post.itemIds.filter((id) => pre.itemIds.includes(id))).toEqual([])
  })

  it('builds a Weak-Area Drill', async () => {
    const attempt = await startTest({
      cert: clf,
      kind: 'drill',
      scopeId: 'clf-c02',
      length: 10,
      mode: 'study',
      rng: createRng(8),
    })
    expect(attempt.itemIds).toHaveLength(10)
    expect(new Set(attempt.itemIds).size).toBe(10)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run (PowerShell): `npm test -- src/engine/startTest.test.js`
Expected: FAIL, cannot resolve `./startTest.js`.

- [ ] **Step 3: Implement `src/engine/startTest.js`**

```js
import { getSubdomainItemIds, loadItems } from '../content/loadItems.js'
import { createAttempt, listAttempts } from '../db/attempts.js'
import { getStatsForCert } from '../db/itemStats.js'
import { selectDrill } from './drill.js'
import { collectAnswers, masteryBySubdomain } from './mastery.js'
import { createRng, randomSeed, shuffle } from './rng.js'
import { selectForTest } from './selectItems.js'
import { isExamKind } from './testConfig.js'

/** @typedef {import('../content/certs.js').CertSummary} CertSummary */
/** @typedef {import('../db/types.js').AttemptKind} AttemptKind */
/** @typedef {import('../db/types.js').AttemptMode} AttemptMode */
/** @typedef {import('./rng.js').Rng} Rng */

/**
 * Picks the questions for a test, loads only the shards it needs, shuffles each question's
 * options, and stores the new attempt.
 * @param {object} options
 * @param {CertSummary} options.cert
 * @param {AttemptKind} options.kind
 * @param {string} options.scopeId from resolveTestScope()
 * @param {number} options.length ignored for Diagnostic/Full, which use the real exam length
 * @param {AttemptMode} options.mode only Diagnostic/Full can be "exam"
 * @param {Rng} [options.rng] seeded in tests
 * @returns {Promise<import('../db/types.js').Attempt>}
 */
export async function startTest({ cert, kind, scopeId, length, mode, rng = createRng(randomSeed()) }) {
  const codes = cert.domains.flatMap((domain) => domain.subdomains.map((sub) => sub.code))
  const lists = await Promise.all(codes.map((code) => getSubdomainItemIds(cert.id, code)))
  /** @type {Record<string, string[]>} */
  const pools = Object.fromEntries(codes.map((code, i) => [code, lists[i]]))
  const stats = new Map((await getStatsForCert(cert.id)).map((row) => [row.itemId, row]))

  const exam = isExamKind(kind)
  const count = exam ? cert.exam.questions : length
  const itemIds =
    kind === 'drill'
      ? selectDrill({
          rng,
          cert,
          length: count,
          pools,
          stats,
          mastery: masteryBySubdomain(collectAnswers(await listAttempts(cert.id))),
        })
      : selectForTest({ rng, cert, kind, scopeId, length: count, pools, stats })
  if (itemIds.length === 0) throw new Error('There are no questions available for this test yet.')

  const items = await loadItems(cert.id, itemIds)
  const optionOrder = Object.fromEntries(
    items.map((item) => [
      item.id,
      shuffle(
        rng,
        item.options.map((option) => option.id),
      ),
    ]),
  )
  const chosenMode = exam ? mode : 'study'
  return createAttempt({
    certId: cert.id,
    kind,
    scopeId,
    mode: chosenMode,
    itemIds,
    optionOrder,
    timeLimitSec: exam && chosenMode === 'exam' ? cert.exam.minutes * 60 : null,
  })
}
```

- [ ] **Step 4: Run it and watch it pass**

Run (PowerShell): `npm test -- src/engine/startTest.test.js`
Expected: PASS (7 tests). The first run is slower because it loads real shards.

- [ ] **Step 5: Commit**

```bash
git add src/engine/startTest.js src/engine/startTest.test.js
git commit -m "feat: start a test from selection to stored attempt" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 10: `useAttempt` and the working Start button

**Files:**

- Create: `src/hooks/useAttempt.js`
- Modify: `src/components/test/TestSetupForm.jsx`, `src/routes/TestSetupPage.test.jsx`
- Test: `src/hooks/useAttempt.test.js`, `src/components/test/TestSetupForm.test.jsx`

- [ ] **Step 1: Write the failing hook test `src/hooks/useAttempt.test.js`**

```js
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { createAttempt } from '../db/attempts.js'
import { resetDb } from '../test/resetDb.js'
import { useAttempt } from './useAttempt.js'

beforeEach(resetDb)

describe('useAttempt', () => {
  it('loads the attempt and its items in order', async () => {
    const ids = ['clf-c02-1.1-0002', 'clf-c02-1.1-0001']
    const attempt = await createAttempt({
      certId: 'clf-c02',
      kind: 'pre',
      scopeId: 'clf-c02/1.1',
      mode: 'study',
      itemIds: ids,
      optionOrder: {},
    })
    const { result } = renderHook(() => useAttempt(attempt.id))
    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('ready'))
    const ready = /** @type {{ status: 'ready', attempt: any, items: any[] }} */ (result.current)
    expect(ready.attempt.id).toBe(attempt.id)
    expect(ready.items.map((item) => item.id)).toEqual(ids)
    expect(ready.items[0]).toMatchObject({ certId: 'clf-c02', taskCode: '1.1' })
  })

  it('reports an unknown attempt as missing', async () => {
    const { result } = renderHook(() => useAttempt('nope'))
    await waitFor(() => expect(result.current.status).toBe('missing'))
  })
})
```

- [ ] **Step 2: Write the failing form test `src/components/test/TestSetupForm.test.jsx`**

```jsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getCert } from '../../content/certs.js'
import { resolveTestScope } from '../../engine/testConfig.js'
import { startTest } from '../../engine/startTest.js'
import TestSetupForm from './TestSetupForm.jsx'

vi.mock('../../engine/startTest.js', () => ({ startTest: vi.fn() }))

const cert = getCert('clf-c02')

/** @param {import('../../db/types.js').AttemptKind} kind @param {string | null} scope */
function renderForm(kind, scope) {
  const router = createMemoryRouter(
    [
      {
        path: '/setup',
        element: <TestSetupForm cert={cert} kind={kind} scope={resolveTestScope(cert, kind, scope)} />,
      },
      { path: '/attempt/:attemptId', element: <p>Runner page</p> },
    ],
    { initialEntries: ['/setup'] },
  )
  render(<RouterProvider router={router} />)
  return router
}

beforeEach(() => {
  vi.mocked(startTest).mockReset()
})

describe('TestSetupForm', () => {
  it('starts a Pre-Test with the chosen length and opens the attempt', async () => {
    vi.mocked(startTest).mockResolvedValue({ id: 'abc' })
    const user = userEvent.setup()
    const router = renderForm('pre', '1.1')
    await user.click(screen.getByRole('radio', { name: '15' }))
    await user.click(screen.getByRole('button', { name: 'Start Pre-Test' }))
    expect(startTest).toHaveBeenCalledWith({
      cert,
      kind: 'pre',
      scopeId: 'clf-c02/1.1',
      length: 15,
      mode: 'study',
    })
    await waitFor(() => expect(router.state.location.pathname).toBe('/attempt/abc'))
  })

  it('starts the Diagnostic Exam in the chosen mode with the full exam length', async () => {
    vi.mocked(startTest).mockResolvedValue({ id: 'xyz' })
    const user = userEvent.setup()
    renderForm('diagnostic', null)
    await user.click(screen.getByRole('radio', { name: 'Study mode' }))
    await user.click(screen.getByRole('button', { name: 'Start Diagnostic Exam' }))
    expect(startTest).toHaveBeenCalledWith({
      cert,
      kind: 'diagnostic',
      scopeId: 'clf-c02',
      length: 65,
      mode: 'study',
    })
  })

  it('locks the button while starting', async () => {
    /** @type {(value: unknown) => void} */
    let finish = () => {}
    vi.mocked(startTest).mockReturnValue(new Promise((resolve) => (finish = resolve)))
    const user = userEvent.setup()
    renderForm('pre', '1.1')
    await user.click(screen.getByRole('button', { name: 'Start Pre-Test' }))
    expect(screen.getByRole('button', { name: /Starting/ })).toBeDisabled()
    finish({ id: 'late' })
  })

  it('shows an error and lets the learner try again', async () => {
    vi.mocked(startTest).mockRejectedValue(new Error('boom'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = userEvent.setup()
    renderForm('pre', '1.1')
    await user.click(screen.getByRole('button', { name: 'Start Pre-Test' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t start the test')
    expect(screen.getByRole('button', { name: 'Start Pre-Test' })).toBeEnabled()
  })
})
```

- [ ] **Step 3: Update `src/routes/TestSetupPage.test.jsx`**

In the first test (`offers the Pre-Test lengths with 10 selected`) replace
`expect(screen.getByRole('button', { name: /^Start/ })).toBeDisabled()` with
`expect(screen.getByRole('button', { name: /^Start/ })).toBeEnabled()`.

- [ ] **Step 4: Run them and watch them fail**

Run (PowerShell): `npm test -- src/hooks/useAttempt.test.js src/components/test/TestSetupForm.test.jsx src/routes/TestSetupPage.test.jsx`
Expected: FAIL (`useAttempt` missing; the button is still disabled).

- [ ] **Step 5: Implement `src/hooks/useAttempt.js`**

```js
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { loadItems } from '../content/loadItems.js'
import { getAttempt } from '../db/attempts.js'

/** @typedef {import('../db/types.js').Attempt} Attempt */
/** @typedef {import('../content/types.js').LoadedItem} LoadedItem */
/**
 * @typedef {{ status: 'loading' }
 *   | { status: 'missing' }
 *   | { status: 'error' }
 *   | { status: 'ready', attempt: Attempt, items: LoadedItem[] }} AttemptState
 */

/**
 * A live attempt (re-renders as answers are saved) plus its questions, loaded once.
 * @param {string} attemptId
 * @returns {AttemptState}
 */
export function useAttempt(attemptId) {
  // null = no such attempt; undefined = still reading.
  const attempt = useLiveQuery(() => getAttempt(attemptId).then((row) => row ?? null), [attemptId])
  const certId = attempt?.certId
  // Item ids never change for an attempt; keying on them avoids reloading on every answer.
  const itemKey = attempt ? attempt.itemIds.join('|') : null
  const [loaded, setLoaded] = useState(
    /** @type {{ key: string, items?: LoadedItem[] } | null} */ (null),
  )

  useEffect(() => {
    if (!certId || !itemKey) return
    let cancelled = false
    loadItems(certId, itemKey.split('|')).then(
      (items) => {
        if (!cancelled) setLoaded({ key: itemKey, items })
      },
      (error) => {
        console.error('Failed to load questions', error)
        if (!cancelled) setLoaded({ key: itemKey })
      },
    )
    return () => {
      cancelled = true
    }
  }, [certId, itemKey])

  if (attempt === undefined) return { status: 'loading' }
  if (attempt === null) return { status: 'missing' }
  if (loaded?.key !== itemKey) return { status: 'loading' }
  return loaded.items ? { status: 'ready', attempt, items: loaded.items } : { status: 'error' }
}
```

- [ ] **Step 6: Enable Start in `src/components/test/TestSetupForm.jsx`**

Apply these edits (keep everything else as is):

1. Imports: change the first line to `import { useId, useState } from 'react'` and add below the existing imports:

```jsx
import { useNavigate } from 'react-router-dom'
import { startTest } from '../../engine/startTest.js'
```

2. Update the doc comment above the component: replace the sentence "The Start button is wired to the exam engine in Phase 4; until then it stays disabled with a note." with "Start creates the attempt and opens the runner."

3. Inside the component, after the `const minutes = cert.exam.minutes` line, add:

```jsx
  const navigate = useNavigate()
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')

  /** @param {import('react').FormEvent} event */
  async function handleStart(event) {
    event.preventDefault()
    if (length === null) return
    setError('')
    setStarting(true)
    try {
      const attempt = await startTest({
        cert,
        kind,
        scopeId: scope.scopeId,
        length,
        mode: examKind ? mode : 'study',
      })
      navigate(`/attempt/${attempt.id}`)
    } catch (cause) {
      console.error('Failed to start the test', cause)
      setError('Couldn’t start the test. Please try again.')
      setStarting(false)
    }
  }
```

4. Change `<form className="mt-6 max-w-xl space-y-6" onSubmit={(event) => event.preventDefault()}>` to `<form className="mt-6 max-w-xl space-y-6" onSubmit={handleStart}>`.

5. Replace the final `<div>…</div>` block (the Start button and its "arrives in the next update" note) with:

```jsx
        <div>
          <button
            type="submit"
            disabled={starting || length === null}
            className={buttonClass('primary')}
          >
            {starting ? 'Starting…' : `Start ${TEST_KIND_LABELS[kind]}`}
          </button>
          {error && (
            <p role="alert" className="mt-2 text-red-700 dark:text-red-400">
              {error}
            </p>
          )}
        </div>
```

6. Remove the now-unused `idPrefix`-based `aria-describedby={`${idPrefix}-start`}`; keep `idPrefix` (still used by the mode radios).

(After a successful start the component stays mounted for a moment while the route changes, so it keeps `starting` true: that is intended.)

- [ ] **Step 7: Run them and watch them pass**

Run (PowerShell): `npm test -- src/hooks/useAttempt.test.js src/components/test src/routes/TestSetupPage.test.jsx src/router.test.jsx`
Expected: PASS. The router rows for `/clf-c02/test/new?...` still pass.

- [ ] **Step 8: Commit**

```bash
git add src/hooks/useAttempt.js src/hooks/useAttempt.test.js src/components/test/TestSetupForm.jsx src/components/test/TestSetupForm.test.jsx src/routes/TestSetupPage.test.jsx
git commit -m "feat: start tests from the setup page and load attempts live" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Question card, option list and the inline Markdown variant

**Files:**

- Create: `src/components/test/words.js`, `src/components/test/QuestionCard.jsx`, `src/components/test/OptionList.jsx`
- Modify: `src/components/markdown/Markdown.jsx`, `src/index.css`
- Test: `src/components/markdown/Markdown.test.jsx`, `src/components/test/OptionList.test.jsx`, `src/components/test/QuestionCard.test.jsx`

- [ ] **Step 1: Write the failing tests**

Append to `src/components/markdown/Markdown.test.jsx` (inside the file, a new `describe`):

```jsx
describe('Markdown inline variant', () => {
  it('renders question text without heading ids, so many can share a page', () => {
    render(
      <>
        <Markdown variant="inline">{'## Same heading'}</Markdown>
        <Markdown variant="inline">{'## Same heading'}</Markdown>
      </>,
    )
    for (const heading of screen.getAllByRole('heading', { name: 'Same heading' })) {
      expect(heading).not.toHaveAttribute('id')
    }
  })

  it('still renders formatting and drops raw HTML', () => {
    const { container } = render(
      <Markdown variant="inline">{'Use `aws s3 ls` and **bold** <b>raw</b>'}</Markdown>,
    )
    expect(screen.getByText('aws s3 ls').tagName).toBe('CODE')
    expect(screen.getByText('bold').tagName).toBe('STRONG')
    expect(container.querySelector('b')).toBeNull()
  })
})
```

`src/components/test/OptionList.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { makeItem, makeMultiItem } from '../../test/itemFactories.js'
import OptionList from './OptionList.jsx'

describe('OptionList', () => {
  it('shows single-answer options as radios in the stored order with letters', () => {
    render(
      <OptionList item={makeItem()} order={['c', 'a', 'd', 'b']} selected={[]} locked={false} onToggle={() => {}} />,
    )
    const radios = screen.getAllByRole('radio')
    expect(radios.map((radio) => radio.getAttribute('value'))).toEqual(['c', 'a', 'd', 'b'])
    expect(screen.getByRole('radio', { name: 'Amazon S3' })).toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('D')).toBeInTheDocument()
  })

  it('reports the chosen option', async () => {
    const onToggle = vi.fn()
    const user = userEvent.setup()
    render(<OptionList item={makeItem()} order={['a', 'b', 'c', 'd']} selected={[]} locked={false} onToggle={onToggle} />)
    await user.click(screen.getByRole('radio', { name: 'Amazon EBS' }))
    expect(onToggle).toHaveBeenCalledWith('b')
  })

  it('uses checkboxes for multiple response and stops at the selection count', () => {
    render(
      <OptionList
        item={makeMultiItem()}
        order={['a', 'b', 'c', 'd', 'e']}
        selected={['a', 'c']}
        locked={false}
        onToggle={() => {}}
      />,
    )
    expect(screen.getAllByRole('checkbox')).toHaveLength(5)
    expect(screen.getByRole('checkbox', { name: 'Pay-as-you-go pricing' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Elastic capacity' })).toBeEnabled()
    expect(screen.getByRole('checkbox', { name: 'Fixed capacity' })).toBeDisabled()
    expect(screen.getByText('2 of 2 chosen')).toBeInTheDocument()
  })

  it('leaves choices open below the limit', () => {
    render(
      <OptionList item={makeMultiItem()} order={['a', 'b', 'c', 'd', 'e']} selected={['a']} locked={false} onToggle={() => {}} />,
    )
    expect(screen.getByRole('checkbox', { name: 'Fixed capacity' })).toBeEnabled()
    expect(screen.getByText('1 of 2 chosen')).toBeInTheDocument()
  })

  it('disables everything when locked', () => {
    render(<OptionList item={makeItem()} order={['a', 'b', 'c', 'd']} selected={['a']} locked onToggle={() => {}} />)
    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled()
  })
})
```

`src/components/test/QuestionCard.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { makeItem, makeMultiItem } from '../../test/itemFactories.js'
import QuestionCard from './QuestionCard.jsx'

describe('QuestionCard', () => {
  it('shows the position and the question', () => {
    render(
      <QuestionCard item={makeItem()} index={2} total={10}>
        <p>options go here</p>
      </QuestionCard>,
    )
    expect(screen.getByRole('heading', { level: 2, name: 'Question 3 of 10' })).toBeInTheDocument()
    expect(screen.getByText(/object storage with 11 nines/)).toBeInTheDocument()
    expect(screen.getByText('options go here')).toBeInTheDocument()
    expect(screen.queryByText(/^Choose/)).not.toBeInTheDocument()
  })

  it('tells the learner how many to choose for multiple response', () => {
    render(<QuestionCard item={makeMultiItem()} index={0} total={5} />)
    expect(screen.getByText('Choose TWO')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run them and watch them fail**

Run (PowerShell): `npm test -- src/components/markdown/Markdown.test.jsx src/components/test/OptionList.test.jsx src/components/test/QuestionCard.test.jsx`
Expected: FAIL (inline variant and components missing).

- [ ] **Step 3: Implement `src/components/test/words.js`**

```js
/** Option letters shown next to choices, in display order. */
export const OPTION_LETTERS = 'ABCDEF'

const WORDS = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX']

/**
 * "Choose TWO" wording, as on the real exam.
 * @param {number} count
 */
export function countWord(count) {
  return WORDS[count] ?? String(count)
}
```

- [ ] **Step 4: Add the inline variant to `src/components/markdown/Markdown.jsx`**

Replace the exported component (everything from its doc comment to the end of the file) with:

```jsx
/**
 * Renders authored Markdown: GFM tables, Mermaid diagrams, slugged heading ids. Raw HTML in
 * the source is dropped, not rendered. The "inline" variant is for question text and
 * explanations: no heading ids (many can share a page) and tighter spacing.
 * @param {{ children: string, variant?: 'lesson' | 'inline' }} props
 */
export default function Markdown({ children, variant = 'lesson' }) {
  const inline = variant === 'inline'
  return (
    <div className={inline ? 'lesson lesson-inline' : 'lesson'}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={inline ? [] : [rehypeSlug]}
        components={COMPONENTS}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
```

- [ ] **Step 5: Add the CSS to `src/index.css`**

Append inside the existing `@layer components { … }` block (just before its closing brace):

```css
  .lesson-inline > :first-child {
    @apply mt-0;
  }
  .lesson-inline h1,
  .lesson-inline h2,
  .lesson-inline h3 {
    @apply mt-4 text-base font-semibold;
  }
```

- [ ] **Step 6: Implement `src/components/test/OptionList.jsx`**

```jsx
import { OPTION_LETTERS } from './words.js'

/** @typedef {import('../../content/types.js').LoadedItem} LoadedItem */

/**
 * The answer choices, in the attempt's stored (shuffled) order. Radios for one answer,
 * checkboxes for multiple response; unchosen boxes are disabled once the limit is reached.
 * @param {{
 *   item: LoadedItem,
 *   order: string[],
 *   selected: string[],
 *   locked: boolean,
 *   onToggle: (optionId: string) => void,
 * }} props
 */
export default function OptionList({ item, order, selected, locked, onToggle }) {
  const options = order.flatMap((id) => item.options.filter((option) => option.id === id))
  const multiple = item.selectCount > 1
  const atLimit = multiple && selected.length >= item.selectCount
  return (
    <fieldset disabled={locked} className="mt-4 min-w-0">
      <legend className="sr-only">Answer options</legend>
      <div className="space-y-2">
        {options.map((option, position) => {
          const checked = selected.includes(option.id)
          const unavailable = atLimit && !checked
          return (
            <label
              key={option.id}
              className={`flex items-start gap-3 rounded-lg border p-3 ${checked ? 'border-slate-900 bg-slate-50 dark:border-slate-100 dark:bg-slate-900' : 'border-slate-300 dark:border-slate-700'} ${unavailable || locked ? 'opacity-70' : 'cursor-pointer hover:border-slate-500'}`}
            >
              <input
                type={multiple ? 'checkbox' : 'radio'}
                name={item.id}
                value={option.id}
                checked={checked}
                disabled={unavailable}
                onChange={() => onToggle(option.id)}
                className="mt-1"
              />
              <span
                aria-hidden="true"
                className="flex size-6 shrink-0 items-center justify-center rounded border border-slate-400 text-sm font-semibold"
              >
                {OPTION_LETTERS[position]}
              </span>
              <span>{option.text}</span>
            </label>
          )
        })}
      </div>
      {multiple && (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300" aria-live="polite">
          {selected.length} of {item.selectCount} chosen
        </p>
      )}
    </fieldset>
  )
}
```

- [ ] **Step 7: Implement `src/components/test/QuestionCard.jsx`**

```jsx
import { useId } from 'react'
import Markdown from '../markdown/Markdown.jsx'
import { countWord } from './words.js'

/**
 * One question: its position, the "Choose TWO" badge for multiple response, the stem, and
 * whatever the runner puts under it (the options).
 * @param {{
 *   item: import('../../content/types.js').LoadedItem,
 *   index: number,
 *   total: number,
 *   children?: import('react').ReactNode,
 * }} props
 */
export default function QuestionCard({ item, index, total, children }) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="text-sm font-semibold text-slate-600 dark:text-slate-300">
        Question {index + 1} of {total}
      </h2>
      {item.selectCount > 1 && (
        <p className="mt-2 inline-block rounded bg-amber-100 px-2 py-0.5 text-sm font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
          Choose {countWord(item.selectCount)}
        </p>
      )}
      <div className="mt-2 text-lg">
        <Markdown variant="inline">{item.stem}</Markdown>
      </div>
      {children}
    </section>
  )
}
```

- [ ] **Step 8: Run them and watch them pass**

Run (PowerShell): `npm test -- src/components/markdown src/components/test`
Expected: PASS. If the `getByText('A')` assertion matches several elements, narrow it to `getAllByText('A')[0]`; the point is that letters are shown.

- [ ] **Step 9: Commit**

```bash
git add src/components/test src/components/markdown/Markdown.jsx src/components/markdown/Markdown.test.jsx src/index.css
git commit -m "feat: question card, option list and inline Markdown" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Explanation panel, rationale, references and Report issue

**Files:**

- Create: `src/components/test/OptionRationale.jsx`, `src/components/test/ReferenceList.jsx`, `src/components/test/ReportIssueForm.jsx`, `src/components/test/ExplanationPanel.jsx`
- Test: `src/components/test/OptionRationale.test.jsx`, `src/components/test/ReportIssueForm.test.jsx`, `src/components/test/ExplanationPanel.test.jsx`

- [ ] **Step 1: Write the failing tests**

`src/components/test/OptionRationale.test.jsx`:

```jsx
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { makeItem } from '../../test/itemFactories.js'
import OptionRationale from './OptionRationale.jsx'

describe('OptionRationale', () => {
  it('explains every option, marking the right answer and the learner’s wrong choice', () => {
    render(<OptionRationale item={makeItem()} order={['b', 'a', 'c', 'd']} selected={['b']} />)
    const rows = within(screen.getByRole('list', { name: 'Why each option is right or wrong' })).getAllByRole('listitem')
    expect(rows).toHaveLength(4)
    expect(rows[0]).toHaveTextContent('Amazon EBS')
    expect(rows[0]).toHaveTextContent('Your answer')
    expect(rows[0]).toHaveTextContent('EBS is block storage for EC2.')
    expect(rows[1]).toHaveTextContent('Correct answer')
    expect(rows[1]).toHaveTextContent('S3 is AWS object storage.')
    expect(rows[2]).not.toHaveTextContent('Your answer')
    expect(rows[3]).toHaveTextContent('RDS is a managed database.')
  })

  it('marks a correct choice as both correct and chosen', () => {
    render(<OptionRationale item={makeItem()} order={['a', 'b', 'c', 'd']} selected={['a']} />)
    const first = screen.getAllByRole('listitem')[0]
    expect(first).toHaveTextContent('Correct answer')
    expect(first).toHaveTextContent('Your answer')
  })
})
```

`src/components/test/ReportIssueForm.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { listFlags } from '../../db/flags.js'
import { makeItem } from '../../test/itemFactories.js'
import { resetDb } from '../../test/resetDb.js'
import ReportIssueForm from './ReportIssueForm.jsx'

beforeEach(resetDb)

describe('ReportIssueForm', () => {
  it('starts collapsed and cannot send without a reason', async () => {
    const user = userEvent.setup()
    render(<ReportIssueForm item={makeItem()} />)
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Report issue' }))
    expect(screen.getByRole('button', { name: 'Send report' })).toBeDisabled()
  })

  it('saves the report with the item id and version', async () => {
    const user = userEvent.setup()
    render(<ReportIssueForm item={makeItem({ version: 3 })} />)
    await user.click(screen.getByRole('button', { name: 'Report issue' }))
    await user.click(screen.getByRole('radio', { name: 'Wrong answer' }))
    await user.type(screen.getByLabelText('Details (optional)'), 'B is also right')
    await user.click(screen.getByRole('button', { name: 'Send report' }))
    expect(await screen.findByText(/Your report was saved/)).toBeInTheDocument()
    const [flag] = await listFlags()
    expect(flag).toMatchObject({
      itemId: 'clf-c02-1.1-0001',
      itemVersion: 3,
      certId: 'clf-c02',
      reason: 'wrong-answer',
      note: 'B is also right',
    })
  })

  it('can be cancelled', async () => {
    const user = userEvent.setup()
    render(<ReportIssueForm item={makeItem()} />)
    await user.click(screen.getByRole('button', { name: 'Report issue' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('button', { name: 'Report issue' })).toBeInTheDocument()
    expect(await listFlags()).toEqual([])
  })
})
```

`src/components/test/ExplanationPanel.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { makeItem } from '../../test/itemFactories.js'
import { resetDb } from '../../test/resetDb.js'
import ExplanationPanel from './ExplanationPanel.jsx'

beforeEach(resetDb)

const order = ['a', 'b', 'c', 'd']

describe('ExplanationPanel', () => {
  it('announces a correct answer', () => {
    render(<ExplanationPanel item={makeItem()} order={order} selected={['a']} correct />)
    expect(screen.getByRole('status')).toHaveTextContent('Correct')
  })

  it('announces an incorrect answer and still explains everything', () => {
    render(<ExplanationPanel item={makeItem()} order={order} selected={['b']} correct={false} />)
    expect(screen.getByRole('status')).toHaveTextContent('Incorrect')
    for (const rationale of [
      'S3 is AWS object storage.',
      'EBS is block storage for EC2.',
      'EC2 provides compute capacity.',
      'RDS is a managed database.',
    ]) {
      expect(screen.getByText(rationale)).toBeInTheDocument()
    }
    expect(screen.getByText(/designed for 11 nines of durability/)).toBeInTheDocument()
  })

  it('links the AWS references in a new tab', () => {
    render(<ExplanationPanel item={makeItem()} order={order} selected={['a']} correct />)
    const link = screen.getByRole('link', { name: 'What is Amazon S3? (opens in a new tab)' })
    expect(link).toHaveAttribute('href', 'https://docs.aws.amazon.com/s3/')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('offers Report issue', () => {
    render(<ExplanationPanel item={makeItem()} order={order} selected={['a']} correct />)
    expect(screen.getByRole('button', { name: 'Report issue' })).toBeInTheDocument()
  })

  it('moves focus to the explanation heading when asked', () => {
    render(<ExplanationPanel item={makeItem()} order={order} selected={['a']} correct focusOnMount />)
    expect(screen.getByRole('heading', { name: 'Explanation' })).toHaveFocus()
  })

  it('leaves focus alone by default', () => {
    render(<ExplanationPanel item={makeItem()} order={order} selected={['a']} correct />)
    expect(screen.getByRole('heading', { name: 'Explanation' })).not.toHaveFocus()
  })
})
```

- [ ] **Step 2: Run them and watch them fail**

Run (PowerShell): `npm test -- src/components/test/OptionRationale.test.jsx src/components/test/ReportIssueForm.test.jsx src/components/test/ExplanationPanel.test.jsx`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement `src/components/test/OptionRationale.jsx`**

```jsx
import { AlertCircleIcon, CheckCircleIcon } from '../ui/icons.jsx'
import { OPTION_LETTERS } from './words.js'

/**
 * Every option with its own explanation, in the order the learner saw them. The right
 * answer(s) and the learner's choice(s) are marked with icon and text, not color alone.
 * @param {{
 *   item: import('../../content/types.js').LoadedItem,
 *   order: string[],
 *   selected: string[],
 * }} props
 */
export default function OptionRationale({ item, order, selected }) {
  const options = order.flatMap((id) => item.options.filter((option) => option.id === id))
  return (
    <ol aria-label="Why each option is right or wrong" className="mt-4 space-y-3">
      {options.map((option, position) => {
        const chosen = selected.includes(option.id)
        return (
          <li
            key={option.id}
            className={`rounded-lg border p-3 ${option.correct ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/50' : 'border-slate-200 dark:border-slate-800'}`}
          >
            <p className="flex flex-wrap items-center gap-x-2 font-medium">
              <span aria-hidden="true" className="font-semibold">
                {OPTION_LETTERS[position]}.
              </span>
              {option.text}
            </p>
            <p className="mt-1 flex flex-wrap gap-x-4 text-sm font-semibold">
              {option.correct && (
                <span className="inline-flex items-center gap-1">
                  <CheckCircleIcon className="size-4 text-emerald-700 dark:text-emerald-400" />
                  Correct answer
                </span>
              )}
              {chosen && (
                <span className="inline-flex items-center gap-1">
                  {!option.correct && (
                    <AlertCircleIcon className="size-4 text-red-700 dark:text-red-400" />
                  )}
                  Your answer
                </span>
              )}
            </p>
            <p className="mt-1 text-sm">{option.rationale}</p>
          </li>
        )
      })}
    </ol>
  )
}
```

- [ ] **Step 4: Implement `src/components/test/ReferenceList.jsx`**

```jsx
/**
 * @param {{ references: import('../../content/types.js').Reference[] }} props
 */
export default function ReferenceList({ references }) {
  if (references.length === 0) return null
  return (
    <div className="mt-4">
      <h4 className="font-semibold">Learn more</h4>
      <ul className="mt-1 list-disc pl-6">
        {references.map((reference) => (
          <li key={reference.url}>
            <a
              href={reference.url}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-amber-700 underline underline-offset-2 dark:text-amber-400"
            >
              {reference.title}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 5: Implement `src/components/test/ReportIssueForm.jsx`**

```jsx
import { useState } from 'react'
import { addFlag, FLAG_REASON_LABELS, FLAG_REASONS } from '../../db/flags.js'
import { buttonClass } from '../ui/styles.js'

/**
 * "Report issue": an inline form that saves a report in this browser (see Settings → My
 * reports to export them).
 * @param {{ item: import('../../content/types.js').LoadedItem }} props
 */
export default function ReportIssueForm({ item }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState(/** @type {import('../../db/types.js').FlagReason | null} */ (null))
  const [note, setNote] = useState('')
  const [status, setStatus] = useState(/** @type {'idle' | 'saving' | 'saved' | 'error'} */ ('idle'))

  if (status === 'saved') {
    return (
      <output className="mt-4 block text-sm">
        Thanks. Your report was saved in this browser. Export it from Settings to share it.
      </output>
    )
  }
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${buttonClass('secondary')} mt-4`}
      >
        Report issue
      </button>
    )
  }

  /** @param {import('react').FormEvent} event */
  async function handleSubmit(event) {
    event.preventDefault()
    if (!reason) return
    setStatus('saving')
    try {
      await addFlag({
        itemId: item.id,
        itemVersion: item.version,
        certId: item.certId,
        reason,
        note,
      })
      setStatus('saved')
    } catch (error) {
      console.error('Failed to save report', error)
      setStatus('error')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded-lg border border-slate-300 p-4 dark:border-slate-700">
      <fieldset>
        <legend className="font-semibold">What’s wrong with this question?</legend>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {FLAG_REASONS.map((value) => (
            <label key={value} className="flex items-center gap-2">
              <input
                type="radio"
                name={`reason-${item.id}`}
                value={value}
                checked={reason === value}
                onChange={() => setReason(value)}
              />
              {FLAG_REASON_LABELS[value]}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="font-semibold">Details (optional)</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          className="mt-1 w-full rounded border border-slate-300 bg-transparent p-2 dark:border-slate-700"
        />
      </label>
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={!reason || status === 'saving'}
          className={buttonClass('primary')}
        >
          Send report
        </button>
        <button type="button" onClick={() => setOpen(false)} className={buttonClass('secondary')}>
          Cancel
        </button>
      </div>
      {status === 'error' && (
        <p role="alert" className="text-red-700 dark:text-red-400">
          Couldn’t save your report. Your browser may be blocking storage.
        </p>
      )}
    </form>
  )
}
```

- [ ] **Step 6: Implement `src/components/test/ExplanationPanel.jsx`**

```jsx
import { useEffect, useId, useRef } from 'react'
import Markdown from '../markdown/Markdown.jsx'
import { AlertCircleIcon, CheckCircleIcon } from '../ui/icons.jsx'
import OptionRationale from './OptionRationale.jsx'
import ReferenceList from './ReferenceList.jsx'
import ReportIssueForm from './ReportIssueForm.jsx'

/**
 * Shown after an answer is locked (Study mode) and in the results review: the verdict, an
 * explanation of every option, the overall explanation, AWS references and Report issue.
 * @param {{
 *   item: import('../../content/types.js').LoadedItem,
 *   order: string[],
 *   selected: string[],
 *   correct: boolean,
 *   focusOnMount?: boolean,
 * }} props
 */
export default function ExplanationPanel({ item, order, selected, correct, focusOnMount = false }) {
  const headingId = useId()
  const headingRef = useRef(/** @type {HTMLHeadingElement | null} */ (null))

  useEffect(() => {
    if (focusOnMount) headingRef.current?.focus()
  }, [focusOnMount])

  return (
    <section
      aria-labelledby={headingId}
      className="mt-6 rounded-lg border border-slate-300 p-4 dark:border-slate-700"
    >
      <output className="flex items-center gap-2 text-lg font-bold">
        {correct ? (
          <CheckCircleIcon className="size-6 text-emerald-700 dark:text-emerald-400" />
        ) : (
          <AlertCircleIcon className="size-6 text-red-700 dark:text-red-400" />
        )}
        {correct ? 'Correct' : 'Incorrect'}
      </output>
      <h3
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        className="mt-3 text-lg font-semibold outline-none"
      >
        Explanation
      </h3>
      <OptionRationale item={item} order={order} selected={selected} />
      <div className="mt-4">
        <Markdown variant="inline">{item.explanation}</Markdown>
      </div>
      <ReferenceList references={item.references} />
      <ReportIssueForm item={item} />
    </section>
  )
}
```

- [ ] **Step 7: Run them and watch them pass**

Run (PowerShell): `npm test -- src/components/test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/test
git commit -m "feat: explanation panel with per-option rationale and report issue" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Exam timer and question navigator

**Files:**

- Create: `src/components/test/timer.js`, `src/components/test/Timer.jsx`, `src/components/test/QuestionNavigator.jsx`
- Test: `src/components/test/timer.test.js`, `src/components/test/Timer.test.jsx`, `src/components/test/QuestionNavigator.test.jsx`

- [ ] **Step 1: Write the failing tests**

`src/components/test/timer.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { formatRemaining, warningFor } from './timer.js'

describe('formatRemaining', () => {
  it.each([
    [90 * 60_000, '1:30:00'],
    [59 * 60_000 + 5_000, '59:05'],
    [61_000, '1:01'],
    [999, '0:01'],
    [0, '0:00'],
    [-500, '0:00'],
  ])('%s ms is %s', (ms, text) => {
    expect(formatRemaining(ms)).toBe(text)
  })
})

describe('warningFor', () => {
  it('warns at 10 minutes and at 1 minute, using the closest threshold', () => {
    expect(warningFor(20 * 60_000)).toBeNull()
    expect(warningFor(10 * 60_000)?.message).toBe('Less than 10 minutes remaining')
    expect(warningFor(5 * 60_000)?.message).toBe('Less than 10 minutes remaining')
    expect(warningFor(60_000)?.message).toBe('Less than 1 minute remaining')
  })
})
```

`src/components/test/Timer.test.jsx`:

```jsx
import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Timer from './Timer.jsx'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 15, 12, 0, 0))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Timer', () => {
  it('counts down every second', () => {
    render(<Timer deadlineAt={Date.now() + 90 * 60_000} onExpire={() => {}} />)
    expect(screen.getByRole('timer')).toHaveTextContent('1:30:00')
    act(() => vi.advanceTimersByTime(5_000))
    expect(screen.getByRole('timer')).toHaveTextContent('1:29:55')
  })

  it('announces the 10-minute and 1-minute warnings once each', () => {
    render(<Timer deadlineAt={Date.now() + 11 * 60_000} onExpire={() => {}} />)
    const live = screen.getByTestId('timer-announcement')
    expect(live).toBeEmptyDOMElement()
    act(() => vi.advanceTimersByTime(60_000))
    expect(live).toHaveTextContent('Less than 10 minutes remaining')
    act(() => vi.advanceTimersByTime(9 * 60_000))
    expect(live).toHaveTextContent('Less than 1 minute remaining')
  })

  it('does not announce the 10-minute warning every second', () => {
    render(<Timer deadlineAt={Date.now() + 9 * 60_000} onExpire={() => {}} />)
    const live = screen.getByTestId('timer-announcement')
    const first = live.textContent
    act(() => vi.advanceTimersByTime(3_000))
    expect(live.textContent).toBe(first)
  })

  it('calls onExpire exactly once when time runs out', () => {
    const onExpire = vi.fn()
    render(<Timer deadlineAt={Date.now() + 3_000} onExpire={onExpire} />)
    act(() => vi.advanceTimersByTime(10_000))
    expect(onExpire).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('timer')).toHaveTextContent('0:00')
    expect(screen.getByTestId('timer-announcement')).toHaveTextContent('Time is up')
  })

  it('expires straight away when the deadline has already passed', () => {
    const onExpire = vi.fn()
    render(<Timer deadlineAt={Date.now() - 1_000} onExpire={onExpire} />)
    expect(onExpire).toHaveBeenCalledTimes(1)
  })
})
```

`src/components/test/QuestionNavigator.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import QuestionNavigator from './QuestionNavigator.jsx'

const itemIds = ['q1', 'q2', 'q3']
const responses = {
  q1: { selected: ['a'], submitted: false, correct: null, markedForReview: false, answeredAt: 1 },
  q2: { selected: [], submitted: false, correct: null, markedForReview: true, answeredAt: null },
}

describe('QuestionNavigator', () => {
  it('describes each question’s state in words', () => {
    render(<QuestionNavigator itemIds={itemIds} responses={responses} currentIndex={0} onGo={() => {}} />)
    expect(screen.getByRole('button', { name: 'Question 1: answered' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Question 2: unanswered, marked for review' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Question 3: unanswered' })).toBeInTheDocument()
  })

  it('marks the current question', () => {
    render(<QuestionNavigator itemIds={itemIds} responses={responses} currentIndex={2} onGo={() => {}} />)
    expect(screen.getByRole('button', { name: 'Question 3: unanswered' })).toHaveAttribute('aria-current', 'step')
    expect(screen.getByRole('button', { name: 'Question 1: answered' })).not.toHaveAttribute('aria-current')
  })

  it('jumps to a question', async () => {
    const onGo = vi.fn()
    const user = userEvent.setup()
    render(<QuestionNavigator itemIds={itemIds} responses={responses} currentIndex={0} onGo={onGo} />)
    await user.click(screen.getByRole('button', { name: 'Question 3: unanswered' }))
    expect(onGo).toHaveBeenCalledWith(2)
  })

  it('has a legend that does not rely on color', () => {
    render(<QuestionNavigator itemIds={itemIds} responses={responses} currentIndex={0} onGo={() => {}} />)
    expect(screen.getByText(/Filled = answered/)).toBeInTheDocument()
    expect(screen.getByText(/⚑ = marked for review/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run them and watch them fail**

Run (PowerShell): `npm test -- src/components/test/timer.test.js src/components/test/Timer.test.jsx src/components/test/QuestionNavigator.test.jsx`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement `src/components/test/timer.js`**

```js
/**
 * "1:30:00" for 90 minutes, "59:05" under an hour. Rounds up, so the display reads 0:00
 * only when time is really up.
 * @param {number} ms
 */
export function formatRemaining(ms) {
  const total = Math.ceil(Math.max(0, ms) / 1000)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const pad = (/** @type {number} */ n) => String(n).padStart(2, '0')
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`
}

/** Warnings, closest to zero first. */
export const WARNINGS = [
  { atMs: 60_000, message: 'Less than 1 minute remaining' },
  { atMs: 10 * 60_000, message: 'Less than 10 minutes remaining' },
]

/**
 * The tightest warning that applies at `ms` remaining, or null.
 * @param {number} ms
 */
export function warningFor(ms) {
  return WARNINGS.find((warning) => ms <= warning.atMs) ?? null
}
```

- [ ] **Step 4: Implement `src/components/test/Timer.jsx`**

```jsx
import { useEffect, useRef, useState } from 'react'
import { formatRemaining, warningFor } from './timer.js'

/**
 * Countdown to an absolute deadline (so a refresh resumes it). The ticking display is not
 * announced; only the 10-minute and 1-minute warnings and time-up are, once each. Calls
 * onExpire exactly once at zero, immediately if the deadline has already passed.
 * @param {{ deadlineAt: number, onExpire: () => void }} props
 */
export default function Timer({ deadlineAt, onExpire }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, deadlineAt - Date.now()))
  const [announcement, setAnnouncement] = useState('')
  const lastWarning = useRef(Infinity)
  const expired = useRef(false)
  const onExpireRef = useRef(onExpire)

  useEffect(() => {
    onExpireRef.current = onExpire
  })

  useEffect(() => {
    function tick() {
      const ms = Math.max(0, deadlineAt - Date.now())
      setRemaining(ms)
      const warning = warningFor(ms)
      if (ms > 0 && warning && warning.atMs < lastWarning.current) {
        lastWarning.current = warning.atMs
        setAnnouncement(warning.message)
      }
      if (ms === 0 && !expired.current) {
        expired.current = true
        setAnnouncement('Time is up. Submitting your exam.')
        onExpireRef.current()
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [deadlineAt])

  return (
    <div className="text-right">
      <p role="timer" className="font-mono text-2xl font-bold tabular-nums">
        <span className="mr-2 font-sans text-sm font-semibold">Time left</span>
        {formatRemaining(remaining)}
      </p>
      <output data-testid="timer-announcement" className="sr-only">
        {announcement}
      </output>
    </div>
  )
}
```

- [ ] **Step 5: Implement `src/components/test/QuestionNavigator.jsx`**

```jsx
/**
 * Jump between questions in Exam mode. State is shown by fill and a flag glyph and spoken
 * in the button's name, never by color alone.
 * @param {{
 *   itemIds: string[],
 *   responses: Record<string, import('../../db/types.js').ItemResponse>,
 *   currentIndex: number,
 *   onGo: (index: number) => void,
 * }} props
 */
export default function QuestionNavigator({ itemIds, responses, currentIndex, onGo }) {
  return (
    <nav aria-label="Question navigator">
      <ol className="grid grid-cols-5 gap-1.5 sm:grid-cols-8">
        {itemIds.map((id, index) => {
          const response = responses[id]
          const answered = (response?.selected.length ?? 0) > 0
          const marked = response?.markedForReview === true
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onGo(index)}
                aria-current={index === currentIndex ? 'step' : undefined}
                aria-label={`Question ${index + 1}: ${answered ? 'answered' : 'unanswered'}${marked ? ', marked for review' : ''}`}
                className={`relative flex h-9 w-full items-center justify-center rounded border-2 text-sm font-semibold ${answered ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900' : 'border-slate-400 dark:border-slate-600'} ${index === currentIndex ? 'ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-slate-950' : ''}`}
              >
                <span aria-hidden="true">{index + 1}</span>
                {marked && (
                  <span aria-hidden="true" className="absolute -top-1.5 -right-1.5 text-xs">
                    ⚑
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ol>
      <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
        Filled = answered · Outlined = unanswered · ⚑ = marked for review
      </p>
    </nav>
  )
}
```

- [ ] **Step 6: Run them and watch them pass**

Run (PowerShell): `npm test -- src/components/test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/test
git commit -m "feat: exam timer with warnings and question navigator" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
## WAVE 3 (start after Wave 2 is merged into `phase-4-exam-engine`)

Wave 3 agents F (Task 14) and G (Tasks 15–16) both edit rows of `src/router.test.jsx`. Task 14 only touches the `/attempt/abc` rows; Task 15 only touches the `/attempt/abc/results` rows. Expect a small merge conflict there, which the controller resolves.

### Task 14: The test runner (`AttemptPage`)

**Files:**

- Modify: `src/routes/AttemptPage.jsx` (full rewrite), `src/router.test.jsx`
- Test: `src/routes/AttemptPage.test.jsx`

- [ ] **Step 1: Write the failing test `src/routes/AttemptPage.test.jsx`**

```jsx
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAttempt, getAttempt, saveCurrentIndex } from '../db/attempts.js'
import { db } from '../db/db.js'
import { renderRoute } from '../test/renderRoute.jsx'
import { resetDb } from '../test/resetDb.js'

// The three fixture questions: Q1 single (correct "a"), Q2 choose two (correct "a","c"),
// Q3 single (correct "a"). Options are shown in a, b, c, d(, e) order.
vi.mock('../content/loadItems.js', async () => {
  const { makeItem, makeMultiItem } = await import('../test/itemFactories.js')
  const items = [
    makeItem({ id: 'clf-c02-1.1-0001', taskCode: '1.1' }),
    makeMultiItem({ id: 'clf-c02-1.1-0002', taskCode: '1.1' }),
    makeItem({ id: 'clf-c02-2.1-0003', taskCode: '2.1', stem: 'Which service runs virtual servers?' }),
  ]
  return {
    loadItems: async (_certId, ids) => ids.map((id) => items.find((item) => item.id === id)),
    getSubdomainItemIds: async () => [],
    getCertIndex: async () => ({}),
  }
})

const ORDER = {
  'clf-c02-1.1-0001': ['a', 'b', 'c', 'd'],
  'clf-c02-1.1-0002': ['a', 'b', 'c', 'd', 'e'],
  'clf-c02-2.1-0003': ['a', 'b', 'c', 'd'],
}

/** @param {{ mode?: 'study' | 'exam', kind?: import('../db/types.js').AttemptKind }} [options] */
function begin({ mode = 'study', kind = 'pre' } = {}) {
  return createAttempt({
    certId: 'clf-c02',
    kind,
    scopeId: 'clf-c02/1.1',
    mode,
    itemIds: Object.keys(ORDER),
    optionOrder: ORDER,
    timeLimitSec: mode === 'exam' ? 90 * 60 : null,
  })
}

beforeEach(resetDb)
afterEach(() => vi.restoreAllMocks())

describe('AttemptPage in Study mode', () => {
  it('shows the first question and keeps Submit disabled until an answer is chosen', async () => {
    const attempt = await begin()
    const user = userEvent.setup()
    renderRoute(`/attempt/${attempt.id}`)
    expect(await screen.findByRole('heading', { level: 2, name: 'Question 1 of 3' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Pre-Test' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit answer' })).toBeDisabled()
    await user.click(screen.getByRole('radio', { name: 'Amazon S3' }))
    expect(screen.getByRole('button', { name: 'Submit answer' })).toBeEnabled()
  })

  it('explains a correct answer and saves it', async () => {
    const attempt = await begin()
    const user = userEvent.setup()
    renderRoute(`/attempt/${attempt.id}`)
    await user.click(await screen.findByRole('radio', { name: 'Amazon S3' }))
    await user.click(screen.getByRole('button', { name: 'Submit answer' }))
    expect(await screen.findByRole('heading', { name: 'Explanation' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Correct')
    expect(screen.getByText('S3 is AWS object storage.')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Amazon S3' })).toBeDisabled()
    const saved = (await getAttempt(attempt.id))?.responses['clf-c02-1.1-0001']
    expect(saved).toMatchObject({ selected: ['a'], submitted: true, correct: true })
    expect(await db.itemStats.get('clf-c02-1.1-0001')).toMatchObject({ lastCorrect: true })
  })

  it('also explains a wrong answer, with a reason for every option', async () => {
    const attempt = await begin()
    const user = userEvent.setup()
    renderRoute(`/attempt/${attempt.id}`)
    await user.click(await screen.findByRole('radio', { name: 'Amazon EBS' }))
    await user.click(screen.getByRole('button', { name: 'Submit answer' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Incorrect')
    for (const text of [
      'S3 is AWS object storage.',
      'EBS is block storage for EC2.',
      'EC2 provides compute capacity.',
      'RDS is a managed database.',
    ]) {
      expect(screen.getByText(text)).toBeInTheDocument()
    }
  })

  it('caps a multiple-response selection and needs the full count to submit', async () => {
    const attempt = await begin()
    await saveCurrentIndex(attempt.id, 1)
    const user = userEvent.setup()
    renderRoute(`/attempt/${attempt.id}`)
    expect(await screen.findByText('Choose TWO')).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Pay-as-you-go pricing' }))
    expect(screen.getByRole('button', { name: 'Submit answer' })).toBeDisabled()
    await user.click(screen.getByRole('checkbox', { name: 'Elastic capacity' }))
    expect(screen.getByRole('checkbox', { name: 'Fixed capacity' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Submit answer' })).toBeEnabled()
  })

  it('moves between questions and remembers the position', async () => {
    const attempt = await begin()
    const user = userEvent.setup()
    renderRoute(`/attempt/${attempt.id}`)
    await user.click(await screen.findByRole('button', { name: 'Next question' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Question 2 of 3' })).toBeInTheDocument()
    await waitFor(async () => expect((await getAttempt(attempt.id))?.currentIndex).toBe(1))
    await user.click(screen.getByRole('button', { name: 'Previous' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Question 1 of 3' })).toBeInTheDocument()
  })

  it('resumes at the saved question', async () => {
    const attempt = await begin()
    await saveCurrentIndex(attempt.id, 2)
    renderRoute(`/attempt/${attempt.id}`)
    expect(await screen.findByRole('heading', { level: 2, name: 'Question 3 of 3' })).toBeInTheDocument()
    expect(screen.getByText('Which service runs virtual servers?')).toBeInTheDocument()
  })

  it('supports keyboard shortcuts: letter to choose, Enter to submit, N for next', async () => {
    const attempt = await begin()
    const user = userEvent.setup()
    renderRoute(`/attempt/${attempt.id}`)
    await screen.findByRole('heading', { level: 2, name: 'Question 1 of 3' })
    await user.keyboard('a')
    expect(screen.getByRole('radio', { name: 'Amazon S3' })).toBeChecked()
    await user.keyboard('2')
    expect(screen.getByRole('radio', { name: 'Amazon EBS' })).toBeChecked()
    await user.keyboard('a')
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('status')).toHaveTextContent('Correct')
    await user.keyboard('n')
    expect(await screen.findByRole('heading', { level: 2, name: 'Question 2 of 3' })).toBeInTheDocument()
  })

  it('finishes after confirming, counting unanswered questions as wrong', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const attempt = await begin()
    const user = userEvent.setup()
    const router = renderRoute(`/attempt/${attempt.id}`)
    await user.click(await screen.findByRole('button', { name: 'Finish test' }))
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('3 unanswered questions'))
    await waitFor(() => expect(router.state.location.pathname).toBe(`/attempt/${attempt.id}/results`))
    expect((await getAttempt(attempt.id))?.status).toBe('submitted')
  })

  it('stays put when the learner cancels the confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const attempt = await begin()
    const user = userEvent.setup()
    renderRoute(`/attempt/${attempt.id}`)
    await user.click(await screen.findByRole('button', { name: 'Finish test' }))
    expect((await getAttempt(attempt.id))?.status).toBe('in_progress')
  })

  it('sends a finished attempt to its results', async () => {
    const attempt = await begin()
    await db.attempts.update(attempt.id, { status: 'submitted', submittedAt: 5 })
    const router = renderRoute(`/attempt/${attempt.id}`)
    await waitFor(() => expect(router.state.location.pathname).toBe(`/attempt/${attempt.id}/results`))
  })

  it('shows the not-found page for an unknown attempt', async () => {
    renderRoute('/attempt/nope')
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
  })
})

describe('AttemptPage in Exam mode', () => {
  it('shows a timer and navigator but no feedback and no Submit answer button', async () => {
    const attempt = await begin({ mode: 'exam', kind: 'diagnostic' })
    const user = userEvent.setup()
    renderRoute(`/attempt/${attempt.id}`)
    // The deadline is 90 minutes after the attempt started, so a moment later it reads 1:29:5x.
    expect(await screen.findByRole('timer')).toHaveTextContent(/1:(30:00|29:5\d)/)
    expect(screen.getByRole('navigation', { name: 'Question navigator' })).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Amazon S3' }))
    expect(screen.queryByRole('heading', { name: 'Explanation' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Submit answer' })).not.toBeInTheDocument()
    expect(screen.queryByText('Correct')).not.toBeInTheDocument()
  })

  it('saves a changeable selection', async () => {
    const attempt = await begin({ mode: 'exam', kind: 'diagnostic' })
    const user = userEvent.setup()
    renderRoute(`/attempt/${attempt.id}`)
    await user.click(await screen.findByRole('radio', { name: 'Amazon EBS' }))
    await user.click(screen.getByRole('radio', { name: 'Amazon S3' }))
    await waitFor(async () =>
      expect((await getAttempt(attempt.id))?.responses['clf-c02-1.1-0001']).toMatchObject({
        selected: ['a'],
        submitted: false,
        correct: null,
      }),
    )
    expect(screen.getByRole('radio', { name: 'Amazon S3' })).toBeChecked()
  })

  it('marks a question for review', async () => {
    const attempt = await begin({ mode: 'exam', kind: 'diagnostic' })
    const user = userEvent.setup()
    renderRoute(`/attempt/${attempt.id}`)
    const mark = await screen.findByRole('button', { name: 'Mark for review' })
    expect(mark).toHaveAttribute('aria-pressed', 'false')
    await user.click(mark)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mark for review' })).toHaveAttribute('aria-pressed', 'true'))
    expect(screen.getByRole('button', { name: 'Question 1: unanswered, marked for review' })).toBeInTheDocument()
  })

  it('jumps with the navigator', async () => {
    const attempt = await begin({ mode: 'exam', kind: 'diagnostic' })
    const user = userEvent.setup()
    renderRoute(`/attempt/${attempt.id}`)
    await user.click(await screen.findByRole('button', { name: 'Question 3: unanswered' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Question 3 of 3' })).toBeInTheDocument()
  })

  it('submits after confirming, naming the unanswered count', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const attempt = await begin({ mode: 'exam', kind: 'diagnostic' })
    const user = userEvent.setup()
    const router = renderRoute(`/attempt/${attempt.id}`)
    await user.click(await screen.findByRole('radio', { name: 'Amazon S3' }))
    // Wait until the saved answer has flowed back into the page, or the count would be stale.
    expect(await screen.findByText(/Answered 1 of 3/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Submit exam' }))
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('2 unanswered questions'))
    await waitFor(() => expect(router.state.location.pathname).toBe(`/attempt/${attempt.id}/results`))
    const stored = await getAttempt(attempt.id)
    expect(stored?.result).toMatchObject({ correct: 1, total: 3 })
  })

  it('submits by itself when the time has run out', async () => {
    const attempt = await begin({ mode: 'exam', kind: 'diagnostic' })
    await db.attempts.update(attempt.id, { deadlineAt: Date.now() - 1_000 })
    const confirm = vi.spyOn(window, 'confirm')
    const router = renderRoute(`/attempt/${attempt.id}`)
    await waitFor(() => expect(router.state.location.pathname).toBe(`/attempt/${attempt.id}/results`))
    expect(confirm).not.toHaveBeenCalled()
    expect((await getAttempt(attempt.id))?.status).toBe('submitted')
  })

  it('does not choose answers with letter keys while typing in a text field', async () => {
    const attempt = await begin({ mode: 'exam', kind: 'diagnostic' })
    const user = userEvent.setup()
    renderRoute(`/attempt/${attempt.id}`)
    await screen.findByRole('timer')
    const field = document.createElement('input')
    field.type = 'text'
    document.body.append(field)
    field.focus()
    await user.keyboard('a')
    expect(within(screen.getByRole('main')).getByRole('radio', { name: 'Amazon S3' })).not.toBeChecked()
    field.remove()
  })
})
```

In `src/router.test.jsx`: remove the row `['/attempt/abc', 'Test in progress'],` from the first `it.each` and add `'/attempt/abc'` to the not-found list (an unknown attempt id is now a 404).

- [ ] **Step 2: Run it and watch it fail**

Run (PowerShell): `npm test -- src/routes/AttemptPage.test.jsx src/router.test.jsx`
Expected: FAIL (the page is still the "Test in progress" stub).

- [ ] **Step 3: Implement `src/routes/AttemptPage.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import ExplanationPanel from '../components/test/ExplanationPanel.jsx'
import OptionList from '../components/test/OptionList.jsx'
import QuestionCard from '../components/test/QuestionCard.jsx'
import QuestionNavigator from '../components/test/QuestionNavigator.jsx'
import Timer from '../components/test/Timer.jsx'
import Loading from '../components/ui/Loading.jsx'
import { buttonClass } from '../components/ui/styles.js'
import { getCert } from '../content/certs.js'
import { saveCurrentIndex } from '../db/attempts.js'
import { finishAttempt, lockAnswer, saveSelection, toggleMarked } from '../db/session.js'
import { TEST_KIND_LABELS } from '../engine/testKinds.js'
import { useAttempt } from '../hooks/useAttempt.js'
import { nextSelection, useSessionStore } from '../stores/useSessionStore.js'
import NotFoundPage from './NotFoundPage.jsx'

/** @typedef {import('../db/types.js').Attempt} Attempt */
/** @typedef {import('../content/types.js').LoadedItem} LoadedItem */

export default function AttemptPage() {
  const { attemptId = '' } = useParams()
  const state = useAttempt(attemptId)
  if (state.status === 'loading') return <Loading label="Loading your test…" />
  if (state.status === 'missing' || (state.status === 'ready' && state.items.length === 0)) {
    return <NotFoundPage />
  }
  if (state.status === 'error') {
    return (
      <div role="alert">
        <h1 className="text-3xl font-bold">Couldn’t load this test</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Check your connection and reload the page.
        </p>
      </div>
    )
  }
  if (state.attempt.status === 'submitted') {
    return <Navigate to={`/attempt/${attemptId}/results`} replace />
  }
  return <Runner key={state.attempt.id} attempt={state.attempt} items={state.items} />
}

/** @param {{ attempt: Attempt, items: LoadedItem[] }} props */
function Runner({ attempt, items }) {
  const navigate = useNavigate()
  const cert = getCert(attempt.certId)
  const exam = attempt.mode === 'exam'
  const [initialIndex] = useState(() =>
    Math.min(Math.max(attempt.currentIndex, 0), items.length - 1),
  )
  const [index, setIndex] = useState(initialIndex)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const pending = useSessionStore((state) => state.pendingSelection)

  useEffect(() => {
    useSessionStore.getState().start(attempt.id, initialIndex)
    return () => useSessionStore.getState().reset()
  }, [attempt.id, initialIndex])

  const item = items[index]
  const order = attempt.optionOrder[item.id] ?? item.options.map((option) => option.id)
  const response = attempt.responses[item.id]
  const locked = response?.submitted === true
  // Study mode keeps an unsubmitted choice in the session store; Exam mode saves every change.
  const selected = locked || exam ? (response?.selected ?? []) : pending
  const complete = selected.length === item.selectCount
  const answeredCount = items.filter(
    (candidate) => (attempt.responses[candidate.id]?.selected.length ?? 0) > 0,
  ).length

  /** @param {unknown} cause */
  function reportSaveError(cause) {
    console.error('Failed to save', cause)
    setError('Couldn’t save your answer. Your browser may be blocking storage.')
  }

  /** @param {number} next */
  function goTo(next) {
    if (next < 0 || next >= items.length || next === index) return
    setError('')
    setIndex(next)
    useSessionStore.getState().goTo(next)
    saveCurrentIndex(attempt.id, next).catch(reportSaveError)
  }

  /** @param {string} optionId */
  function toggle(optionId) {
    if (locked || busy) return
    if (exam) {
      saveSelection(
        attempt.id,
        item,
        nextSelection(selected, optionId, item.selectCount),
        index,
      ).catch(reportSaveError)
    } else {
      useSessionStore.getState().toggleOption(optionId, item.selectCount)
    }
  }

  async function submitAnswer() {
    if (exam || locked || !complete || busy) return
    setBusy(true)
    setError('')
    try {
      await lockAnswer(attempt.id, item, selected, index)
    } catch (cause) {
      reportSaveError(cause)
    } finally {
      setBusy(false)
    }
  }

  async function finish() {
    if (busy) return
    setBusy(true)
    try {
      await finishAttempt(attempt.id, items)
      navigate(`/attempt/${attempt.id}/results`, { replace: true })
    } catch (cause) {
      console.error('Failed to finish', cause)
      setError('Couldn’t submit the test. Please try again.')
      setBusy(false)
    }
  }

  function confirmFinish() {
    const unanswered = items.length - answeredCount
    const action = exam ? 'Submit the exam' : 'Finish the test'
    const message =
      unanswered > 0
        ? `You have ${unanswered} unanswered question${unanswered === 1 ? '' : 's'}. They will count as wrong. ${action} anyway?`
        : `${action} now?${exam ? ' You can’t change your answers afterwards.' : ''}`
    if (window.confirm(message)) finish()
  }

  // Re-registered every render so the handler always sees the current question.
  useEffect(() => {
    /** @param {KeyboardEvent} event */
    function onKeyDown(event) {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return
      const target = event.target
      if (target instanceof HTMLElement) {
        const typing =
          target.isContentEditable ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          (target instanceof HTMLInputElement && !['radio', 'checkbox'].includes(target.type))
        if (typing) return
      }
      if (event.key.length !== 1 && event.key !== 'Enter') return
      const key = event.key.toLowerCase()
      if (key === 'enter') {
        // On a button or link, Enter already means "click it".
        if (target instanceof HTMLElement && ['BUTTON', 'A'].includes(target.tagName)) return
        if (!exam && !locked && complete) {
          event.preventDefault()
          submitAnswer()
        }
        return
      }
      if (key === 'n') {
        goTo(index + 1)
        return
      }
      const position = 'abcdef'.includes(key) ? 'abcdef'.indexOf(key) : '123456'.indexOf(key)
      if (position >= 0 && order[position]) toggle(order[position])
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const marked = response?.markedForReview === true
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{TEST_KIND_LABELS[attempt.kind]}</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-300">
            {cert?.code} · {exam ? 'Exam mode' : 'Study mode'} · Answered {answeredCount} of{' '}
            {items.length}
          </p>
        </div>
        {exam && attempt.deadlineAt !== null && (
          <Timer deadlineAt={attempt.deadlineAt} onExpire={finish} />
        )}
      </div>

      <div className="mt-6">
        <QuestionCard item={item} index={index} total={items.length}>
          <OptionList
            item={item}
            order={order}
            selected={selected}
            locked={locked}
            onToggle={toggle}
          />
        </QuestionCard>

        {locked && !exam && (
          <ExplanationPanel
            key={item.id}
            item={item}
            order={order}
            selected={selected}
            correct={response?.correct === true}
            focusOnMount
          />
        )}

        {error && (
          <p role="alert" className="mt-4 text-red-700 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
            className={buttonClass('secondary')}
          >
            Previous
          </button>
          {!exam && !locked && (
            <button
              type="button"
              onClick={submitAnswer}
              disabled={!complete || busy}
              className={buttonClass('primary')}
            >
              Submit answer
            </button>
          )}
          {exam && (
            <button
              type="button"
              aria-pressed={marked}
              onClick={() => toggleMarked(attempt.id, item.id, index).catch(reportSaveError)}
              className={`${buttonClass('secondary')} ${marked ? 'border-amber-500' : ''}`}
            >
              Mark for review
            </button>
          )}
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            disabled={index === items.length - 1}
            className={buttonClass(locked && !exam ? 'primary' : 'secondary')}
          >
            Next question
          </button>
          <button
            type="button"
            onClick={confirmFinish}
            disabled={busy}
            className={buttonClass('secondary')}
          >
            {exam ? 'Submit exam' : 'Finish test'}
          </button>
        </div>
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
          Keyboard: A–F or 1–6 choose an answer{exam ? '' : ', Enter submits'}, N goes to the next
          question.
        </p>
      </div>

      {exam && (
        <div className="mt-8">
          <QuestionNavigator
            itemIds={attempt.itemIds}
            responses={attempt.responses}
            currentIndex={index}
            onGo={goTo}
          />
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 4: Run it and watch it pass**

Run (PowerShell): `npm test -- src/routes/AttemptPage.test.jsx src/router.test.jsx`
Expected: PASS. Likely adjustments, all to the *test*, not the spec:
- The shortcut test sends `a`, then `2`, then `a` again to prove both letters and digits work; if the radio assertions race the store update, wrap them in `await waitFor(...)`.
- The Study-mode "N" test needs the explanation to be visible first; it is.
- `/attempt/nope` must be a 404 only after loading finishes (`useLiveQuery` returns `undefined` first).

- [ ] **Step 5: Commit**

```bash
git add src/routes/AttemptPage.jsx src/routes/AttemptPage.test.jsx src/router.test.jsx
git commit -m "feat: test runner with study and exam modes" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Results page

**Files:**

- Modify: `src/routes/ResultsPage.jsx` (full rewrite), `src/lib/format.js`, `src/lib/format.test.js`, `src/router.test.jsx`
- Test: `src/routes/ResultsPage.test.jsx`

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/format.test.js` (import `formatDuration` too):

```js
describe('formatDuration', () => {
  it.each([
    [45_000, '45 s'],
    [725_000, '12 min 5 s'],
    [4_320_000, '1 h 12 min'],
    [0, '0 s'],
    [-5, '0 s'],
  ])('%s ms is %s', (ms, text) => {
    expect(formatDuration(ms)).toBe(text)
  })
})
```

`src/routes/ResultsPage.test.jsx`:

```jsx
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAttempt } from '../db/attempts.js'
import { finishAttempt, saveSelection, toggleMarked } from '../db/session.js'
import { makeItem, makeMultiItem } from '../test/itemFactories.js'
import { renderRoute } from '../test/renderRoute.jsx'
import { resetDb } from '../test/resetDb.js'

vi.mock('../content/loadItems.js', async () => {
  const { makeItem, makeMultiItem } = await import('../test/itemFactories.js')
  const items = [
    makeItem({ id: 'clf-c02-1.1-0001', taskCode: '1.1' }),
    makeMultiItem({ id: 'clf-c02-1.1-0002', taskCode: '1.1' }),
    makeItem({ id: 'clf-c02-2.1-0003', taskCode: '2.1', stem: 'Which service runs virtual servers?' }),
  ]
  return {
    loadItems: async (_certId, ids) => ids.map((id) => items.find((item) => item.id === id)),
    getSubdomainItemIds: async () => [],
    getCertIndex: async () => ({}),
  }
})

const ITEMS = [
  makeItem({ id: 'clf-c02-1.1-0001', taskCode: '1.1' }),
  makeMultiItem({ id: 'clf-c02-1.1-0002', taskCode: '1.1' }),
  makeItem({ id: 'clf-c02-2.1-0003', taskCode: '2.1' }),
]
const ORDER = {
  'clf-c02-1.1-0001': ['a', 'b', 'c', 'd'],
  'clf-c02-1.1-0002': ['a', 'b', 'c', 'd', 'e'],
  'clf-c02-2.1-0003': ['a', 'b', 'c', 'd'],
}

/**
 * A finished attempt: Q1 right, Q2 wrong and marked for review, Q3 unanswered.
 * @param {import('../db/types.js').AttemptKind} kind
 */
async function finished(kind) {
  const attempt = await createAttempt({
    certId: 'clf-c02',
    kind,
    scopeId: kind === 'diagnostic' ? 'clf-c02' : 'clf-c02/1.1',
    mode: 'exam',
    itemIds: ITEMS.map((item) => item.id),
    optionOrder: ORDER,
  })
  await saveSelection(attempt.id, ITEMS[0], ['a'], 0, 1_000)
  await saveSelection(attempt.id, ITEMS[1], ['a', 'b'], 1, 2_000)
  await toggleMarked(attempt.id, ITEMS[1].id, 1)
  await finishAttempt(attempt.id, ITEMS, attempt.startedAt + 725_000)
  return attempt
}

beforeEach(resetDb)

describe('ResultsPage', () => {
  it('shows the raw score and time for a Pre-Test, without a scaled score', async () => {
    const attempt = await finished('pre')
    renderRoute(`/attempt/${attempt.id}/results`)
    expect(await screen.findByRole('heading', { level: 1, name: 'Pre-Test results' })).toBeInTheDocument()
    expect(screen.getByText('You answered 1 of 3 correctly (33%).')).toBeInTheDocument()
    expect(screen.getByText(/12 min 5 s/)).toBeInTheDocument()
    expect(screen.queryByText(/scaled score/i)).not.toBeInTheDocument()
  })

  it('shows a labelled scaled-score estimate for a Diagnostic Exam', async () => {
    const attempt = await finished('diagnostic')
    renderRoute(`/attempt/${attempt.id}/results`)
    expect(await screen.findByText(/Estimated scaled score/)).toBeInTheDocument()
    expect(screen.getByText('383')).toBeInTheDocument()
    expect(screen.getByText(/This is an estimate/)).toBeInTheDocument()
    expect(screen.getByText(/Below the estimated pass mark of 700/)).toBeInTheDocument()
  })

  it('breaks the score down by domain and by task, with current mastery', async () => {
    const attempt = await finished('diagnostic')
    renderRoute(`/attempt/${attempt.id}/results`)
    const domains = await screen.findByRole('list', { name: 'Score by domain' })
    expect(domains).toHaveTextContent('Domain 1: Cloud Concepts')
    expect(domains).toHaveTextContent('1 of 2 correct (50%)')
    expect(domains).toHaveTextContent('Domain 2: Security and Compliance')
    expect(domains).toHaveTextContent('0 of 1 correct (0%)')
    const table = screen.getByRole('table', { name: 'Score by task' })
    const row = within(table).getByRole('row', { name: /1\.1/ })
    expect(row).toHaveTextContent('1 of 2')
    await waitFor(() => expect(row).toHaveTextContent('Developing'))
  })

  it('reviews every question and filters to incorrect or marked ones', async () => {
    const attempt = await finished('pre')
    const user = userEvent.setup()
    renderRoute(`/attempt/${attempt.id}/results`)
    const all = await screen.findAllByRole('article')
    expect(all).toHaveLength(3)
    await user.click(screen.getByRole('radio', { name: 'Incorrect (2)' }))
    expect(screen.getAllByRole('article')).toHaveLength(2)
    await user.click(screen.getByRole('radio', { name: 'Marked for review (1)' }))
    const marked = screen.getAllByRole('article')
    expect(marked).toHaveLength(1)
    expect(marked[0]).toHaveTextContent('Question 2')
  })

  it('explains each reviewed answer and says when a question was left blank', async () => {
    const attempt = await finished('pre')
    renderRoute(`/attempt/${attempt.id}/results`)
    const articles = await screen.findAllByRole('article')
    expect(articles[0]).toHaveTextContent('Correct')
    expect(articles[1]).toHaveTextContent('Incorrect')
    expect(within(articles[1]).getByText('Pay-as-you-go pricing')).toBeInTheDocument()
    expect(articles[2]).toHaveTextContent('Unanswered')
    expect(within(articles[2]).getByText('EBS is block storage for EC2.')).toBeInTheDocument()
  })

  it('offers a drill on weak areas', async () => {
    const attempt = await finished('pre')
    renderRoute(`/attempt/${attempt.id}/results`)
    expect(await screen.findByRole('link', { name: 'Drill weak areas' })).toHaveAttribute(
      'href',
      '/clf-c02/test/new?kind=drill',
    )
  })

  it('sends an unfinished attempt back to the runner', async () => {
    const attempt = await createAttempt({
      certId: 'clf-c02',
      kind: 'pre',
      scopeId: 'clf-c02/1.1',
      mode: 'study',
      itemIds: ITEMS.map((item) => item.id),
      optionOrder: ORDER,
    })
    const router = renderRoute(`/attempt/${attempt.id}/results`)
    await waitFor(() => expect(router.state.location.pathname).toBe(`/attempt/${attempt.id}`))
  })
})
```

In `src/router.test.jsx`: remove the row `['/attempt/abc/results', 'Results'],` from the first `it.each` and add `'/attempt/abc/results'` to the not-found list.

- [ ] **Step 2: Run them and watch them fail**

Run (PowerShell): `npm test -- src/lib/format.test.js src/routes/ResultsPage.test.jsx src/router.test.jsx`
Expected: FAIL (`formatDuration` missing; the page is a stub).

- [ ] **Step 3: Add `formatDuration` to `src/lib/format.js`**

Append:

```js
/**
 * @param {number} ms
 * @returns {string} e.g. "45 s", "12 min 5 s", "1 h 12 min"
 */
export function formatDuration(ms) {
  const total = Math.max(0, Math.round(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  if (hours > 0) return `${hours} h ${minutes} min`
  if (minutes > 0) return `${minutes} min ${seconds} s`
  return `${seconds} s`
}
```

- [ ] **Step 4: Implement `src/routes/ResultsPage.jsx`**

```jsx
import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import MasteryBadge from '../components/curriculum/MasteryBadge.jsx'
import Markdown from '../components/markdown/Markdown.jsx'
import ExplanationPanel from '../components/test/ExplanationPanel.jsx'
import { AlertCircleIcon, CheckCircleIcon } from '../components/ui/icons.jsx'
import Loading from '../components/ui/Loading.jsx'
import { buttonClass } from '../components/ui/styles.js'
import { getCert, getSubdomain } from '../content/certs.js'
import { NO_MASTERY } from '../engine/mastery.js'
import { isExamKind } from '../engine/testConfig.js'
import { TEST_KIND_LABELS } from '../engine/testKinds.js'
import { useAttempt } from '../hooks/useAttempt.js'
import { useCertProgress } from '../hooks/useCertProgress.js'
import { formatDuration, formatPct } from '../lib/format.js'
import NotFoundPage from './NotFoundPage.jsx'

/** @typedef {import('../db/types.js').Attempt} Attempt */
/** @typedef {import('../db/types.js').AttemptResult} AttemptResult */
/** @typedef {import('../content/types.js').LoadedItem} LoadedItem */
/** @typedef {'all' | 'incorrect' | 'marked'} ReviewFilter */

export default function ResultsPage() {
  const { attemptId = '' } = useParams()
  const state = useAttempt(attemptId)
  if (state.status === 'loading') return <Loading label="Loading your results…" />
  if (state.status === 'missing') return <NotFoundPage />
  if (state.status === 'error') {
    return (
      <div role="alert">
        <h1 className="text-3xl font-bold">Couldn’t load these results</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Check your connection and reload the page.
        </p>
      </div>
    )
  }
  const { attempt, items } = state
  if (attempt.status !== 'submitted' || !attempt.result) {
    return <Navigate to={`/attempt/${attemptId}`} replace />
  }
  return <Results attempt={attempt} result={attempt.result} items={items} />
}

/** @param {{ correct: number, total: number }} tally */
const describeTally = (tally) =>
  `${tally.correct} of ${tally.total} correct (${tally.total === 0 ? 0 : Math.round((tally.correct / tally.total) * 100)}%)`

/** @param {{ attempt: Attempt, result: AttemptResult, items: LoadedItem[] }} props */
function Results({ attempt, result, items }) {
  const cert = getCert(attempt.certId)
  const progress = useCertProgress(attempt.certId)
  const exam = isExamKind(attempt.kind)
  const [filter, setFilter] = useState(/** @type {ReviewFilter} */ ('all'))

  const rows = items.map((item, index) => {
    const response = attempt.responses[item.id]
    return { item, index, response }
  })
  const incorrect = rows.filter((row) => row.response?.correct !== true)
  const marked = rows.filter((row) => row.response?.markedForReview === true)
  /** @type {Record<ReviewFilter, typeof rows>} */
  const shown = { all: rows, incorrect, marked }
  /** @type {{ value: ReviewFilter, label: string }[]} */
  const filters = [
    { value: 'all', label: `All (${rows.length})` },
    { value: 'incorrect', label: `Incorrect (${incorrect.length})` },
    { value: 'marked', label: `Marked for review (${marked.length})` },
  ]

  return (
    <>
      <h1 className="text-3xl font-bold">{TEST_KIND_LABELS[attempt.kind]} results</h1>
      <p className="mt-1 text-slate-600 dark:text-slate-300">
        {cert?.code} · {attempt.mode === 'exam' ? 'Exam mode' : 'Study mode'}
        {attempt.submittedAt !== null && ` · Time used: ${formatDuration(attempt.submittedAt - attempt.startedAt)}`}
      </p>

      <section aria-labelledby="score-heading" className="mt-6">
        <h2 id="score-heading" className="text-xl font-semibold">
          Your score
        </h2>
        <p className="mt-2 text-lg">
          You answered {result.correct} of {result.total} correctly ({formatPct(result.pct)}).
        </p>
        {exam && cert && (
          <div className="mt-3 rounded-lg border border-slate-300 p-4 dark:border-slate-700">
            <p className="text-lg">
              Estimated scaled score: <strong className="tabular-nums">{result.scaledEstimate}</strong>{' '}
              out of 1000
            </p>
            <p className="mt-1 flex items-center gap-2 font-semibold">
              {result.passed ? (
                <CheckCircleIcon className="size-5 text-emerald-700 dark:text-emerald-400" />
              ) : (
                <AlertCircleIcon className="size-5 text-amber-700 dark:text-amber-300" />
              )}
              {result.passed
                ? `At or above the estimated pass mark of ${cert.exam.passScaled}`
                : `Below the estimated pass mark of ${cert.exam.passScaled}`}
            </p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              This is an estimate. AWS doesn’t publish how raw scores become scaled scores, so the
              real exam may differ.
            </p>
          </div>
        )}
        <p className="mt-4 flex flex-wrap gap-3">
          <Link to={`/${attempt.certId}/test/new?kind=drill`} className={buttonClass('primary')}>
            Drill weak areas
          </Link>
          <Link to={`/${attempt.certId}`} className={buttonClass('secondary')}>
            Back to dashboard
          </Link>
        </p>
      </section>

      <section aria-labelledby="domains-heading" className="mt-8">
        <h2 id="domains-heading" className="text-xl font-semibold">
          By domain
        </h2>
        <ul aria-label="Score by domain" className="mt-3 space-y-3">
          {(cert?.domains ?? []).flatMap((domain) => {
            const tally = result.byDomain[domain.id]
            if (!tally) return []
            const pct = tally.total === 0 ? 0 : (tally.correct / tally.total) * 100
            return [
              <li key={domain.id}>
                <p className="font-medium">
                  Domain {domain.no}: {domain.title}
                </p>
                <p className="text-sm">{describeTally(tally)}</p>
                <div
                  aria-hidden="true"
                  className="mt-1 h-2 rounded bg-slate-200 dark:bg-slate-800"
                >
                  <div
                    className="h-2 rounded bg-slate-700 dark:bg-slate-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>,
            ]
          })}
        </ul>
      </section>

      <section aria-labelledby="tasks-heading" className="mt-8">
        <h2 id="tasks-heading" className="text-xl font-semibold">
          By task
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table aria-label="Score by task" className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-300 dark:border-slate-700">
                <th scope="col" className="py-2 pr-4">
                  Task
                </th>
                <th scope="col" className="py-2 pr-4">
                  This test
                </th>
                <th scope="col" className="py-2">
                  Your mastery now
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(result.bySubdomain).map(([id, tally]) => {
                const code = id.split('/')[1]
                const sub = getSubdomain(attempt.certId, code)
                return (
                  <tr key={id} className="border-b border-slate-200 dark:border-slate-800">
                    <th scope="row" className="py-2 pr-4 font-normal">
                      <Link
                        to={`/${attempt.certId}/s/${code}`}
                        className="underline underline-offset-2"
                      >
                        {code}
                      </Link>{' '}
                      {sub?.title}
                    </th>
                    <td className="py-2 pr-4">
                      {tally.correct} of {tally.total}
                    </td>
                    <td className="py-2">
                      {progress ? (
                        <MasteryBadge mastery={progress.mastery.get(id) ?? NO_MASTERY} />
                      ) : (
                        '…'
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="review-heading" className="mt-8">
        <h2 id="review-heading" className="text-xl font-semibold">
          Review your answers
        </h2>
        <fieldset className="mt-3">
          <legend className="sr-only">Show</legend>
          <div className="flex flex-wrap gap-3">
            {filters.map((option) => (
              <label key={option.value} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="review-filter"
                  value={option.value}
                  checked={filter === option.value}
                  onChange={() => setFilter(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-4 space-y-8">
          {shown[filter].map(({ item, index, response }) => {
            const answered = (response?.selected.length ?? 0) > 0
            const right = response?.correct === true
            const order = attempt.optionOrder[item.id] ?? item.options.map((option) => option.id)
            const headingId = `review-${item.id}`
            return (
              <article key={item.id} aria-labelledby={headingId}>
                <h3 id={headingId} className="font-semibold">
                  Question {index + 1} ·{' '}
                  {right ? 'Correct' : answered ? 'Incorrect' : 'Unanswered'}
                  {response?.markedForReview ? ' · Marked for review' : ''}
                </h3>
                <div className="mt-2">
                  <Markdown variant="inline">{item.stem}</Markdown>
                </div>
                <ExplanationPanel
                  item={item}
                  order={order}
                  selected={response?.selected ?? []}
                  correct={right}
                />
              </article>
            )
          })}
        </div>
      </section>
    </>
  )
}
```

- [ ] **Step 5: Run them and watch them pass**

Run (PowerShell): `npm test -- src/lib/format.test.js src/routes/ResultsPage.test.jsx src/router.test.jsx`
Expected: PASS. The scaled-score assertion relies on 1 of 3 correct = 33% → `100 + 33/70*600 = 382.86 → 383`. If `getByText('383')` finds more than one element, scope it with `within(...)`.

- [ ] **Step 6: Commit**

```bash
git add src/routes/ResultsPage.jsx src/routes/ResultsPage.test.jsx src/lib/format.js src/lib/format.test.js src/router.test.jsx
git commit -m "feat: results page with breakdowns and answer review" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 16: In-progress tests on the dashboard

**Files:**

- Modify: `src/routes/CertDashboardPage.jsx`
- Test: `src/routes/CertDashboardPage.test.jsx`

- [ ] **Step 1: Write the failing tests**

Add these imports at the top of `src/routes/CertDashboardPage.test.jsx` if missing: `import userEvent from '@testing-library/user-event'`, `import { vi } from 'vitest'` (extend the existing vitest import), `import { createAttempt, getAttempt } from '../db/attempts.js'`, `import { saveResponse } from '../db/attempts.js'`. Append inside the file:

```jsx
describe('In progress', () => {
  /** @param {import('../db/types.js').AttemptKind} [kind] */
  const begin = (kind = 'pre') =>
    createAttempt({
      certId: 'clf-c02',
      kind,
      scopeId: 'clf-c02/1.1',
      mode: 'study',
      itemIds: ['clf-c02-1.1-0001', 'clf-c02-1.1-0002', 'clf-c02-1.1-0003'],
      optionOrder: {},
    })

  it('is hidden when nothing is unfinished', async () => {
    renderRoute('/clf-c02')
    await screen.findByRole('heading', { name: 'Practice exams' })
    expect(screen.queryByRole('heading', { name: 'In progress' })).not.toBeInTheDocument()
  })

  it('lists unfinished tests with progress and a way to resume', async () => {
    const attempt = await begin()
    await saveResponse(
      attempt.id,
      'clf-c02-1.1-0001',
      { selected: ['a'], submitted: true, correct: true, markedForReview: false, answeredAt: 5 },
      0,
    )
    await db.attempts.add(makeAttempt({ kind: 'post', status: 'submitted' }))
    renderRoute('/clf-c02')
    const list = await screen.findByRole('list', { name: 'Unfinished tests' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(1)
    expect(list).toHaveTextContent('Pre-Test')
    expect(list).toHaveTextContent('1 of 3 answered')
    expect(within(list).getByRole('link', { name: /^Resume Pre-Test/ })).toHaveAttribute(
      'href',
      `/attempt/${attempt.id}`,
    )
  })

  it('discards an unfinished test after confirmation', async () => {
    const attempt = await begin()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    renderRoute('/clf-c02')
    await user.click(await screen.findByRole('button', { name: /^Discard Pre-Test/ }))
    await waitFor(async () => expect(await getAttempt(attempt.id)).toBeUndefined())
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'In progress' })).not.toBeInTheDocument(),
    )
  })

  it('keeps it when the learner cancels', async () => {
    const attempt = await begin()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    renderRoute('/clf-c02')
    await user.click(await screen.findByRole('button', { name: /^Discard Pre-Test/ }))
    expect(await getAttempt(attempt.id)).toBeDefined()
  })
})
```

(`waitFor` and `within` come from `@testing-library/react`; add them to its import if missing. `makeAttempt` is already imported in this file from earlier Phase 3 tests.)

- [ ] **Step 2: Run them and watch them fail**

Run (PowerShell): `npm test -- src/routes/CertDashboardPage.test.jsx`
Expected: FAIL (no "In progress" section).

- [ ] **Step 3: Implement in `src/routes/CertDashboardPage.jsx`**

Add imports:

```jsx
import { deleteAttempt } from '../db/attempts.js'
import { formatDate } from '../lib/format.js'
```

(`formatDate` joins the existing `describeMastery, formatWeight` import from `'../lib/format.js'`, so merge them into one import.) In `DashboardBody`, add this section as the **first child** of the fragment, above `<section aria-labelledby="exams-heading" …>`:

```jsx
      <InProgress attempts={progress.attempts.filter((attempt) => attempt.status === 'in_progress')} />
```

and add this component at the bottom of the file:

```jsx
/** @param {{ attempts: import('../db/types.js').Attempt[] }} props */
function InProgress({ attempts }) {
  if (attempts.length === 0) return null
  return (
    <section aria-labelledby="inprogress-heading" className="mt-6">
      <h2 id="inprogress-heading" className="text-xl font-semibold">
        In progress
      </h2>
      <ul aria-label="Unfinished tests" className="mt-3 space-y-2">
        {attempts.map((attempt) => {
          const label = TEST_KIND_LABELS[attempt.kind]
          const answered = Object.values(attempt.responses).filter(
            (response) => response.selected.length > 0,
          ).length
          const started = formatDate(attempt.startedAt)
          return (
            <li
              key={attempt.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
            >
              <div>
                <p className="font-medium">{label}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Started {started} · {answered} of {attempt.itemIds.length} answered
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  to={`/attempt/${attempt.id}`}
                  aria-label={`Resume ${label} started ${started}`}
                  className={buttonClass('primary')}
                >
                  Resume
                </Link>
                <button
                  type="button"
                  aria-label={`Discard ${label} started ${started}`}
                  onClick={() => {
                    if (window.confirm('Discard this unfinished test? Your answers in it will be lost.')) {
                      deleteAttempt(attempt.id).catch((error) =>
                        console.error('Failed to discard attempt', error),
                      )
                    }
                  }}
                  className={buttonClass('danger')}
                >
                  Discard
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
```

Because the section appears above "Practice exams", the dashboard's "New here? Start with the Diagnostic Exam" hint still uses `progress.answeredCount === 0` and is unaffected.

- [ ] **Step 4: Run them and watch them pass**

Run (PowerShell): `npm test -- src/routes/CertDashboardPage.test.jsx src/router.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/routes/CertDashboardPage.jsx src/routes/CertDashboardPage.test.jsx
git commit -m "feat: resume or discard unfinished tests from the dashboard" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## WAVE 4 (controller or one agent, directly on `phase-4-exam-engine`)

### Task 17: End-to-end flows and accessibility

**Files:**

- Create: `e2e/helpers.js`, `e2e/attempt.spec.js`
- Modify: `e2e/a11y.spec.js`

Run Playwright only through PowerShell: `npm run test:e2e` (it builds and previews on port 4173; if Chromium is missing run `npx playwright install chromium`).

- [ ] **Step 0: Write the shared helpers `e2e/helpers.js`**

```js
const COUNT_WORDS = { TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 }

/** Chooses a complete (not necessarily correct) answer for the question on screen. */
export async function chooseAnswer(page) {
  const badge = page.getByText(/^Choose [A-Z]+$/)
  if (await badge.count()) {
    const word = (await badge.first().textContent()).replace('Choose ', '')
    const boxes = page.getByRole('checkbox')
    for (let i = 0; i < COUNT_WORDS[word]; i += 1) await boxes.nth(i).check()
  } else {
    await page.getByRole('radio').first().check()
  }
}

/** All attempts stored in IndexedDB. */
export function readAttempts(page) {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('awsprep')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const db = open.result
          const all = db.transaction('attempts').objectStore('attempts').getAll()
          all.onsuccess = () => {
            db.close()
            resolve(all.result)
          }
          all.onerror = () => reject(all.error)
        }
      }),
  )
}
```

- [ ] **Step 1: Write `e2e/attempt.spec.js`**

```js
import { expect, test } from '@playwright/test'
import { chooseAnswer, readAttempts } from './helpers.js'

test('Pre-Test: answer, see the explanation, reload and resume', async ({ page }) => {
  await page.goto('./#/clf-c02/s/1.1')
  await page.getByRole('link', { name: 'Pre-Test' }).click()
  await page.getByRole('radio', { name: '5' }).check()
  await page.getByRole('button', { name: 'Start Pre-Test' }).click()

  await expect(page.getByRole('heading', { level: 2, name: 'Question 1 of 5' })).toBeVisible()
  const submit = page.getByRole('button', { name: 'Submit answer' })
  await expect(submit).toBeDisabled()
  await chooseAnswer(page)
  await submit.click()
  await expect(page.getByRole('heading', { name: 'Explanation' })).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: /^(Correct|Incorrect)$/ })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { level: 2, name: 'Question 1 of 5' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Explanation' })).toBeVisible()

  await page.getByRole('button', { name: 'Next question' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Question 2 of 5' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { level: 2, name: 'Question 2 of 5' })).toBeVisible()
})

test('Diagnostic in Exam mode: timer, no feedback, submit, results and heatmap', async ({ page }) => {
  await page.goto('./#/clf-c02/test/new?kind=diagnostic')
  await page.getByRole('button', { name: 'Start Diagnostic Exam' }).click()
  await expect(page.getByRole('timer')).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Question 1 of 65' })).toBeVisible()
  await chooseAnswer(page)
  await expect(page.getByRole('heading', { name: 'Explanation' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Submit answer' })).toHaveCount(0)

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Submit exam' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Diagnostic Exam results' })).toBeVisible()
  await expect(page.getByText(/Estimated scaled score/)).toBeVisible()
  await expect(page.getByText(/This is an estimate/)).toBeVisible()

  await page.goto('./#/clf-c02')
  await expect(page.getByRole('list', { name: /^Domain 1:/ }).getByText('Weak').first()).toBeVisible()
})

test('a Post-Test repeats no Pre-Test question while unseen ones remain', async ({ page }) => {
  await page.goto('./#/clf-c02/test/new?kind=pre&scope=1.1')
  await page.getByRole('radio', { name: '10' }).check()
  await page.getByRole('button', { name: 'Start Pre-Test' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Question 1 of 10' })).toBeVisible()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Finish test' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Pre-Test results' })).toBeVisible()

  await page.goto('./#/clf-c02/test/new?kind=post&scope=1.1')
  await page.getByRole('radio', { name: '10' }).check()
  await page.getByRole('button', { name: 'Start Post-Test' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Question 1 of 10' })).toBeVisible()

  const attempts = await readAttempts(page)
  const pre = attempts.find((attempt) => attempt.kind === 'pre')
  const post = attempts.find((attempt) => attempt.kind === 'post')
  expect(pre.itemIds).toHaveLength(10)
  expect(post.itemIds.filter((id) => pre.itemIds.includes(id))).toEqual([])
})

test('starting a one-task test loads far fewer scripts than starting an exam', async ({
  browser,
  baseURL,
}) => {
  /** Counts script requests made between clicking Start and the runner showing. */
  async function scriptsLoadedBy(url, startName, firstHeading) {
    // A hand-made context does not inherit the config's baseURL, so pass it in.
    const context = await browser.newContext({ baseURL })
    const page = await context.newPage()
    await page.goto(url)
    await page.getByRole('button', { name: startName }).waitFor()
    let count = 0
    page.on('request', (request) => {
      if (request.resourceType() === 'script') count += 1
    })
    await page.getByRole('button', { name: startName }).click()
    await expect(page.getByRole('heading', { level: 2, name: firstHeading })).toBeVisible()
    await context.close()
    return count
  }
  const single = await scriptsLoadedBy(
    './#/clf-c02/test/new?kind=pre&scope=1.1',
    'Start Pre-Test',
    /^Question 1 of 10$/,
  )
  const exam = await scriptsLoadedBy(
    './#/clf-c02/test/new?kind=diagnostic',
    'Start Diagnostic Exam',
    /^Question 1 of 65$/,
  )
  expect(single).toBeLessThan(exam)
})
```

- [ ] **Step 2: Extend `e2e/a11y.spec.js`**

Add `import { chooseAnswer } from './helpers.js'` to the imports at the top, then append (keep the existing tests):

```js
/** Starts a Pre-Test (Study mode) or the Diagnostic (Exam mode) and returns on its first question. */
async function openRunner(page, mode) {
  if (mode === 'study') {
    await page.goto('./#/clf-c02/test/new?kind=pre&scope=1.1')
    await page.getByRole('button', { name: 'Start Pre-Test' }).click()
  } else {
    await page.goto('./#/clf-c02/test/new?kind=diagnostic')
    await page.getByRole('button', { name: 'Start Diagnostic Exam' }).click()
  }
  await expect(page.getByRole('heading', { level: 2, name: /^Question 1 of / })).toBeVisible()
}

async function expectNoViolations(page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(results.violations).toEqual([])
}

for (const theme of ['light', 'dark']) {
  test(`study runner with an explanation has no violations (${theme} theme)`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem('theme', value), theme)
    await openRunner(page, 'study')
    await chooseAnswer(page)
    await page.getByRole('button', { name: 'Submit answer' }).click()
    await expect(page.getByRole('heading', { name: 'Explanation' })).toBeVisible()
    await page.getByRole('button', { name: 'Report issue' }).click()
    await expectNoViolations(page)
  })

  test(`exam runner has no violations (${theme} theme)`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem('theme', value), theme)
    await openRunner(page, 'exam')
    await expect(page.getByRole('timer')).toBeVisible()
    await expectNoViolations(page)
  })

  test(`results page has no violations (${theme} theme)`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem('theme', value), theme)
    await openRunner(page, 'exam')
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Submit exam' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Diagnostic Exam results' })).toBeVisible()
    await expectNoViolations(page)
  })
}
```

- [ ] **Step 3: Run the suite**

Run (PowerShell): `npm run test:e2e`
Expected: everything passes (the existing 20 plus the new 4 flow tests and 6 accessibility tests). Fix any axe violation at the source (component/CSS), never by excluding elements. Likely causes: low contrast of `text-slate-600` on tinted backgrounds, a `<ol>` or `<ul>` with a `list-style` role problem, duplicate ids from many `ExplanationPanel`s on the results page (the Markdown `inline` variant exists to avoid this). If the Pre-Test's "Question 1 of 10" heading text is for 10 questions but the default length is 10, the first test sets 5; keep the radio click.

- [ ] **Step 4: Commit**

```bash
git add e2e
git commit -m "test: e2e for study and exam flows, no-repeat Post-Test and axe on the runner" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 18: Docs and full verification

**Files:**

- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the status line in `CLAUDE.md`**

Replace the bullet that starts `- Phases 1 (app shell, data layer), 2 (content engine, seed content) and 3 (curriculum UI) are done.` with:

```
- Phases 1 (app shell, data layer), 2 (content engine, seed content), 3 (curriculum UI) and 4 (exam engine) are done. Phase 5 (deploy) and 6 (bulk content) are not built yet.
```

- [ ] **Step 2: Add a Phase 4 section to `CLAUDE.md`**

Insert before `**Routing.**` (after the Curriculum UI block):

```markdown
**Exam engine (Phase 4).**

- `src/engine/` holds pure logic (no DB): `rng.js` (seeded), `blueprint.js` (largest-remainder allocation, even spreading), `selectItems.js` (unseen-first), `drill.js`, `grading.js` (`isCorrect`, `finalizeResponses`, `scoreAttempt`, `buildResult`) and `scaledScore.js`. `startTest.js` orchestrates selection, shard loading and `createAttempt`.
- `src/db/session.js` is the only place answers are applied:
  - `lockAnswer` (Study mode) saves the response and `itemStats` in one transaction.
  - `saveSelection` and `toggleMarked` (Exam mode) save ungraded changes.
  - `finishAttempt` grades everything, records `itemStats` for items not already locked, and stores the result atomically. Afterwards it calls `requestPersistence()`.
- Unanswered questions count as wrong in the score, in mastery and in `itemStats`.
- Selection draws only from the cert index's `shards` (active ids). The index's `retired` map keeps withdrawn items loadable so old attempts still resume and show results.
- The runner (`routes/AttemptPage.jsx`) redirects a submitted attempt to its results; results redirect an unfinished attempt to the runner. A timed attempt past its deadline auto-finishes when opened.
- Question text and explanations use `<Markdown variant="inline">` (no heading ids, so many can share a page).
- Component tests that need questions mock `content/loadItems.js` and use `src/test/itemFactories.js`.
- Vitest's `testTimeout` is 15 s because lazy routes load slowly on a busy machine.
```

- [ ] **Step 3: Run the full verification**

Run (Bash): `npm run validate:content && npm run lint && npm run typecheck && npm run format:check`
Expected: content 0 errors / 0 warnings; lint, typecheck and format clean.

Run (PowerShell): `npm test`
Expected: all pass.

Run (PowerShell): `npm run test:e2e`
Expected: all pass.

- [ ] **Step 4: Manual check (`npm run dev`, spec §Verification step 2)**

1. Diagnostic in Exam mode: the timer is visible; submit; results and the heatmap fill in.
2. Open the weakest task and take its Pre-Test: an explanation appears after every answer.
3. Read the Review; take the Post-Test: no question repeats from the Pre-Test.
4. Domain Assessment, then Weak-Area Drill.
5. Refresh mid-test: it resumes at the same question. Start a test, leave, and Resume or Discard it from the dashboard.
6. DevTools Network: starting a one-task test loads only that task's shard chunk.
7. Layout at 320 px wide; keyboard-only run through a Study test.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document the Phase 4 exam engine" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Finish the branch**

Use superpowers:finishing-a-development-branch to open a PR from `phase-4-exam-engine` into `phase-1-init`. Ask the user before pushing.

---

## Spec coverage check

| Spec Phase 4 item | Task |
| --- | --- |
| Unseen-first selection for every kind; oldest-seen fill; exclude retired and duplicates | 3, 4 (`pools` contain only active ids), Wave 0 retired map |
| Exam blueprint (CLF 16/19/22/8; AIF 13/16/18/9/9), round-robin across tasks | 2, 3 |
| Domain Assessment spread across tasks | 3 |
| Drill: ~50% missed + weakest by (1 − mastery) × weight | 4 |
| Option order shuffled and stored | 9 |
| Grading all-or-nothing for multiple response; `scoreAttempt`; scaled estimate; pass at 700 | 5, 6 |
| Every graded answer updates `itemStats` in one transaction | 7, 8 |
| Runner: Question card, "Choose TWO" badge, capped checkboxes, Submit gating | 11, 14 |
| Keys A–F / 1–6, Enter, N | 14 |
| Study mode explanation: banner with icon + text and aria-live, correct/chosen marked, rationale for every option, explanation, references, Report issue, focus to panel heading | 12, 14 |
| Exam mode: no feedback, changeable answers, mark for review, navigator, timer with 10-min/1-min warnings, auto-submit, confirm with unanswered count | 8, 13, 14 |
| Results: raw %, labelled scaled estimate + pass/fail, per-domain bars, per-sub-domain table with mastery band, time used, Drill CTA, review list with All/Incorrect/Marked | 15 |
| Resume: in-progress list on the dashboard; refresh resumes at `currentIndex` | 14, 16 |
| Persistence request after the first submitted attempt | 8 |
| Exit: Vitest for selection/grading/scaled score/mastery/drill; RTL for MR cap, Submit gating, explanation on every answer, exam-mode suppression; Playwright flows | 1–16 tests, 17 |
