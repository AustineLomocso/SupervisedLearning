# Phase 1 — Project Initialization & Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the React + Vite app skeleton for the AWS cert review app: tooling, routing for every screen, the IndexedDB data layer (schema + repositories + backup + persistence), Zustand stores, accessible layout shell, and unit + E2E test infrastructure.

**Architecture:** Static SPA built with Vite and served from `/SupervisedLearning/` on GitHub Pages. HashRouter with one lazy chunk per page. Durable learner data lives in IndexedDB through Dexie behind small repository modules (`src/db/*`); transient UI/session state lives in Zustand (`src/stores/*`). Plain JavaScript with JSDoc types, type-checked by `tsc --checkJs`.

**Tech Stack:** Node 24, Vite 8.3, React 19.3, react-router-dom 7.18 (HashRouter), Zustand 5, Dexie 4.4, Tailwind CSS 4.3, Vitest 5 + jsdom + React Testing Library + fake-indexeddb, Playwright 1.64, oxlint 1.87, Prettier 3.9, TypeScript 5.9 (type-check only).

**Spec:** `docs/superpowers/specs/2026-10-13-aws-cert-review-design.md`

---

## Deviations from the spec (decided while planning, verified in a scratch probe)

| Spec said | Plan does | Why |
|---|---|---|
| ESLint (flat) + react-hooks + jsx-a11y | **oxlint** with `react`, `jsx-a11y`, `oxc` plugins, run with `--deny-warnings` | The official Vite React template now ships oxlint; `eslint-plugin-jsx-a11y` does not support ESLint 10. Oxlint has jsx-a11y, rules-of-hooks and exhaustive-deps built in (verified). |
| `typescript` (type-check) | Pinned to **TypeScript 5.9.3** | TS 7 is the native-port compiler; its JS/JSDoc checking was not verified. 5.9 passes on JSX, Dexie and Zustand JSDoc types (verified). |
| Type-check everything under `src` | Test files and `src/test/` are **excluded** from `tsc` | `fake-indexeddb/auto` ships untyped JS that `checkJs` would check. Vitest still runs every test. |
| `tests/e2e/*.spec.js` | `e2e/*.spec.js` at the repo root | Keeps Playwright separate from Vitest's `src/**/*.test.*` glob. |
| `validate:content` / `build:index` scripts in Phase 1 | Added in **Phase 2** | There is no content or blueprint yet; empty scripts would be placeholders. |
| `zod` installed in Phase 1 | Installed in **Phase 2** with the content validator | Nothing in Phase 1 uses it; the backup importer checks its envelope by hand. |
| Domain list on the cert dashboard | Phase 2/3 | Domain data comes from the Phase 2 blueprint. Phase 1 pages are routable skeletons with real headings and links. |

---

## File structure created in this phase

```
SupervisedLearning/
├─ .gitignore  .nvmrc  .oxlintrc.json  .prettierrc.json  .prettierignore
├─ index.html                     # theme bootstrap script (no flash of wrong theme)
├─ package.json  package-lock.json
├─ vite.config.js                 # base path, Tailwind, Vitest config
├─ jsconfig.json                  # checkJs strict type-check
├─ playwright.config.js
├─ README.md
├─ public/favicon.svg
├─ e2e/app.spec.js
└─ src/
   ├─ main.jsx                    # boot: theme, open DB, HashRouter
   ├─ index.css                   # Tailwind + dark variant + a11y base styles
   ├─ router.jsx                  # route table (shared by app and tests)
   ├─ content/
   │  ├─ certs.js                 # cert registry (Phase 2 swaps in manifest data, same API)
   │  └─ ids.js                   # canonical domain/sub-domain id builders
   ├─ engine/testKinds.js         # test kind labels + guard
   ├─ hooks/useCert.js
   ├─ db/
   │  ├─ types.js                 # JSDoc typedefs for all persisted records
   │  ├─ db.js                    # Dexie schema v1 + openDatabase()
   │  ├─ attempts.js  itemStats.js  progress.js  flags.js  settings.js
   │  ├─ backup.js                # export / replace-import
   │  └─ persist.js               # navigator.storage persistence
   ├─ stores/
   │  ├─ useUiStore.js            # theme + storage error flag
   │  └─ useSessionStore.js       # active attempt runtime + capped option selection
   ├─ components/layout/
   │  ├─ AppShell.jsx  SkipLink.jsx  Header.jsx  Breadcrumbs.jsx  Footer.jsx  StorageWarning.jsx
   ├─ routes/
   │  ├─ HomePage.jsx  CertGuard.jsx  CertDashboardPage.jsx  DomainPage.jsx  SubdomainPage.jsx
   │  ├─ ReviewPage.jsx  TestSetupPage.jsx  AttemptPage.jsx  ResultsPage.jsx
   │  ├─ SettingsPage.jsx  NotFoundPage.jsx  RouteError.jsx
   └─ test/
      ├─ setup.js  resetDb.js  renderRoute.jsx  stubStorage.js
```

Each `*.js`/`*.jsx` with logic gets a co-located `*.test.js(x)`.

---

### Task 1: Scaffold tooling and dependencies

**Files:**
- Create: `package.json`, `.nvmrc`, `.gitignore`, `.prettierrc.json`, `.prettierignore`, `.oxlintrc.json`, `jsconfig.json`, `vite.config.js`, `index.html`, `public/favicon.svg`, `src/main.jsx`, `src/index.css`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "supervised-learning",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "engines": {
    "node": ">=24"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "lint": "oxlint --deny-warnings",
    "typecheck": "tsc -p jsconfig.json",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

- [ ] **Step 2: Install dependencies (exact current versions)**

Run:
```bash
npm install react@19.3.0 react-dom@19.3.0 react-router-dom@7.18.4 zustand@5.0.15 dexie@4.4.6 dexie-react-hooks@4.4.0
npm install -D vite@8.3.4 @vitejs/plugin-react@6.1.2 tailwindcss@4.3.3 @tailwindcss/vite@4.3.3 vitest@5.0.4 jsdom@30.1.2 @testing-library/react@16.3.3 @testing-library/dom@10.4.2 @testing-library/user-event@14.6.7 @testing-library/jest-dom@7.0.1 fake-indexeddb@6.2.5 @playwright/test@1.64.0 oxlint@1.87.0 prettier@3.9.10 typescript@5.9.3 @types/react@19.3.0 @types/react-dom@19.3.0
```
Expected: both finish with `added N packages`, no `ERESOLVE` errors.

- [ ] **Step 3: Create `.nvmrc`**

```
24
```

- [ ] **Step 4: Create `.gitignore`**

```gitignore
node_modules
dist
dist-ssr
*.local
*.log

# Playwright
playwright-report
test-results
blob-report

# Editors / OS
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
```

- [ ] **Step 5: Create `.prettierrc.json` and `.prettierignore`**

`.prettierrc.json`:
```json
{
  "semi": false,
  "singleQuote": true,
  "printWidth": 100
}
```

`.prettierignore`:
```
dist
docs
playwright-report
test-results
package-lock.json
```

- [ ] **Step 6: Create `.oxlintrc.json`**

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "jsx-a11y", "oxc"],
  "rules": {
    "react/rules-of-hooks": "error",
    "react/exhaustive-deps": "warn",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  },
  "overrides": [
    {
      "files": ["src/router.jsx", "src/test/**", "**/*.test.jsx"],
      "rules": { "react/only-export-components": "off" }
    }
  ],
  "ignorePatterns": ["dist", "playwright-report", "test-results"]
}
```

- [ ] **Step 7: Create `jsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "allowJs": true,
    "checkJs": true,
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "types": ["vite/client"]
  },
  "include": ["src", "vite.config.js"],
  "exclude": ["src/**/*.test.js", "src/**/*.test.jsx", "src/test"]
}
```

- [ ] **Step 8: Create `vite.config.js`**

```js
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
```

- [ ] **Step 9: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta
      name="description"
      content="Free study app for the AWS Certified Cloud Practitioner (CLF-C02) and AWS Certified AI Practitioner (AIF-C01) exams."
    />
    <title>AWS Practitioner Exam Prep</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 10: Create `public/favicon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#0f172a"/>
  <path d="M8 21l4-10 4 10M9.5 17.5h5M18 11h6M21 11v10" stroke="#f59e0b" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

- [ ] **Step 11: Create `src/index.css`**

```css
@import 'tailwindcss';

/* Dark mode is driven by a `dark` class on <html> (set by index.html + useUiStore). */
@custom-variant dark (&:where(.dark, .dark *));

@layer base {
  html {
    @apply bg-white text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100;
  }

  html.dark {
    color-scheme: dark;
  }

  :focus-visible {
    outline: 2px solid var(--color-amber-500);
    outline-offset: 2px;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 12: Create a temporary `src/main.jsx`** (replaced in Task 15)

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

createRoot(/** @type {HTMLElement} */ (document.getElementById('root'))).render(
  <StrictMode>
    <h1 className="p-4 text-2xl font-bold">AWS Practitioner Exam Prep</h1>
  </StrictMode>,
)
```

- [ ] **Step 13: Verify the toolchain**

Run: `npm run format && npm run lint && npm run typecheck && npm run build`
Expected: oxlint `Found 0 warnings and 0 errors`; `tsc` prints nothing; Vite prints `✓ built in …` with `dist/index.html` and an `assets/index-*.js` chunk.

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React project tooling" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Test infrastructure and canonical ids

**Files:**
- Create: `src/test/setup.js`, `src/content/ids.js`
- Test: `src/content/ids.test.js`

- [ ] **Step 1: Create `src/test/setup.js`**

```js
import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
```

- [ ] **Step 2: Write the failing test `src/content/ids.test.js`**

```js
import { describe, expect, it } from 'vitest'
import { domainId, subdomainId } from './ids.js'

describe('ids', () => {
  it('builds a sub-domain id from a cert id and task code', () => {
    expect(subdomainId('clf-c02', '1.1')).toBe('clf-c02/1.1')
  })

  it('builds a domain id from a cert id and domain number', () => {
    expect(domainId('aif-c01', 3)).toBe('aif-c01/d3')
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/content/ids.test.js`
Expected: FAIL — `Failed to resolve import "./ids.js"`.

- [ ] **Step 4: Implement `src/content/ids.js`**

```js
/**
 * Canonical identifiers shared by the database, the exam engine and the routes.
 * Sub-domain ids look like "clf-c02/1.1"; domain ids look like "clf-c02/d1".
 */

/**
 * @param {string} certId
 * @param {string} taskCode official task statement code, e.g. "1.1"
 */
export function subdomainId(certId, taskCode) {
  return `${certId}/${taskCode}`
}

/**
 * @param {string} certId
 * @param {number | string} domainNo
 */
export function domainId(certId, domainNo) {
  return `${certId}/d${domainNo}`
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/content/ids.test.js`
Expected: PASS — `2 passed`.

- [ ] **Step 6: Commit**

```bash
npm run format
git add -A
git commit -m "test: add Vitest setup and canonical id helpers" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Shared record types, cert registry and test kinds

**Files:**
- Create: `src/db/types.js`, `src/content/certs.js`, `src/engine/testKinds.js`
- Test: `src/content/certs.test.js`, `src/engine/testKinds.test.js`

- [ ] **Step 1: Create `src/db/types.js`** (types only; no runtime code)

```js
/**
 * JSDoc types for every record persisted in IndexedDB.
 * Use from other files as: @typedef {import('./types.js').Attempt} Attempt
 */

