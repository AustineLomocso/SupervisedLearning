// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { BUDGETS_KB, checkBudgets, initialScriptPaths } from './sizeBudget.mjs'

const KB = 1024
/** @param {string} name @param {number} kb */
const file = (name, kb) => ({ name, bytes: Math.round(kb * KB) })

const GOOD = {
  initialJs: [file('assets/index-a.js', 6), file('assets/react-b.js', 96)],
  manifest: file('manifest.json', 1.4),
  indexes: [file('clf-c02-index-x.js', 4.7)],
  shards: [file('clf-c02-1.1-001-y.js', 9.4), file('clf-c02-1.2-001-z.js', 6.4)],
}

describe('checkBudgets', () => {
  it('passes when everything is within budget', () => {
    const { errors, lines } = checkBudgets(GOOD)
    expect(errors).toEqual([])
    expect(lines.join('\n')).toContain('Initial JS')
  })

  it('publishes the spec’s budgets', () => {
    expect(BUDGETS_KB).toEqual({ initialJs: 150, manifest: 10, certIndex: 20, shard: 25 })
  })

  it('fails when the initial JS is over 150 KB gzipped, summing every preloaded file', () => {
    const { errors } = checkBudgets({
      ...GOOD,
      initialJs: [file('assets/index-a.js', 80), file('assets/react-b.js', 80)],
    })
    expect(errors).toEqual([expect.stringContaining('Initial JS')])
    expect(errors[0]).toContain('160.0 KB')
  })

  it('fails when the manifest is too big', () => {
    const { errors } = checkBudgets({ ...GOOD, manifest: file('manifest.json', 11) })
    expect(errors).toEqual([expect.stringContaining('Manifest')])
  })

  it('names the offending cert index and shard', () => {
    const { errors } = checkBudgets({
      ...GOOD,
      indexes: [file('clf-c02-index-x.js', 21)],
      shards: [file('clf-c02-1.1-001-y.js', 26), file('ok.js', 1)],
    })
    expect(errors).toHaveLength(2)
    expect(errors[0]).toContain('clf-c02-index-x.js')
    expect(errors[1]).toContain('clf-c02-1.1-001-y.js')
  })

  it('treats a missing group as an error, since it means the chunk naming broke', () => {
    expect(checkBudgets({ ...GOOD, shards: [] }).errors).toEqual([
      expect.stringContaining('No question shard chunks'),
    ])
    expect(checkBudgets({ ...GOOD, indexes: [] }).errors).toEqual([
      expect.stringContaining('No cert index chunks'),
    ])
    expect(checkBudgets({ ...GOOD, initialJs: [] }).errors).toEqual([
      expect.stringContaining('No initial scripts'),
    ])
  })
})

describe('initialScriptPaths', () => {
  it('lists the entry script and its modulepreloads, without the base path or styles', () => {
    const html = `
      <script>inline()</script>
      <script type="module" crossorigin src="/SupervisedLearning/assets/index-a.js"></script>
      <link rel="modulepreload" crossorigin href="/SupervisedLearning/assets/react-b.js">
      <link rel="stylesheet" crossorigin href="/SupervisedLearning/assets/index-c.css">
    `
    expect(initialScriptPaths(html, '/SupervisedLearning/')).toEqual([
      'assets/index-a.js',
      'assets/react-b.js',
    ])
  })
})
