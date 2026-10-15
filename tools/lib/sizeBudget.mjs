/**
 * The spec's size budgets, in KB of gzipped transfer (1 KB = 1024 bytes).
 * Initial JS is everything the first page load needs: the entry script plus its preloads.
 */
export const BUDGETS_KB = { initialJs: 150, manifest: 10, certIndex: 20, shard: 25 }

/** @typedef {{ name: string, bytes: number }} Sized */

const kb = (/** @type {number} */ bytes) => `${(bytes / 1024).toFixed(1)} KB`

/**
 * @param {string} html the built dist/index.html
 * @param {string} base the Vite base path, e.g. "/SupervisedLearning/"
 * @returns {string[]} script paths relative to dist/, e.g. "assets/index-abc.js"
 */
export function initialScriptPaths(html, base) {
  const paths = []
  const tags =
    html.match(/<script[^>]*type="module"[^>]*>|<link[^>]*rel="modulepreload"[^>]*>/g) ?? []
  for (const tag of tags) {
    const url = /(?:src|href)="([^"]+)"/.exec(tag)?.[1]
    if (url?.startsWith(base)) paths.push(url.slice(base.length))
  }
  return paths
}

/**
 * Compares measured (gzipped) sizes with the budgets.
 * @param {{ initialJs: Sized[], manifest: Sized, indexes: Sized[], shards: Sized[] }} sizes
 * @returns {{ lines: string[], errors: string[] }}
 */
export function checkBudgets({ initialJs, manifest, indexes, shards }) {
  /** @type {string[]} */
  const errors = []
  /** @type {string[]} */
  const lines = []
  const limit = (/** @type {number} */ budget) => budget * 1024

  if (initialJs.length === 0) errors.push('No initial scripts found in dist/index.html.')
  const initialTotal = initialJs.reduce((sum, entry) => sum + entry.bytes, 0)
  lines.push(
    `Initial JS    ${kb(initialTotal)} of ${BUDGETS_KB.initialJs} KB (${initialJs.length} files)`,
  )
  if (initialTotal > limit(BUDGETS_KB.initialJs)) {
    errors.push(`Initial JS is ${kb(initialTotal)}, over the ${BUDGETS_KB.initialJs} KB budget.`)
  }

  lines.push(`Manifest      ${kb(manifest.bytes)} of ${BUDGETS_KB.manifest} KB`)
  if (manifest.bytes > limit(BUDGETS_KB.manifest)) {
    errors.push(`Manifest is ${kb(manifest.bytes)}, over the ${BUDGETS_KB.manifest} KB budget.`)
  }

  /**
   * @param {string} label
   * @param {Sized[]} group
   * @param {number} budget
   * @param {string} missing
   */
  function checkEach(label, group, budget, missing) {
    if (group.length === 0) {
      errors.push(missing)
      return
    }
    const largest = group.reduce((a, b) => (b.bytes > a.bytes ? b : a))
    lines.push(`${label} ${kb(largest.bytes)} largest of ${group.length}, budget ${budget} KB each`)
    for (const entry of group) {
      if (entry.bytes > limit(budget)) {
        errors.push(`${entry.name} is ${kb(entry.bytes)}, over the ${budget} KB budget.`)
      }
    }
  }
  checkEach(
    'Cert index  ',
    indexes,
    BUDGETS_KB.certIndex,
    'No cert index chunks found under assets/content/.',
  )
  checkEach(
    'Shard       ',
    shards,
    BUDGETS_KB.shard,
    'No question shard chunks found under assets/content/.',
  )
  return { lines, errors }
}