/** @typedef {'pre' | 'post' | 'domain' | 'diagnostic' | 'full' | 'drill'} AttemptKind */
/** @typedef {'study' | 'exam'} AttemptMode */
/** @typedef {'in_progress' | 'submitted'} AttemptStatus */

/**
 * A learner's answer to one item within an attempt.
 * @typedef {object} ItemResponse
 * @property {string[]} selected option ids the learner chose
 * @property {boolean} submitted true once the answer is locked
 * @property {boolean | null} correct null until graded
 * @property {boolean} markedForReview exam-mode "mark for review"
 * @property {number | null} answeredAt epoch ms
 */

/** @typedef {{ correct: number, total: number }} Tally */

/**
 * @typedef {object} AttemptResult
 * @property {number} correct
 * @property {number} total
 * @property {number} pct percent correct, 0–100
 * @property {number} scaledEstimate estimated AWS scaled score, 100–1000
 * @property {boolean} passed scaledEstimate >= 700
 * @property {Record<string, Tally>} byDomain keyed by domain id ("clf-c02/d1")
 * @property {Record<string, Tally>} bySubdomain keyed by sub-domain id ("clf-c02/1.1")
 */

/**
 * @typedef {object} Attempt
 * @property {string} id uuid
 * @property {string} certId
 * @property {AttemptKind} kind
 * @property {string} scopeId sub-domain id (pre/post), domain id (domain), cert id (diagnostic/full/drill)
 * @property {AttemptMode} mode
 * @property {AttemptStatus} status
 * @property {number} startedAt epoch ms
 * @property {number | null} deadlineAt epoch ms; only for timed attempts
 * @property {number | null} submittedAt epoch ms
 * @property {string[]} itemIds in presentation order
 * @property {Record<string, string[]>} optionOrder per item, option ids in shuffled display order
 * @property {Record<string, ItemResponse>} responses keyed by item id
 * @property {number} currentIndex
 * @property {AttemptResult | null} result set on submit
 */

/**
 * @typedef {object} ItemStat
 * @property {string} itemId
 * @property {string} certId
 * @property {string} subdomainId
 * @property {number} itemVersion item version when last answered
 * @property {number} seenCount
 * @property {number} correctCount
 * @property {number} lastSeenAt epoch ms
 * @property {boolean} lastCorrect
 */

/** @typedef {{ subdomainId: string, certId: string, reviewCompletedAt: number | null }} SubdomainProgress */

/** @typedef {'wrong-answer' | 'unclear' | 'outdated' | 'typo' | 'other'} FlagReason */

/**
 * @typedef {object} Flag
 * @property {number} id auto-increment
 * @property {string} itemId
 * @property {number} itemVersion
 * @property {string} certId
 * @property {FlagReason} reason
 * @property {string} note
 * @property {number} createdAt epoch ms
 */

/** @typedef {{ key: string, value: unknown }} Setting */

export {}
```

- [ ] **Step 2: Write the failing tests**

`src/content/certs.test.js`:
```js
import { describe, expect, it } from 'vitest'
import { CERTS, getCert } from './certs.js'

describe('certs', () => {
  it('lists both certifications in display order', () => {
    expect(CERTS.map((cert) => cert.code)).toEqual(['CLF-C02', 'AIF-C01'])
  })

  it('finds a cert by id', () => {
    expect(getCert('aif-c01')?.title).toBe('AWS Certified AI Practitioner')
  })

  it('returns null for an unknown id', () => {
    expect(getCert('saa-c03')).toBeNull()
  })
})
```

`src/engine/testKinds.test.js`:
```js
import { describe, expect, it } from 'vitest'
import { isTestKind, TEST_KIND_LABELS } from './testKinds.js'

describe('testKinds', () => {
  it('accepts every known kind', () => {
    for (const kind of ['pre', 'post', 'domain', 'diagnostic', 'full', 'drill']) {
      expect(isTestKind(kind)).toBe(true)
    }
  })

  it('rejects unknown or missing kinds', () => {
    expect(isTestKind('quiz')).toBe(false)
    expect(isTestKind('toString')).toBe(false)
    expect(isTestKind(null)).toBe(false)
  })

  it('labels each kind for display', () => {
    expect(TEST_KIND_LABELS.diagnostic).toBe('Diagnostic Exam')
    expect(TEST_KIND_LABELS.full).toBe('Full Practice Exam')
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/content/certs.test.js src/engine/testKinds.test.js`
Expected: FAIL — both modules fail to resolve.

- [ ] **Step 4: Implement `src/content/certs.js`**

```js
/**
 * @typedef {object} CertSummary
 * @property {string} id route + storage id, e.g. "clf-c02"
 * @property {string} code official exam code, e.g. "CLF-C02"
 * @property {string} title
 */

/**
 * Supported certifications. Phase 2 replaces this literal with data from the generated
 * content manifest; keep `CERTS` and `getCert` signatures stable.
 * @type {CertSummary[]}
 */
export const CERTS = [
  { id: 'clf-c02', code: 'CLF-C02', title: 'AWS Certified Cloud Practitioner' },
  { id: 'aif-c01', code: 'AIF-C01', title: 'AWS Certified AI Practitioner' },
]

/**
 * @param {string} certId
 * @returns {CertSummary | null}
 */
export function getCert(certId) {
  return CERTS.find((cert) => cert.id === certId) ?? null
}
```

- [ ] **Step 5: Implement `src/engine/testKinds.js`**

```js
/** @typedef {import('../db/types.js').AttemptKind} AttemptKind */

/** @type {Record<AttemptKind, string>} */
export const TEST_KIND_LABELS = {
  pre: 'Pre-Test',
  post: 'Post-Test',
  domain: 'Domain Assessment',
  diagnostic: 'Diagnostic Exam',
  full: 'Full Practice Exam',
  drill: 'Weak-Area Drill',
}

/**
 * @param {unknown} value
 * @returns {value is AttemptKind}
 */
export function isTestKind(value) {
  return typeof value === 'string' && Object.hasOwn(TEST_KIND_LABELS, value)
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/content/certs.test.js src/engine/testKinds.test.js && npm run typecheck`
Expected: PASS — `6 passed`; `tsc` prints nothing.

- [ ] **Step 7: Commit**

```bash
npm run format
git add -A
git commit -m "feat: add persisted record types, cert registry and test kinds" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: UI store (theme + storage error)

**Files:**
- Create: `src/stores/useUiStore.js`
- Test: `src/stores/useUiStore.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { beforeEach, describe, expect, it } from 'vitest'
import { readStoredTheme, THEME_STORAGE_KEY, useUiStore } from './useUiStore.js'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
  useUiStore.setState({ theme: 'system', storageError: false })
})

describe('readStoredTheme', () => {
  it('defaults to system when nothing is stored', () => {
    expect(readStoredTheme()).toBe('system')
  })

  it('returns a stored explicit theme', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    expect(readStoredTheme()).toBe('dark')
  })

  it('ignores unexpected stored values', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'purple')
    expect(readStoredTheme()).toBe('system')
  })
})

describe('setTheme', () => {
  it('applies and remembers dark mode', () => {
    useUiStore.getState().setTheme('dark')
    expect(useUiStore.getState().theme).toBe('dark')
    expect(document.documentElement).toHaveClass('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })

  it('switching to light removes the dark class', () => {
    useUiStore.getState().setTheme('dark')
    useUiStore.getState().setTheme('light')
    expect(document.documentElement).not.toHaveClass('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
  })

  it('system clears the stored preference and follows the device (light in jsdom)', () => {
    useUiStore.getState().setTheme('dark')
    useUiStore.getState().setTheme('system')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
    expect(document.documentElement).not.toHaveClass('dark')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/stores/useUiStore.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/stores/useUiStore.js`**

```js
import { create } from 'zustand'

/** Keep in sync with the inline theme script in index.html. */
export const THEME_STORAGE_KEY = 'theme'

/** @typedef {'light' | 'dark' | 'system'} Theme */

/** @returns {Theme} */
export function readStoredTheme() {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

/** @param {Theme} theme */
export function applyTheme(theme) {
  const prefersDark =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = theme === 'dark' || (theme === 'system' && prefersDark)
  document.documentElement.classList.toggle('dark', dark)
}

/**
 * Re-applies the theme when the OS preference changes while "system" is selected.
 * @returns {() => void} unsubscribe
 */
export function watchSystemTheme() {
  if (typeof window.matchMedia !== 'function') return () => {}
  const query = window.matchMedia('(prefers-color-scheme: dark)')
  const onChange = () => {
    if (useUiStore.getState().theme === 'system') applyTheme('system')
  }
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

/**
 * @typedef {object} UiState
 * @property {Theme} theme
 * @property {boolean} storageError true when IndexedDB could not be opened
 * @property {(theme: Theme) => void} setTheme
 */

/** @type {import('zustand').UseBoundStore<import('zustand').StoreApi<UiState>>} */
export const useUiStore = create((set) => ({
  theme: readStoredTheme(),
  storageError: false,
  setTheme: (theme) => {
    try {
      if (theme === 'system') localStorage.removeItem(THEME_STORAGE_KEY)
      else localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // Storage unavailable: the theme still applies for this session.
    }
    applyTheme(theme)
    set({ theme })
  },
}))
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/stores/useUiStore.test.js`
Expected: PASS — `6 passed`.

- [ ] **Step 5: Commit**

```bash
npm run format
git add -A
git commit -m "feat: add UI store with persisted theme" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Session store (active attempt + capped option selection)

**Files:**
- Create: `src/stores/useSessionStore.js`
- Test: `src/stores/useSessionStore.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { beforeEach, describe, expect, it } from 'vitest'
import { initialSessionState, nextSelection, useSessionStore } from './useSessionStore.js'

beforeEach(() => {
  useSessionStore.setState(initialSessionState)
})

describe('nextSelection', () => {
  it('single-answer questions replace the selection', () => {
    expect(nextSelection(['a'], 'b', 1)).toEqual(['b'])
  })

  it('re-choosing the selected single answer keeps it selected', () => {
    expect(nextSelection(['a'], 'a', 1)).toEqual(['a'])
  })

  it('multiple-response selections toggle on and off', () => {
    expect(nextSelection(['a'], 'b', 2)).toEqual(['a', 'b'])
    expect(nextSelection(['a', 'b'], 'a', 2)).toEqual(['b'])
  })

  it('multiple-response selections are capped at maxCount', () => {
    expect(nextSelection(['a', 'b'], 'c', 2)).toEqual(['a', 'b'])
  })
})

describe('useSessionStore', () => {
  it('start sets the attempt and position and clears any selection', () => {
    useSessionStore.setState({ pendingSelection: ['a'] })
    useSessionStore.getState().start('attempt-1', 4)
    expect(useSessionStore.getState()).toMatchObject({
      attemptId: 'attempt-1',
      currentIndex: 4,
      pendingSelection: [],
    })
  })

  it('toggleOption applies the selection rules', () => {
    const { toggleOption } = useSessionStore.getState()
    toggleOption('a', 2)
    toggleOption('c', 2)
    toggleOption('d', 2)
    expect(useSessionStore.getState().pendingSelection).toEqual(['a', 'c'])
  })

  it('goTo moves and clears the pending selection', () => {
    useSessionStore.getState().toggleOption('a', 1)
    useSessionStore.getState().goTo(2)
    expect(useSessionStore.getState()).toMatchObject({ currentIndex: 2, pendingSelection: [] })
  })

  it('reset returns to the initial state', () => {
    useSessionStore.getState().start('attempt-1', 3)
    useSessionStore.getState().reset()
    expect(useSessionStore.getState()).toMatchObject(initialSessionState)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/stores/useSessionStore.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/stores/useSessionStore.js`**

```js
import { create } from 'zustand'

/**
 * Runtime state for the test currently on screen. The durable copy of every answer
 * lives in IndexedDB (db/attempts.js); this store only holds what the runner UI needs.
 * @typedef {object} SessionState
 * @property {string | null} attemptId
 * @property {number} currentIndex
 * @property {string[]} pendingSelection option ids chosen for the current question, not yet submitted
 * @property {(attemptId: string, currentIndex: number) => void} start
 * @property {(index: number) => void} goTo
 * @property {(optionId: string, maxCount: number) => void} toggleOption
 * @property {() => void} reset
 */

/** @type {Pick<SessionState, 'attemptId' | 'currentIndex' | 'pendingSelection'>} */
export const initialSessionState = { attemptId: null, currentIndex: 0, pendingSelection: [] }

/**
 * Selection rules mirroring the AWS exam UI: one choice replaces another for multiple
 * choice; multiple response toggles choices and never exceeds the stated count.
 * @param {string[]} current
 * @param {string} optionId
 * @param {number} maxCount the item's selectCount
 * @returns {string[]}
 */
export function nextSelection(current, optionId, maxCount) {
  if (maxCount <= 1) return [optionId]
  if (current.includes(optionId)) return current.filter((id) => id !== optionId)
  if (current.length >= maxCount) return current
  return [...current, optionId]
}

/** @type {import('zustand').UseBoundStore<import('zustand').StoreApi<SessionState>>} */
export const useSessionStore = create((set) => ({
  ...initialSessionState,
  start: (attemptId, currentIndex) => set({ attemptId, currentIndex, pendingSelection: [] }),
  goTo: (index) => set({ currentIndex: index, pendingSelection: [] }),
  toggleOption: (optionId, maxCount) =>
    set((state) => ({
      pendingSelection: nextSelection(state.pendingSelection, optionId, maxCount),
    })),
  reset: () => set(initialSessionState),
}))
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/stores/useSessionStore.test.js && npm run typecheck`
Expected: PASS — `8 passed`; `tsc` prints nothing.

- [ ] **Step 5: Commit**

```bash
npm run format
git add -A
git commit -m "feat: add session store with capped multiple-response selection" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Dexie database schema v1

**Files:**
- Create: `src/db/db.js`, `src/test/resetDb.js`
- Test: `src/db/db.test.js`

- [ ] **Step 1: Write the failing test `src/db/db.test.js`**

```js
import { describe, expect, it } from 'vitest'
import { db, DB_NAME, openDatabase } from './db.js'

describe('db', () => {
  it('opens with the five v1 tables', async () => {
    expect(await openDatabase()).toBe(true)
    expect(db.name).toBe(DB_NAME)
    expect(db.tables.map((table) => table.name).sort()).toEqual([
      'attempts',
      'flags',
      'itemStats',
      'settings',
      'subdomainProgress',
    ])
  })

  it('declares the indexes later phases query by', () => {
    const indexNames = (/** @type {import('dexie').Table} */ table) =>
      table.schema.indexes.map((index) => index.name)
    expect(indexNames(db.attempts)).toEqual(
      expect.arrayContaining(['certId', '[certId+kind]', 'scopeId', 'status', 'startedAt']),
    )
    expect(indexNames(db.itemStats)).toEqual(
      expect.arrayContaining(['certId', 'subdomainId', 'lastSeenAt']),
    )
    expect(indexNames(db.subdomainProgress)).toEqual(['certId'])
    expect(indexNames(db.flags)).toEqual(expect.arrayContaining(['itemId', 'certId', 'createdAt']))
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/db/db.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/db/db.js`**

```js
import { Dexie } from 'dexie'

export const DB_NAME = 'awsprep'

/**
 * @typedef {Dexie & {
 *   attempts: import('dexie').EntityTable<import('./types.js').Attempt, 'id'>,
 *   itemStats: import('dexie').EntityTable<import('./types.js').ItemStat, 'itemId'>,
 *   subdomainProgress: import('dexie').EntityTable<import('./types.js').SubdomainProgress, 'subdomainId'>,
 *   flags: import('dexie').EntityTable<import('./types.js').Flag, 'id'>,
 *   settings: import('dexie').EntityTable<import('./types.js').Setting, 'key'>,
 * }} AppDatabase
 */

/** @type {AppDatabase} */
export const db = /** @type {AppDatabase} */ (new Dexie(DB_NAME))

// Schema v1. Never edit a released version: add db.version(2) with an upgrade instead.
db.version(1).stores({
  attempts: 'id, certId, [certId+kind], scopeId, status, startedAt',
  itemStats: 'itemId, certId, subdomainId, lastSeenAt',
  subdomainProgress: 'subdomainId, certId',
  flags: '++id, itemId, certId, createdAt',
  settings: 'key',
})

/**
 * Opens the database eagerly so storage problems surface at startup.
 * @returns {Promise<boolean>} false when IndexedDB is unavailable (e.g. some private-browsing modes)
 */
export async function openDatabase() {
  try {
    await db.open()
    return true
  } catch (error) {
    console.error('Failed to open IndexedDB', error)
    return false
  }
}
```

- [ ] **Step 4: Create the test helper `src/test/resetDb.js`**

```js
import { db } from '../db/db.js'

/** Empties every table so each test starts from a clean database. */
export async function resetDb() {
  await Promise.all(db.tables.map((table) => table.clear()))
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/db/db.test.js && npm run typecheck`
Expected: PASS — `2 passed`; `tsc` prints nothing.

- [ ] **Step 6: Commit**

```bash
npm run format
git add -A
git commit -m "feat: add Dexie schema v1 for progress tracking" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Attempts repository

**Files:**
- Create: `src/db/attempts.js`
- Test: `src/db/attempts.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { beforeEach, describe, expect, it } from 'vitest'
import { resetDb } from '../test/resetDb.js'
import {
  createAttempt,
  getAttempt,
  listAttempts,
  listInProgress,
  saveResponse,
  submitAttempt,
} from './attempts.js'

const ITEM_1 = 'clf-c02-1.1-0001'
const ITEM_2 = 'clf-c02-1.1-0002'

/** @param {object} [overrides] */
const newAttempt = (overrides = {}) => ({
  certId: 'clf-c02',
  kind: 'pre',
  scopeId: 'clf-c02/1.1',
  mode: 'study',
  itemIds: [ITEM_1, ITEM_2],
  optionOrder: { [ITEM_1]: ['b', 'a', 'd', 'c'], [ITEM_2]: ['a', 'c', 'b', 'd'] },
  ...overrides,
})

const response = {
  selected: ['a'],
  submitted: true,
  correct: true,
  markedForReview: false,
  answeredAt: 2_000,
}

const result = {
  correct: 1,
  total: 2,
  pct: 50,
  scaledEstimate: 529,
  passed: false,
  byDomain: { 'clf-c02/d1': { correct: 1, total: 2 } },
  bySubdomain: { 'clf-c02/1.1': { correct: 1, total: 2 } },
}

beforeEach(resetDb)

describe('createAttempt', () => {
  it('stores a new in-progress attempt with no responses', async () => {
    const attempt = await createAttempt(newAttempt(), 1_000)
    expect(await getAttempt(attempt.id)).toEqual({
      ...newAttempt(),
      id: attempt.id,
      status: 'in_progress',
      startedAt: 1_000,
      deadlineAt: null,
      submittedAt: null,
      responses: {},
      currentIndex: 0,
      result: null,
    })
  })

  it('sets an absolute deadline when a time limit is given', async () => {
    const attempt = await createAttempt(
      newAttempt({ kind: 'full', mode: 'exam', timeLimitSec: 5_400 }),
      1_000,
    )
    expect(attempt.deadlineAt).toBe(1_000 + 5_400_000)
  })
})

describe('saveResponse', () => {
  it('records a response for an item id containing dots and moves the position', async () => {
    const { id } = await createAttempt(newAttempt())
    await saveResponse(id, ITEM_1, response, 1)
    const stored = await getAttempt(id)
    expect(stored?.responses[ITEM_1]).toEqual(response)
    expect(stored?.currentIndex).toBe(1)
  })

  it('throws for an unknown attempt', async () => {
    await expect(saveResponse('missing', ITEM_1, response, 0)).rejects.toThrow(
      'Attempt not found: missing',
    )
  })
})

describe('submitAttempt', () => {
  it('marks the attempt submitted with its result', async () => {
    const { id } = await createAttempt(newAttempt(), 1_000)
    await submitAttempt(id, result, 9_000)
    expect(await getAttempt(id)).toMatchObject({ status: 'submitted', submittedAt: 9_000, result })
  })

  it('throws for an unknown attempt', async () => {
    await expect(submitAttempt('missing', result)).rejects.toThrow('Attempt not found: missing')
  })
})

describe('listAttempts', () => {
  it("returns a cert's attempts newest first, filtered by kind and status", async () => {
    const older = await createAttempt(newAttempt({ kind: 'pre' }), 1_000)
    const newer = await createAttempt(newAttempt({ kind: 'post' }), 2_000)
    await createAttempt(newAttempt({ certId: 'aif-c01', scopeId: 'aif-c01/1.1' }), 3_000)

    expect((await listAttempts('clf-c02')).map((a) => a.id)).toEqual([newer.id, older.id])
    expect((await listAttempts('clf-c02', { kind: 'pre' })).map((a) => a.id)).toEqual([older.id])

    await submitAttempt(older.id, result, 4_000)
    expect((await listInProgress('clf-c02')).map((a) => a.id)).toEqual([newer.id])
    expect((await listAttempts('clf-c02', { status: 'submitted' })).map((a) => a.id)).toEqual([
      older.id,
    ])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/db/attempts.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/db/attempts.js`**

```js
import { db } from './db.js'

/** @typedef {import('./types.js').Attempt} Attempt */
/** @typedef {import('./types.js').AttemptKind} AttemptKind */
/** @typedef {import('./types.js').AttemptMode} AttemptMode */
/** @typedef {import('./types.js').AttemptStatus} AttemptStatus */
/** @typedef {import('./types.js').AttemptResult} AttemptResult */
/** @typedef {import('./types.js').ItemResponse} ItemResponse */

/**
 * @typedef {object} NewAttempt
 * @property {string} certId
 * @property {AttemptKind} kind
 * @property {string} scopeId
 * @property {AttemptMode} mode
 * @property {string[]} itemIds
 * @property {Record<string, string[]>} optionOrder
 * @property {number | null} [timeLimitSec] set for timed exams; stored as an absolute deadline
 */

/**
 * @param {NewAttempt} input
 * @param {number} [now] epoch ms
 * @returns {Promise<Attempt>}
 */
export async function createAttempt(input, now = Date.now()) {
  /** @type {Attempt} */
  const attempt = {
    id: crypto.randomUUID(),
    certId: input.certId,
    kind: input.kind,
    scopeId: input.scopeId,
    mode: input.mode,
    status: 'in_progress',
    startedAt: now,
    // Absolute deadline, so a page refresh resumes the countdown instead of resetting it.
    deadlineAt: input.timeLimitSec ? now + input.timeLimitSec * 1000 : null,
    submittedAt: null,
    itemIds: input.itemIds,
    optionOrder: input.optionOrder,
    responses: {},
    currentIndex: 0,
    result: null,
  }
  await db.attempts.add(attempt)
  return attempt
}

/**
 * @param {string} id
 * @returns {Promise<Attempt | undefined>}
 */
export function getAttempt(id) {
  return db.attempts.get(id)
}

/**
 * Persists one answer and the learner's position immediately, so a refresh mid-test resumes.
 * @param {string} attemptId
 * @param {string} itemId
 * @param {ItemResponse} response
 * @param {number} currentIndex
 */
export async function saveResponse(attemptId, itemId, response, currentIndex) {
  // modify() rather than update(): item ids contain dots, which update() would read as a key path.
  const count = await db.attempts
    .where('id')
    .equals(attemptId)
    .modify((attempt) => {
      attempt.responses[itemId] = response
      attempt.currentIndex = currentIndex
    })
  if (count === 0) throw new Error(`Attempt not found: ${attemptId}`)
}

/**
 * @param {string} attemptId
 * @param {AttemptResult} result
 * @param {number} [now] epoch ms
 */
export async function submitAttempt(attemptId, result, now = Date.now()) {
  const count = await db.attempts.update(attemptId, {
    status: 'submitted',
    submittedAt: now,
    result,
  })
  if (count === 0) throw new Error(`Attempt not found: ${attemptId}`)
}

/**
 * @param {string} certId
 * @param {{ kind?: AttemptKind, status?: AttemptStatus }} [filter]
 * @returns {Promise<Attempt[]>} newest first
 */
export async function listAttempts(certId, filter = {}) {
  const collection = filter.kind
    ? db.attempts.where('[certId+kind]').equals([certId, filter.kind])
    : db.attempts.where('certId').equals(certId)
  const attempts = await collection.toArray()
  return attempts
    .filter((attempt) => !filter.status || attempt.status === filter.status)
    .sort((a, b) => b.startedAt - a.startedAt)
}

/**
 * @param {string} certId
 * @returns {Promise<Attempt[]>} newest first
 */
export function listInProgress(certId) {
  return listAttempts(certId, { status: 'in_progress' })
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/db/attempts.test.js && npm run typecheck`
Expected: PASS — `7 passed`; `tsc` prints nothing.

- [ ] **Step 5: Commit**

```bash
npm run format
git add -A
git commit -m "feat: add attempts repository" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Item stats repository

**Files:**
- Create: `src/db/itemStats.js`
- Test: `src/db/itemStats.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { beforeEach, describe, expect, it } from 'vitest'
import { resetDb } from '../test/resetDb.js'
import { getStatsForCert, getStatsForSubdomain, recordAnswer } from './itemStats.js'

/** @param {object} [overrides] */
const answer = (overrides = {}) => ({
  itemId: 'clf-c02-1.1-0001',
  certId: 'clf-c02',
  subdomainId: 'clf-c02/1.1',
  itemVersion: 1,
  correct: true,
  at: 1_000,
  ...overrides,
})

beforeEach(resetDb)

describe('recordAnswer', () => {
  it('creates stats on the first answer', async () => {
    await recordAnswer(answer())
    expect(await getStatsForSubdomain('clf-c02/1.1')).toEqual([
      {
        itemId: 'clf-c02-1.1-0001',
        certId: 'clf-c02',
        subdomainId: 'clf-c02/1.1',
        itemVersion: 1,
        seenCount: 1,
        correctCount: 1,
        lastSeenAt: 1_000,
        lastCorrect: true,
      },
    ])
  })

  it('accumulates counts and keeps the latest outcome and version', async () => {
    await recordAnswer(answer({ correct: true, at: 1_000 }))
    await recordAnswer(answer({ correct: false, at: 2_000, itemVersion: 2 }))
    const [stat] = await getStatsForSubdomain('clf-c02/1.1')
    expect(stat).toMatchObject({
      seenCount: 2,
      correctCount: 1,
      lastSeenAt: 2_000,
      lastCorrect: false,
      itemVersion: 2,
    })
  })
})

describe('queries', () => {
  it('lists stats by sub-domain and by cert', async () => {
    await recordAnswer(answer({ itemId: 'clf-c02-1.1-0001' }))
    await recordAnswer(answer({ itemId: 'clf-c02-1.2-0001', subdomainId: 'clf-c02/1.2' }))
    await recordAnswer(
      answer({ itemId: 'aif-c01-1.1-0001', certId: 'aif-c01', subdomainId: 'aif-c01/1.1' }),
    )
    expect((await getStatsForSubdomain('clf-c02/1.2')).map((s) => s.itemId)).toEqual([
      'clf-c02-1.2-0001',
    ])
    expect((await getStatsForCert('clf-c02')).map((s) => s.itemId).sort()).toEqual([
      'clf-c02-1.1-0001',
      'clf-c02-1.2-0001',
    ])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/db/itemStats.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/db/itemStats.js`**

```js
import { db } from './db.js'

/** @typedef {import('./types.js').ItemStat} ItemStat */

/**
 * @typedef {object} RecordedAnswer
 * @property {string} itemId
 * @property {string} certId
 * @property {string} subdomainId
 * @property {number} itemVersion
 * @property {boolean} correct
 * @property {number} at epoch ms
 */

/**
 * Updates per-item history used for unseen-first selection and mastery.
 * @param {RecordedAnswer} answer
 */
export async function recordAnswer(answer) {
  await db.transaction('rw', db.itemStats, async () => {
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
  })
}

/**
 * @param {string} subdomainId
 * @returns {Promise<ItemStat[]>}
 */
export function getStatsForSubdomain(subdomainId) {
  return db.itemStats.where('subdomainId').equals(subdomainId).toArray()
}

/**
 * @param {string} certId
 * @returns {Promise<ItemStat[]>}
 */
export function getStatsForCert(certId) {
  return db.itemStats.where('certId').equals(certId).toArray()
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/db/itemStats.test.js && npm run typecheck`
Expected: PASS — `3 passed`; `tsc` prints nothing.

- [ ] **Step 5: Commit**

```bash
npm run format
git add -A
git commit -m "feat: add item stats repository" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Sub-domain progress and settings repositories

**Files:**
- Create: `src/db/progress.js`, `src/db/settings.js`
- Test: `src/db/progress.test.js`, `src/db/settings.test.js`

- [ ] **Step 1: Write the failing tests**

`src/db/progress.test.js`:
```js
import { beforeEach, describe, expect, it } from 'vitest'
import { resetDb } from '../test/resetDb.js'
import { getProgress, listProgressForCert, markReviewComplete } from './progress.js'

beforeEach(resetDb)

describe('progress', () => {
  it('marks a sub-domain review as complete', async () => {
    await markReviewComplete('clf-c02', 'clf-c02/1.1', 5_000)
    expect(await getProgress('clf-c02/1.1')).toEqual({
      subdomainId: 'clf-c02/1.1',
      certId: 'clf-c02',
      reviewCompletedAt: 5_000,
    })
  })

  it('returns undefined for a sub-domain with no progress', async () => {
    expect(await getProgress('clf-c02/4.3')).toBeUndefined()
  })

  it('lists progress for one cert only', async () => {
    await markReviewComplete('clf-c02', 'clf-c02/1.1', 1)
    await markReviewComplete('aif-c01', 'aif-c01/1.1', 2)
    expect((await listProgressForCert('clf-c02')).map((p) => p.subdomainId)).toEqual([
      'clf-c02/1.1',
    ])
  })
})
```

`src/db/settings.test.js`:
```js
import { beforeEach, describe, expect, it } from 'vitest'
import { resetDb } from '../test/resetDb.js'
import { getSetting, setSetting } from './settings.js'

beforeEach(resetDb)

describe('settings', () => {
  it('returns the fallback when a setting is missing', async () => {
    expect(await getSetting('testLengths', { pre: 10 })).toEqual({ pre: 10 })
  })

  it('stores and reads back structured values', async () => {
    await setSetting('testLengths', { pre: 15, post: 20 })
    expect(await getSetting('testLengths', null)).toEqual({ pre: 15, post: 20 })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/db/progress.test.js src/db/settings.test.js`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `src/db/progress.js`**

```js
import { db } from './db.js'

/** @typedef {import('./types.js').SubdomainProgress} SubdomainProgress */

/**
 * Pre-/Post-Test completion is derived from attempts; only the Review step is stored here.
 * @param {string} certId
 * @param {string} subdomainId
 * @param {number} [now] epoch ms
 */
export async function markReviewComplete(certId, subdomainId, now = Date.now()) {
  await db.subdomainProgress.put({ subdomainId, certId, reviewCompletedAt: now })
}

/**
 * @param {string} subdomainId
 * @returns {Promise<SubdomainProgress | undefined>}
 */
export function getProgress(subdomainId) {
  return db.subdomainProgress.get(subdomainId)
}

/**
 * @param {string} certId
 * @returns {Promise<SubdomainProgress[]>}
 */
export function listProgressForCert(certId) {
  return db.subdomainProgress.where('certId').equals(certId).toArray()
}
```

- [ ] **Step 4: Implement `src/db/settings.js`**

```js
import { db } from './db.js'

/**
 * @template T
 * @param {string} key
 * @param {T} fallback returned when the setting has never been saved
 * @returns {Promise<T>}
 */
export async function getSetting(key, fallback) {
  const row = await db.settings.get(key)
  return row === undefined ? fallback : /** @type {T} */ (row.value)
}

/**
 * @param {string} key
 * @param {unknown} value any structured-cloneable value
 */
export async function setSetting(key, value) {
  await db.settings.put({ key, value })
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/db/progress.test.js src/db/settings.test.js && npm run typecheck`
Expected: PASS — `5 passed`; `tsc` prints nothing.

- [ ] **Step 6: Commit**

```bash
npm run format
git add -A
git commit -m "feat: add sub-domain progress and settings repositories" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Flags repository (learner issue reports)

**Files:**
- Create: `src/db/flags.js`
- Test: `src/db/flags.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { beforeEach, describe, expect, it } from 'vitest'
import { resetDb } from '../test/resetDb.js'
import { addFlag, clearFlags, deleteFlag, FLAG_REASONS, listFlags } from './flags.js'

/** @param {object} [overrides] */
const report = (overrides = {}) => ({
  itemId: 'clf-c02-1.1-0001',
  itemVersion: 1,
  certId: 'clf-c02',
  reason: 'wrong-answer',
  note: '  Option B is also correct.  ',
  ...overrides,
})

beforeEach(resetDb)

describe('flags', () => {
  it('offers the five report reasons', () => {
    expect(FLAG_REASONS).toEqual(['wrong-answer', 'unclear', 'outdated', 'typo', 'other'])
  })

  it('stores a report with a trimmed note and returns its id', async () => {
    const id = await addFlag(report(), 1_000)
    expect(await listFlags()).toEqual([
      {
        id,
        itemId: 'clf-c02-1.1-0001',
        itemVersion: 1,
        certId: 'clf-c02',
        reason: 'wrong-answer',
        note: 'Option B is also correct.',
        createdAt: 1_000,
      },
    ])
  })

  it('stores an empty note when none is given', async () => {
    await addFlag(report({ note: undefined }), 1_000)
    expect((await listFlags())[0].note).toBe('')
  })

  it('lists reports newest first', async () => {
    const first = await addFlag(report(), 1_000)
    const second = await addFlag(report({ reason: 'typo' }), 2_000)
    expect((await listFlags()).map((flag) => flag.id)).toEqual([second, first])
  })

  it('rejects an unknown reason', async () => {
    await expect(addFlag(report({ reason: 'spam' }))).rejects.toThrow('Unknown flag reason: spam')
  })

  it('deletes one report or clears them all', async () => {
    const first = await addFlag(report(), 1_000)
    await addFlag(report(), 2_000)
    await deleteFlag(first)
    expect(await listFlags()).toHaveLength(1)
    await clearFlags()
    expect(await listFlags()).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/db/flags.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/db/flags.js`**

```js
import { db } from './db.js'

/** @typedef {import('./types.js').Flag} Flag */
/** @typedef {import('./types.js').FlagReason} FlagReason */

/** @type {FlagReason[]} */
export const FLAG_REASONS = ['wrong-answer', 'unclear', 'outdated', 'typo', 'other']

/**
 * @typedef {object} NewFlag
 * @property {string} itemId
 * @property {number} itemVersion
 * @property {string} certId
 * @property {FlagReason} reason
 * @property {string} [note]
 */

/**
 * Saves a learner's report about a question. Reports stay in this browser until exported.
 * @param {NewFlag} input
 * @param {number} [now] epoch ms
 * @returns {Promise<number>} the new report's id
 */
export async function addFlag(input, now = Date.now()) {
  if (!FLAG_REASONS.includes(input.reason)) {
    throw new Error(`Unknown flag reason: ${input.reason}`)
  }
  const id = await db.flags.add({
    itemId: input.itemId,
    itemVersion: input.itemVersion,
    certId: input.certId,
    reason: input.reason,
    note: (input.note ?? '').trim(),
    createdAt: now,
  })
  return /** @type {number} */ (id)
}

/** @returns {Promise<Flag[]>} newest first */
export function listFlags() {
  return db.flags.orderBy('createdAt').reverse().toArray()
}

/** @param {number} id */
export async function deleteFlag(id) {
  await db.flags.delete(id)
}

export async function clearFlags() {
  await db.flags.clear()
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/db/flags.test.js && npm run typecheck`
Expected: PASS — `6 passed`; `tsc` prints nothing.

- [ ] **Step 5: Commit**

```bash
npm run format
git add -A
git commit -m "feat: add flags repository for learner issue reports" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Progress backup export / replace-import

**Files:**
- Create: `src/db/backup.js`
- Test: `src/db/backup.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { beforeEach, describe, expect, it } from 'vitest'
import { resetDb } from '../test/resetDb.js'
import { createAttempt } from './attempts.js'
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  BackupError,
  exportBackup,
  importBackup,
} from './backup.js'
import { addFlag, listFlags } from './flags.js'
import { listProgressForCert, markReviewComplete } from './progress.js'
import { getSetting, setSetting } from './settings.js'

beforeEach(resetDb)

describe('exportBackup', () => {
  it('exports every table with format metadata', async () => {
    await setSetting('testLengths', { pre: 10 })
    await addFlag(
      { itemId: 'clf-c02-1.1-0001', itemVersion: 1, certId: 'clf-c02', reason: 'typo' },
      1_000,
    )
    const backup = await exportBackup(Date.UTC(2026, 9, 13))
    expect(backup.format).toBe(BACKUP_FORMAT)
    expect(backup.version).toBe(BACKUP_VERSION)
    expect(backup.exportedAt).toBe('2026-10-13T00:00:00.000Z')
    expect(backup.tables.settings).toEqual([{ key: 'testLengths', value: { pre: 10 } }])
    expect(backup.tables.flags).toHaveLength(1)
    expect(backup.tables.attempts).toEqual([])
    expect(backup.tables.itemStats).toEqual([])
    expect(backup.tables.subdomainProgress).toEqual([])
  })
})

describe('importBackup', () => {
  it('replaces all existing data with the backup contents', async () => {
    await setSetting('testLengths', { pre: 10 })
    const backup = await exportBackup()

    await resetDb()
    await setSetting('somethingNewer', true)
    await markReviewComplete('clf-c02', 'clf-c02/1.1', 1)

    await importBackup(backup)
    expect(await getSetting('testLengths', null)).toEqual({ pre: 10 })
    expect(await getSetting('somethingNewer', null)).toBeNull()
    expect(await listProgressForCert('clf-c02')).toEqual([])
  })

  it('accepts a backup that went through a JSON file round trip', async () => {
    await createAttempt({
      certId: 'clf-c02',
      kind: 'pre',
      scopeId: 'clf-c02/1.1',
      mode: 'study',
      itemIds: ['clf-c02-1.1-0001'],
      optionOrder: { 'clf-c02-1.1-0001': ['a', 'b', 'c', 'd'] },
    })
    await addFlag({ itemId: 'x', itemVersion: 1, certId: 'clf-c02', reason: 'other' })
    const json = JSON.parse(JSON.stringify(await exportBackup()))

    await resetDb()
    await importBackup(json)
    const restored = await exportBackup()
    expect(restored.tables.attempts).toHaveLength(1)
    expect(await listFlags()).toHaveLength(1)
  })

  it.each([
    ['a non-object', 'nope'],
    ['a different file format', { format: 'other', version: 1, tables: {} }],
    ['a newer backup version', { format: BACKUP_FORMAT, version: BACKUP_VERSION + 1, tables: {} }],
    ['a missing table', { format: BACKUP_FORMAT, version: BACKUP_VERSION, tables: { attempts: [] } }],
  ])('rejects %s and leaves existing data untouched', async (_label, bad) => {
    await setSetting('keep', 1)
    await expect(importBackup(bad)).rejects.toThrow(BackupError)
    expect(await getSetting('keep', null)).toBe(1)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/db/backup.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/db/backup.js`**

```js
import { db } from './db.js'

/** @typedef {import('./types.js').Attempt} Attempt */
/** @typedef {import('./types.js').ItemStat} ItemStat */
/** @typedef {import('./types.js').SubdomainProgress} SubdomainProgress */
/** @typedef {import('./types.js').Flag} Flag */
/** @typedef {import('./types.js').Setting} Setting */

export const BACKUP_FORMAT = 'awsprep-backup'
export const BACKUP_VERSION = 1

const TABLE_NAMES = ['attempts', 'itemStats', 'subdomainProgress', 'flags', 'settings']

/**
 * @typedef {object} BackupTables
 * @property {Attempt[]} attempts
 * @property {ItemStat[]} itemStats
 * @property {SubdomainProgress[]} subdomainProgress
 * @property {Flag[]} flags
 * @property {Setting[]} settings
 */

/**
 * @typedef {object} Backup
 * @property {string} format always BACKUP_FORMAT
 * @property {number} version
 * @property {string} exportedAt ISO timestamp
 * @property {BackupTables} tables
 */

export class BackupError extends Error {
  /** @param {string} message shown to the learner */
  constructor(message) {
    super(message)
    this.name = 'BackupError'
  }
}

/**
 * Snapshot of all local progress, ready to be saved as a JSON file.
 * @param {number} [now] epoch ms
 * @returns {Promise<Backup>}
 */
export async function exportBackup(now = Date.now()) {
  const tables = await db.transaction('r', db.tables, async () => ({
    attempts: await db.attempts.toArray(),
    itemStats: await db.itemStats.toArray(),
    subdomainProgress: await db.subdomainProgress.toArray(),
    flags: await db.flags.toArray(),
    settings: await db.settings.toArray(),
  }))
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date(now).toISOString(),
    tables,
  }
}

/**
 * Checks the backup's envelope (format, version, table arrays). Rows are trusted: a bad
 * row can only affect the learner's own local data.
 * @param {unknown} value
 * @returns {asserts value is Backup}
 */
export function assertValidBackup(value) {
  if (typeof value !== 'object' || value === null) {
    throw new BackupError('The file is not a valid progress backup.')
  }
  const candidate = /** @type {Record<string, unknown>} */ (value)
  if (candidate.format !== BACKUP_FORMAT) {
    throw new BackupError('This file is not a progress backup from this app.')
  }
  if (typeof candidate.version !== 'number' || candidate.version > BACKUP_VERSION) {
    throw new BackupError('This backup was made by a newer version of the app.')
  }
  const tables = /** @type {Record<string, unknown> | null} */ (
    typeof candidate.tables === 'object' ? candidate.tables : null
  )
  for (const name of TABLE_NAMES) {
    if (!tables || !Array.isArray(tables[name])) {
      throw new BackupError(`The backup is missing its "${name}" data.`)
    }
  }
}

/**
 * Replaces ALL local progress with the backup's contents, atomically.
 * @param {unknown} value parsed JSON from a backup file
 */
export async function importBackup(value) {
  assertValidBackup(value)
  const { tables } = value
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()))
    await db.attempts.bulkPut(tables.attempts)
    await db.itemStats.bulkPut(tables.itemStats)
    await db.subdomainProgress.bulkPut(tables.subdomainProgress)
    await db.flags.bulkPut(tables.flags)
    await db.settings.bulkPut(tables.settings)
  })
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/db/backup.test.js && npm run typecheck`
Expected: PASS — `7 passed`; `tsc` prints nothing.

- [ ] **Step 5: Commit**

```bash
npm run format
git add -A
git commit -m "feat: add progress backup export and replace-import" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Persistent storage helpers

**Files:**
- Create: `src/db/persist.js`, `src/test/stubStorage.js`
- Test: `src/db/persist.test.js`

- [ ] **Step 1: Create the test helper `src/test/stubStorage.js`**

```js
/**
 * Replaces navigator.storage for one test. Pass undefined to simulate a browser without it.
 * @param {Partial<StorageManager> | undefined} storage
 */
export function stubStorage(storage) {
  Object.defineProperty(navigator, 'storage', { value: storage, configurable: true })
}

export function restoreStorage() {
  Reflect.deleteProperty(navigator, 'storage')
}
```

- [ ] **Step 2: Write the failing test `src/db/persist.test.js`**

```js
import { afterEach, describe, expect, it, vi } from 'vitest'
import { restoreStorage, stubStorage } from '../test/stubStorage.js'
import { getPersistenceStatus, requestPersistence } from './persist.js'

afterEach(restoreStorage)

describe('getPersistenceStatus', () => {
  it('is unsupported when the Storage API is missing', async () => {
    stubStorage(undefined)
    expect(await getPersistenceStatus()).toBe('unsupported')
  })

  it('reports persisted or best-effort', async () => {
    stubStorage({ persisted: async () => true })
    expect(await getPersistenceStatus()).toBe('persisted')
    stubStorage({ persisted: async () => false })
    expect(await getPersistenceStatus()).toBe('best-effort')
  })
})

describe('requestPersistence', () => {
  it('is unsupported when the Storage API is missing', async () => {
    stubStorage(undefined)
    expect(await requestPersistence()).toBe('unsupported')
  })

  it('does not ask again when already persisted', async () => {
    const persist = vi.fn(async () => true)
    stubStorage({ persisted: async () => true, persist })
    expect(await requestPersistence()).toBe('persisted')
    expect(persist).not.toHaveBeenCalled()
  })

  it('returns the browser decision', async () => {
    stubStorage({ persisted: async () => false, persist: async () => true })
    expect(await requestPersistence()).toBe('persisted')
    stubStorage({ persisted: async () => false, persist: async () => false })
    expect(await requestPersistence()).toBe('best-effort')
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/db/persist.test.js`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `src/db/persist.js`**

```js
/**
 * "persisted": the browser will not evict IndexedDB under storage pressure.
 * "best-effort": data may be evicted when the device runs low on space.
 * @typedef {'persisted' | 'best-effort' | 'unsupported'} PersistenceStatus
 */

/** @returns {Promise<PersistenceStatus>} */
export async function getPersistenceStatus() {
  if (!navigator.storage?.persisted) return 'unsupported'
  return (await navigator.storage.persisted()) ? 'persisted' : 'best-effort'
}

/**
 * Asks the browser to keep this site's data. Called after the learner's first submitted
 * attempt (Phase 4) and from Settings.
 * @returns {Promise<PersistenceStatus>}
 */
export async function requestPersistence() {
  if (!navigator.storage?.persist || !navigator.storage.persisted) return 'unsupported'
  if (await navigator.storage.persisted()) return 'persisted'
  return (await navigator.storage.persist()) ? 'persisted' : 'best-effort'
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/db/persist.test.js && npm run typecheck`
Expected: PASS — `5 passed`; `tsc` prints nothing.

- [ ] **Step 6: Commit**

```bash
npm run format
git add -A
git commit -m "feat: add persistent storage helpers" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Accessible layout shell

**Files:**
- Create: `src/components/layout/AppShell.jsx`, `SkipLink.jsx`, `Header.jsx`, `Breadcrumbs.jsx`, `Footer.jsx`, `StorageWarning.jsx`
- Test: `src/components/layout/AppShell.test.jsx`

- [ ] **Step 1: Write the failing test `src/components/layout/AppShell.test.jsx`**

```jsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, Link, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { useUiStore } from '../../stores/useUiStore.js'
import AppShell from './AppShell.jsx'

/** @param {string} [initialPath] */
function renderShell(initialPath = '/') {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <AppShell />,
        children: [
          {
            index: true,
            element: (
              <>
                <h1>Home page</h1>
                <Link to="/next">Go next</Link>
              </>
            ),
          },
          { path: 'next', element: <h1>Next page</h1>, handle: { crumb: () => 'Next' } },
        ],
      },
    ],
    { initialEntries: [initialPath] },
  )
  render(<RouterProvider router={router} />)
  return router
}

beforeEach(() => {
  useUiStore.setState({ storageError: false })
})

describe('AppShell', () => {
  it('renders navigation, the main landmark and the disclaimers', () => {
    renderShell()
    const mainNav = screen.getByRole('navigation', { name: 'Main' })
    expect(within(mainNav).getByRole('link', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toContainElement(
      screen.getByRole('heading', { name: 'Home page' }),
    )
    const footer = screen.getByRole('contentinfo')
    expect(footer).toHaveTextContent(/not affiliated with/i)
    expect(footer).toHaveTextContent(/AI-generated/i)
  })

  it('skip link focuses the main content without changing the route', async () => {
    const user = userEvent.setup()
    const router = renderShell()
    await user.click(screen.getByRole('link', { name: 'Skip to main content' }))
    expect(screen.getByRole('main')).toHaveFocus()
    expect(router.state.location.pathname).toBe('/')
  })

  it('moves focus to the main content after navigation', async () => {
    const user = userEvent.setup()
    renderShell()
    await user.click(screen.getByRole('link', { name: 'Go next' }))
    expect(await screen.findByRole('heading', { name: 'Next page' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveFocus()
  })

  it('shows breadcrumbs on nested pages with the current page marked', () => {
    renderShell('/next')
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(nav).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(within(nav).getByText('Next')).toHaveAttribute('aria-current', 'page')
  })

  it('hides breadcrumbs on the home page', () => {
    renderShell('/')
    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).not.toBeInTheDocument()
  })

  it('warns when progress cannot be saved', () => {
    useUiStore.setState({ storageError: true })
    renderShell()
    expect(screen.getByRole('alert')).toHaveTextContent(/be saved/i)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/layout/AppShell.test.jsx`
Expected: FAIL — `./AppShell.jsx` not found.

- [ ] **Step 3: Implement `src/components/layout/SkipLink.jsx`**

```jsx
/**
 * Keyboard shortcut past the header. Uses focus() instead of the default "#main" jump
 * because HashRouter would treat "#main" as a route.
 * @param {{ targetRef: import('react').RefObject<HTMLElement | null> }} props
 */
export default function SkipLink({ targetRef }) {
  return (
    <a
      href="#main"
      onClick={(event) => {
        event.preventDefault()
        targetRef.current?.focus()
      }}
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg dark:focus:bg-slate-900"
    >
      Skip to main content
    </a>
  )
}
```

- [ ] **Step 4: Implement `src/components/layout/Header.jsx`**

```jsx
import { Link, NavLink } from 'react-router-dom'

/** @param {{ isActive: boolean }} state */
function navLinkClass({ isActive }) {
  const base = 'rounded px-3 py-2 text-sm font-medium'
  return isActive
    ? `${base} bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white`
    : `${base} text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white`
}

export default function Header() {
  return (
    <header className="border-b border-slate-200 dark:border-slate-800">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="text-lg font-bold">
          AWS Practitioner Prep
        </Link>
        <nav aria-label="Main">
          <ul className="flex gap-1">
            <li>
              <NavLink to="/" end className={navLinkClass}>
                Certifications
              </NavLink>
            </li>
            <li>
              <NavLink to="/settings" className={navLinkClass}>
                Settings
              </NavLink>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}
```

- [ ] **Step 5: Implement `src/components/layout/Breadcrumbs.jsx`**

```jsx
import { Link, useMatches } from 'react-router-dom'

/**
 * Routes opt in by setting `handle: { crumb: (params) => label }` (see router.jsx).
 * @typedef {{ crumb?: (params: import('react-router-dom').Params<string>) => string | null }} CrumbHandle
 */

export default function Breadcrumbs() {
  const crumbs = useMatches().flatMap((match) => {
    const handle = /** @type {CrumbHandle | undefined} */ (match.handle)
    const label = handle?.crumb?.(match.params)
    return label ? [{ label, to: match.pathname }] : []
  })

  if (crumbs.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="mx-auto w-full max-w-5xl px-4 pt-4 text-sm">
      <ol className="flex flex-wrap items-center gap-1 text-slate-600 dark:text-slate-400">
        <li>
          <Link to="/" className="underline-offset-2 hover:underline">
            Home
          </Link>
        </li>
        {crumbs.map((crumb, index) => (
          <li key={crumb.to} className="flex items-center gap-1">
            <span aria-hidden="true">/</span>
            {index === crumbs.length - 1 ? (
              <span aria-current="page" className="font-medium text-slate-900 dark:text-slate-100">
                {crumb.label}
              </span>
            ) : (
              <Link to={crumb.to} className="underline-offset-2 hover:underline">
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
```

- [ ] **Step 6: Implement `src/components/layout/Footer.jsx`**

```jsx
export default function Footer() {
  return (
    <footer className="border-t border-slate-200 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
      <div className="mx-auto w-full max-w-5xl space-y-2 px-4 py-6">
        <p>
          This is an independent study aid. It is not affiliated with, endorsed by, or sponsored
          by Amazon Web Services, Inc. AWS and related marks are trademarks of Amazon.com, Inc. or
          its affiliates.
        </p>
        <p>
          Questions and lessons are AI-generated and may contain errors. Use “Report issue” on any
          question to flag a problem.
        </p>
        <p>
          Your progress is stored only in this browser. Export a backup from Settings to keep it
          safe.
        </p>
      </div>
    </footer>
  )
}
```

- [ ] **Step 7: Implement `src/components/layout/StorageWarning.jsx`**

```jsx
import { useUiStore } from '../../stores/useUiStore.js'

export default function StorageWarning() {
  const storageError = useUiStore((state) => state.storageError)
  if (!storageError) return null
  return (
    <div
      role="alert"
      className="bg-amber-100 px-4 py-3 text-center text-sm text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
    >
      Your browser blocked local storage, so your progress can’t be saved. Private browsing modes
      often do this.
    </div>
  )
}
```

- [ ] **Step 8: Implement `src/components/layout/AppShell.jsx`**

```jsx
import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Breadcrumbs from './Breadcrumbs.jsx'
import Footer from './Footer.jsx'
import Header from './Header.jsx'
import SkipLink from './SkipLink.jsx'
import StorageWarning from './StorageWarning.jsx'

export default function AppShell() {
  const mainRef = useRef(/** @type {HTMLElement | null} */ (null))
  const { pathname } = useLocation()
  const previousPathname = useRef(pathname)

  // After client-side navigation, move focus to the new page so keyboard and screen-reader
  // users start at its content. Comparing paths (not a first-render flag) is StrictMode-safe.
  useEffect(() => {
    if (previousPathname.current === pathname) return
    previousPathname.current = pathname
    mainRef.current?.focus()
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink targetRef={mainRef} />
      <StorageWarning />
      <Header />
      <Breadcrumbs />
      <main
        id="main"
        ref={mainRef}
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 outline-none"
      >
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `npx vitest run src/components/layout/AppShell.test.jsx && npm run typecheck && npm run lint`
Expected: PASS — `6 passed`; `tsc` prints nothing; oxlint `0 warnings and 0 errors`.

- [ ] **Step 10: Commit**

```bash
npm run format
git add -A
git commit -m "feat: add accessible app shell with breadcrumbs and disclaimers" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Route table and page skeletons

**Files:**
- Create: `src/router.jsx`, `src/hooks/useCert.js`, `src/test/renderRoute.jsx`
- Create pages in `src/routes/`: `HomePage.jsx`, `CertGuard.jsx`, `CertDashboardPage.jsx`, `DomainPage.jsx`, `SubdomainPage.jsx`, `ReviewPage.jsx`, `TestSetupPage.jsx`, `AttemptPage.jsx`, `ResultsPage.jsx`, `SettingsPage.jsx` (temporary heading only; finished in Task 15), `NotFoundPage.jsx`, `RouteError.jsx`
- Test: `src/router.test.jsx`

- [ ] **Step 1: Create the test helper `src/test/renderRoute.jsx`**

```jsx
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { routes } from '../router.jsx'

/**
 * Renders the real app route table at `path`.
 * @param {string} path
 */
export function renderRoute(path) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}
```

- [ ] **Step 2: Write the failing test `src/router.test.jsx`**

```jsx
import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderRoute } from './test/renderRoute.jsx'

describe('routes', () => {
  it.each([
    ['/', 'AWS Practitioner Exam Prep'],
    ['/settings', 'Settings'],
    ['/clf-c02', 'CLF-C02: AWS Certified Cloud Practitioner'],
    ['/aif-c01/d/3', 'Domain 3'],
    ['/clf-c02/s/1.1', 'Task 1.1'],
    ['/clf-c02/s/1.1/review', 'Review: Task 1.1'],
    ['/clf-c02/test/new?kind=diagnostic', 'Diagnostic Exam'],
    ['/aif-c01/test/new?kind=pre&scope=2.1', 'Pre-Test'],
    ['/attempt/abc', 'Test in progress'],
    ['/attempt/abc/results', 'Results'],
  ])('%s renders its page', async (path, heading) => {
    renderRoute(path)
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
  })

  it.each(['/saa-c03', '/clf-c02/nope', '/clf-c02/test/new?kind=quiz', '/attempt'])(
    '%s shows the not-found page',
    async (path) => {
      renderRoute(path)
      expect(
        await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
      ).toBeInTheDocument()
    },
  )

  it('breadcrumbs trace the curriculum path', async () => {
    renderRoute('/clf-c02/s/1.1/review')
    await screen.findByRole('heading', { level: 1, name: 'Review: Task 1.1' })
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
    const labels = within(nav)
      .getAllByRole('listitem')
      .map((item) => item.textContent?.replace('/', '').trim())
    expect(labels).toEqual(['Home', 'CLF-C02', 'Task 1.1', 'Review'])
  })

  it('home links to each certification dashboard', async () => {
    renderRoute('/')
    const link = await screen.findByRole('link', { name: /AIF-C01/ })
    expect(link).toHaveAttribute('href', '/aif-c01')
  })

  it('the cert dashboard links to the diagnostic exam setup', async () => {
    renderRoute('/clf-c02')
    const link = await screen.findByRole('link', { name: 'Diagnostic Exam' })
    expect(link).toHaveAttribute('href', '/clf-c02/test/new?kind=diagnostic')
  })

  it('the sub-domain page links the Pre-Test, Review and Post-Test steps in order', async () => {
    renderRoute('/clf-c02/s/1.1')
    const steps = within(await screen.findByRole('list', { name: 'Learning path' }))
      .getAllByRole('link')
      .map((link) => [link.textContent, link.getAttribute('href')])
    expect(steps).toEqual([
      ['Pre-Test', '/clf-c02/test/new?kind=pre&scope=1.1'],
      ['Review', '/clf-c02/s/1.1/review'],
      ['Post-Test', '/clf-c02/test/new?kind=post&scope=1.1'],
    ])
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/router.test.jsx`
Expected: FAIL — `../router.jsx` not found.

- [ ] **Step 4: Create `src/hooks/useCert.js`**

```js
import { useParams } from 'react-router-dom'
import { getCert } from '../content/certs.js'

/**
 * The cert for the current `:certId` route. CertGuard has already rejected unknown ids.
 * @returns {import('../content/certs.js').CertSummary}
 */
export function useCert() {
  const { certId = '' } = useParams()
  const cert = getCert(certId)
  if (!cert) throw new Error(`Unknown certification: ${certId}`)
  return cert
}
```

- [ ] **Step 5: Create the shared pages**

`src/routes/NotFoundPage.jsx`:
```jsx
import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <>
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">That page doesn’t exist.</p>
      <Link to="/" className="mt-4 inline-block font-medium text-amber-700 underline dark:text-amber-400">
        Back to certifications
      </Link>
    </>
  )
}
```

`src/routes/RouteError.jsx`:
```jsx
import { useEffect } from 'react'
import { useRouteError } from 'react-router-dom'

/** Shown when a page throws or its lazy chunk fails to load (e.g. right after a deploy). */
export default function RouteError() {
  const error = useRouteError()

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div role="alert" className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        The page failed to load. Reloading usually fixes this, especially right after the app has
        been updated.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-6 rounded bg-slate-900 px-4 py-2 font-medium text-white dark:bg-slate-100 dark:text-slate-900"
      >
        Reload
      </button>
    </div>
  )
}
```

`src/routes/CertGuard.jsx`:
```jsx
import { Outlet, useParams } from 'react-router-dom'
import { getCert } from '../content/certs.js'
import NotFoundPage from './NotFoundPage.jsx'

/** Renders the cert's pages only for a known cert id; anything else is a 404. */
export default function CertGuard() {
  const { certId = '' } = useParams()
  return getCert(certId) ? <Outlet /> : <NotFoundPage />
}
```

`src/routes/HomePage.jsx`:
```jsx
import { Link } from 'react-router-dom'
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
            <Link
              to={`/${cert.id}`}
              className="block rounded-lg border border-slate-200 p-5 hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600"
            >
              <span className="block text-sm font-semibold tracking-wide text-amber-700 dark:text-amber-400">
                {cert.code}
              </span>
              <span className="mt-1 block text-lg font-medium">{cert.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
```

- [ ] **Step 6: Create the cert-scoped pages**

`src/routes/CertDashboardPage.jsx`:
```jsx
import { Link } from 'react-router-dom'
import { TEST_KIND_LABELS } from '../engine/testKinds.js'
import { useCert } from '../hooks/useCert.js'

/** @type {import('../db/types.js').AttemptKind[]} */
const CERT_WIDE_TESTS = ['diagnostic', 'drill', 'full']

export default function CertDashboardPage() {
  const cert = useCert()
  return (
    <>
      <h1 className="text-3xl font-bold">
        {cert.code}: {cert.title}
      </h1>
      <ul className="mt-6 flex flex-wrap gap-3">
        {CERT_WIDE_TESTS.map((kind) => (
          <li key={kind}>
            <Link
              to={`/${cert.id}/test/new?kind=${kind}`}
              className="inline-block rounded border border-slate-300 px-4 py-2 font-medium hover:border-slate-500 dark:border-slate-700 dark:hover:border-slate-500"
            >
              {TEST_KIND_LABELS[kind]}
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
```

`src/routes/DomainPage.jsx`:
```jsx
import { Link, useParams } from 'react-router-dom'
import { useCert } from '../hooks/useCert.js'

export default function DomainPage() {
  const cert = useCert()
  const { domainNo } = useParams()
  return (
    <>
      <h1 className="text-3xl font-bold">Domain {domainNo}</h1>
      <Link
        to={`/${cert.id}/test/new?kind=domain&scope=${domainNo}`}
        className="mt-6 inline-block rounded border border-slate-300 px-4 py-2 font-medium hover:border-slate-500 dark:border-slate-700 dark:hover:border-slate-500"
      >
        Domain Assessment
      </Link>
    </>
  )
}
```

`src/routes/SubdomainPage.jsx`:
```jsx
import { Link, useParams } from 'react-router-dom'
import { useCert } from '../hooks/useCert.js'

export default function SubdomainPage() {
  const cert = useCert()
  const { taskCode } = useParams()
  const steps = [
    { label: 'Pre-Test', to: `/${cert.id}/test/new?kind=pre&scope=${taskCode}` },
    { label: 'Review', to: `/${cert.id}/s/${taskCode}/review` },
    { label: 'Post-Test', to: `/${cert.id}/test/new?kind=post&scope=${taskCode}` },
  ]
  return (
    <>
      <h1 className="text-3xl font-bold">Task {taskCode}</h1>
      <ol aria-label="Learning path" className="mt-6 space-y-3">
        {steps.map((step, index) => (
          <li key={step.label} className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-7 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold dark:bg-slate-800"
            >
              {index + 1}
            </span>
            <Link to={step.to} className="font-medium underline-offset-2 hover:underline">
              {step.label}
            </Link>
          </li>
        ))}
      </ol>
    </>
  )
}
```

`src/routes/ReviewPage.jsx`:
```jsx
import { Link, useParams } from 'react-router-dom'
import { useCert } from '../hooks/useCert.js'

export default function ReviewPage() {
  const cert = useCert()
  const { taskCode } = useParams()
  return (
    <>
      <h1 className="text-3xl font-bold">Review: Task {taskCode}</h1>
      <Link
        to={`/${cert.id}/test/new?kind=post&scope=${taskCode}`}
        className="mt-6 inline-block font-medium text-amber-700 underline dark:text-amber-400"
      >
        Take the Post-Test
      </Link>
    </>
  )
}
```

`src/routes/TestSetupPage.jsx`:
```jsx
import { useSearchParams } from 'react-router-dom'
import { isTestKind, TEST_KIND_LABELS } from '../engine/testKinds.js'
import { useCert } from '../hooks/useCert.js'
import NotFoundPage from './NotFoundPage.jsx'

export default function TestSetupPage() {
  const cert = useCert()
  const [searchParams] = useSearchParams()
  const kind = searchParams.get('kind')
  if (!isTestKind(kind)) return <NotFoundPage />
  const scope = searchParams.get('scope')
  return (
    <>
      <h1 className="text-3xl font-bold">{TEST_KIND_LABELS[kind]}</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        {cert.code}
        {scope ? ` · ${scope}` : ''}
      </p>
    </>
  )
}
```

- [ ] **Step 7: Create the attempt pages and a temporary Settings page**

`src/routes/AttemptPage.jsx`:
```jsx
export default function AttemptPage() {
  return <h1 className="text-3xl font-bold">Test in progress</h1>
}
```

`src/routes/ResultsPage.jsx`:
```jsx
export default function ResultsPage() {
  return <h1 className="text-3xl font-bold">Results</h1>
}
```

`src/routes/SettingsPage.jsx` (replaced in Task 15):
```jsx
export default function SettingsPage() {
  return <h1 className="text-3xl font-bold">Settings</h1>
}
```

- [ ] **Step 8: Create `src/router.jsx`**

```jsx
import AppShell from './components/layout/AppShell.jsx'
import { getCert } from './content/certs.js'
import CertGuard from './routes/CertGuard.jsx'
import NotFoundPage from './routes/NotFoundPage.jsx'
import RouteError from './routes/RouteError.jsx'

/**
 * Turns a dynamic page import into React Router's `lazy` option, so each page is its own chunk.
 * @param {() => Promise<{ default: import('react').ComponentType }>} load
 */
function page(load) {
  return async () => ({ Component: (await load()).default })
}

/**
 * Breadcrumb label for a route (read by components/layout/Breadcrumbs.jsx).
 * @param {(params: import('react-router-dom').Params<string>) => string | null} label
 */
function crumb(label) {
  return { crumb: label }
}

/** @type {import('react-router-dom').RouteObject[]} */
export const routes = [
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, lazy: page(() => import('./routes/HomePage.jsx')) },
      {
        path: 'settings',
        handle: crumb(() => 'Settings'),
        lazy: page(() => import('./routes/SettingsPage.jsx')),
      },
      {
        path: 'attempt/:attemptId',
        handle: crumb(() => 'Test'),
        lazy: page(() => import('./routes/AttemptPage.jsx')),
      },
      {
        path: 'attempt/:attemptId/results',
        handle: crumb(() => 'Results'),
        lazy: page(() => import('./routes/ResultsPage.jsx')),
      },
      {
        path: ':certId',
        element: <CertGuard />,
        handle: crumb((params) => getCert(params.certId ?? '')?.code ?? null),
        children: [
          { index: true, lazy: page(() => import('./routes/CertDashboardPage.jsx')) },
          {
            path: 'd/:domainNo',
            handle: crumb((params) => `Domain ${params.domainNo}`),
            lazy: page(() => import('./routes/DomainPage.jsx')),
          },
          {
            path: 's/:taskCode',
            handle: crumb((params) => `Task ${params.taskCode}`),
            children: [
              { index: true, lazy: page(() => import('./routes/SubdomainPage.jsx')) },
              {
                path: 'review',
                handle: crumb(() => 'Review'),
                lazy: page(() => import('./routes/ReviewPage.jsx')),
              },
            ],
          },
          {
            path: 'test/new',
            handle: crumb(() => 'New test'),
            lazy: page(() => import('./routes/TestSetupPage.jsx')),
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `npx vitest run src/router.test.jsx && npm run typecheck && npm run lint`
Expected: PASS — `18 passed`; `tsc` prints nothing; oxlint `0 warnings and 0 errors`.

- [ ] **Step 10: Commit**

```bash
npm run format
git add -A
git commit -m "feat: add route table with lazy page skeletons and cert guard" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Settings page (theme + storage protection)

**Files:**
- Modify: `src/routes/SettingsPage.jsx` (replace the Task 14 placeholder)
- Test: `src/routes/SettingsPage.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useUiStore } from '../stores/useUiStore.js'
import { restoreStorage, stubStorage } from '../test/stubStorage.js'
import SettingsPage from './SettingsPage.jsx'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
  useUiStore.setState({ theme: 'system' })
})

afterEach(restoreStorage)

describe('SettingsPage', () => {
  it('switches to the dark theme', async () => {
    stubStorage({ persisted: async () => true })
    const user = userEvent.setup()
    render(<SettingsPage />)
    expect(screen.getByRole('radio', { name: 'Match my device' })).toBeChecked()
    await user.click(screen.getByRole('radio', { name: 'Dark' }))
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked()
    expect(document.documentElement).toHaveClass('dark')
  })

  it('reports protected storage without offering the button', async () => {
    stubStorage({ persisted: async () => true })
    render(<SettingsPage />)
    expect(await screen.findByText(/^Protected\./)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /keep my progress/i })).not.toBeInTheDocument()
  })

  it('offers to request protection and shows the result', async () => {
    stubStorage({ persisted: async () => false, persist: async () => true })
    const user = userEvent.setup()
    render(<SettingsPage />)
    expect(await screen.findByText(/^Not protected\./)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ask the browser to keep my progress' }))
    expect(await screen.findByText(/^Protected\./)).toBeInTheDocument()
  })

  it('explains when the browser cannot protect storage', async () => {
    stubStorage(undefined)
    render(<SettingsPage />)
    expect(await screen.findByText(/can’t protect stored progress/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/routes/SettingsPage.test.jsx`
Expected: FAIL — `Unable to find role="radio"` (placeholder page has no controls).

- [ ] **Step 3: Replace `src/routes/SettingsPage.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { getPersistenceStatus, requestPersistence } from '../db/persist.js'
import { useUiStore } from '../stores/useUiStore.js'

/** @typedef {import('../db/persist.js').PersistenceStatus} PersistenceStatus */

/** @type {{ value: import('../stores/useUiStore.js').Theme, label: string }[]} */
const THEME_OPTIONS = [
  { value: 'system', label: 'Match my device' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

/** @type {Record<PersistenceStatus, string>} */
const STORAGE_STATUS_TEXT = {
  persisted: 'Protected. Your browser won’t clear your progress to free up space.',
  'best-effort':
    'Not protected. Your browser may clear your progress if the device runs low on storage.',
  unsupported: 'This browser can’t protect stored progress. Export backups regularly.',
}

export default function SettingsPage() {
  const theme = useUiStore((state) => state.theme)
  const setTheme = useUiStore((state) => state.setTheme)
  const [storageStatus, setStorageStatus] = useState(
    /** @type {PersistenceStatus | null} */ (null),
  )

  useEffect(() => {
    let cancelled = false
    getPersistenceStatus().then((status) => {
      if (!cancelled) setStorageStatus(status)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <h1 className="text-3xl font-bold">Settings</h1>

      <section aria-labelledby="appearance-heading" className="mt-8">
        <h2 id="appearance-heading" className="text-xl font-semibold">
          Appearance
        </h2>
        <fieldset className="mt-3">
          <legend className="text-sm text-slate-600 dark:text-slate-300">Theme</legend>
          <div className="mt-2 flex flex-wrap gap-4">
            {THEME_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="theme"
                  value={option.value}
                  checked={theme === option.value}
                  onChange={() => setTheme(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section aria-labelledby="storage-heading" className="mt-8">
        <h2 id="storage-heading" className="text-xl font-semibold">
          Storage
        </h2>
        <p className="mt-2" aria-live="polite">
          {storageStatus ? STORAGE_STATUS_TEXT[storageStatus] : 'Checking storage…'}
        </p>
        {storageStatus === 'best-effort' && (
          <button
            type="button"
            onClick={async () => setStorageStatus(await requestPersistence())}
            className="mt-3 rounded bg-slate-900 px-4 py-2 font-medium text-white dark:bg-slate-100 dark:text-slate-900"
          >
            Ask the browser to keep my progress
          </button>
        )}
      </section>
    </>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/routes/SettingsPage.test.jsx src/router.test.jsx && npm run typecheck && npm run lint`
Expected: PASS — `22 passed`; `tsc` prints nothing; oxlint `0 warnings and 0 errors`.

- [ ] **Step 5: Commit**

```bash
npm run format
git add -A
git commit -m "feat: add settings page with theme and storage protection" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: App boot wiring (theme without flash, DB open, HashRouter)

**Files:**
- Modify: `src/main.jsx` (replace the Task 1 placeholder)
- Modify: `index.html` (add the theme bootstrap script to `<head>`)

- [ ] **Step 1: Replace `src/main.jsx`**

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import { openDatabase } from './db/db.js'
import './index.css'
import { routes } from './router.jsx'
import { applyTheme, useUiStore, watchSystemTheme } from './stores/useUiStore.js'

applyTheme(useUiStore.getState().theme)
watchSystemTheme()

openDatabase().then((ok) => {
  if (!ok) useUiStore.setState({ storageError: true })
})

// Hash routing: GitHub Pages has no server-side rewrites, so deep links must live after "#".
const router = createHashRouter(routes)

createRoot(/** @type {HTMLElement} */ (document.getElementById('root'))).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
```

- [ ] **Step 2: Add the theme bootstrap to `index.html`**

Insert immediately after the `<title>` line:
```html
    <script>
      // Apply the saved theme before first paint (no light flash in dark mode).
      // Keep the key and logic in sync with src/stores/useUiStore.js.
      ;(function () {
        try {
          var theme = localStorage.getItem('theme')
          var dark =
            theme === 'dark' ||
            (theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches)
          document.documentElement.classList.toggle('dark', dark)
        } catch (e) {}
      })()
    </script>
```

- [ ] **Step 3: Verify the whole suite, types, lint and build**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: Vitest `Test Files  16 passed`; `tsc` prints nothing; oxlint `0 warnings and 0 errors`; Vite build lists `index-*.js` (≈100 KB gzip) plus one small chunk per page (`HomePage-*.js`, `SettingsPage-*.js`, …).

- [ ] **Step 4: Smoke-check in the dev server**

Run: `npm run dev`, open `http://localhost:5173/SupervisedLearning/`.
Expected: Home lists CLF-C02 and AIF-C01; clicking one goes to `#/clf-c02`; `#/settings` → choosing Dark turns the page dark and survives a reload without a light flash. Stop the server (Ctrl+C).

- [ ] **Step 5: Commit**

```bash
npm run format
git add -A
git commit -m "feat: wire app boot with hash router, theme bootstrap and DB open" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: Playwright end-to-end smoke tests

**Files:**
- Create: `playwright.config.js`, `e2e/app.spec.js`

- [ ] **Step 1: Install the Chromium browser for Playwright**

Run: `npx playwright install chromium`
Expected: download completes (or "already installed").

- [ ] **Step 2: Create `playwright.config.js`**

```js
import { defineConfig, devices } from '@playwright/test'

const BASE_URL = 'http://localhost:4173/SupervisedLearning/'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Test the production build exactly as GitHub Pages will serve it (same base path).
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
```

- [ ] **Step 3: Write `e2e/app.spec.js`**

```js
import { expect, test } from '@playwright/test'

test('home lists both certifications and opens a dashboard', async ({ page }) => {
  await page.goto('./')
  await expect(
    page.getByRole('heading', { level: 1, name: 'AWS Practitioner Exam Prep' }),
  ).toBeVisible()
  await page.getByRole('link', { name: /CLF-C02/ }).click()
  await expect(page).toHaveURL(/#\/clf-c02$/)
  await expect(page.getByRole('heading', { level: 1, name: /^CLF-C02:/ })).toBeVisible()
})

test('a deep link survives a full reload', async ({ page }) => {
  await page.goto('./#/aif-c01/s/2.1/review')
  const heading = page.getByRole('heading', { level: 1, name: 'Review: Task 2.1' })
  await expect(heading).toBeVisible()
  await page.reload()
  await expect(heading).toBeVisible()
})

test('the theme choice persists across reloads', async ({ page }) => {
  await page.goto('./#/settings')
  await page.getByRole('radio', { name: 'Dark' }).check()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await expect(page.getByRole('radio', { name: 'Dark' })).toBeChecked()
})

test('IndexedDB schema is created and stored data survives a reload', async ({ page }) => {
  await page.goto('./')
  await expect
    .poll(() => page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name)))
    .toContain('awsprep')

  const storeNames = await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open('awsprep')
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const names = [...request.result.objectStoreNames].sort()
          request.result.close()
          resolve(names)
        }
      }),
  )
  expect(storeNames).toEqual(['attempts', 'flags', 'itemStats', 'settings', 'subdomainProgress'])

  await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open('awsprep')
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const db = request.result
          const tx = db.transaction('settings', 'readwrite')
          tx.objectStore('settings').put({ key: 'e2e-check', value: 42 })
          tx.oncomplete = () => {
            db.close()
            resolve(undefined)
          }
          tx.onerror = () => reject(tx.error)
        }
      }),
  )

  await page.reload()

  const value = await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open('awsprep')
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const db = request.result
          const get = db.transaction('settings').objectStore('settings').get('e2e-check')
          get.onsuccess = () => {
            db.close()
            resolve(get.result?.value)
          }
          get.onerror = () => reject(get.error)
        }
      }),
  )
  expect(value).toBe(42)
})
```

- [ ] **Step 4: Run the E2E suite**

Run: `npm run test:e2e`
Expected: the build runs, then `4 passed`.

- [ ] **Step 5: Commit**

```bash
npm run format
git add -A
git commit -m "test: add Playwright smoke tests against the production build" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: README and Phase 1 exit verification

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create `README.md`**

````markdown
# AWS Practitioner Exam Prep

A free, browser-only study app for the **AWS Certified Cloud Practitioner (CLF-C02)** and
**AWS Certified AI Practitioner (AIF-C01)** exams. Built with React + Vite and deployed to
GitHub Pages. All progress is stored locally in the browser (IndexedDB).

Not affiliated with or endorsed by Amazon Web Services.

## Requirements

- Node 24 (see `.nvmrc`)

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server at http://localhost:5173/SupervisedLearning/ |
| `npm test` | Unit and component tests (Vitest) |
| `npm run test:e2e` | Builds, serves and runs Playwright tests |
| `npm run lint` | oxlint (warnings fail) |
| `npm run typecheck` | JSDoc type-check with `tsc --checkJs` |
| `npm run format` | Prettier |
| `npm run build` | Production build to `dist/` |

## Design

- Spec: `docs/superpowers/specs/2026-10-13-aws-cert-review-design.md`
- Plans: `docs/superpowers/plans/`
````

- [ ] **Step 2: Run every Phase 1 exit check**

Run: `npm run format:check && npm run lint && npm run typecheck && npm test && npm run test:e2e`
Expected:
- Prettier: `All matched files use Prettier code style!`
- oxlint: `Found 0 warnings and 0 errors.`
- tsc: no output
- Vitest: `Test Files  16 passed`
- Playwright: `4 passed`

- [ ] **Step 3: Confirm the bundle budget**

Run: `npm run build`
Expected: the entry chunk `assets/index-*.js` gzip size is **≤ 150 KB** (spec budget). Page chunks are separate files.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add README with scripts and design links" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Phase 1 exit criteria (from the spec)

- [ ] `npm run dev` serves the shell with all routes navigable — Tasks 14, 16, 17
- [ ] Dexie opens and survives reload — Tasks 6, 16, 17
- [ ] lint / typecheck / test pass — Task 18
