// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { makeContent, makeItem, makeMultipleItem } from '../__fixtures__/contentBuilders.mjs'
import {
  activeTaskItems,
  compareAnswers,
  formatComparison,
  itemsFrom,
  toBlindItems,
} from './blindSolve.mjs'

const single = makeItem({ id: 'tst-c01-1.1-0001' })
const multiple = makeMultipleItem({ id: 'tst-c01-1.1-0002' })

describe('toBlindItems', () => {
  it('keeps only what a solver needs and never leaks the key', () => {
    const [blind] = toBlindItems([single])
    expect(Object.keys(blind).sort()).toEqual(['id', 'options', 'selectCount', 'stem'])
    expect(blind.options.every((o) => Object.keys(o).sort().join() === 'id,text')).toBe(true)
    expect(JSON.stringify(blind)).not.toContain('rationale')
    expect(JSON.stringify(blind)).not.toContain('correct')
  })
})

describe('activeTaskItems', () => {
  it('returns a task’s active items in shard order', () => {
    const content = makeContent((c) => (c.shards[0].data.items[0].retired = true))
    expect(activeTaskItems(content, 'tst-c01', '1.1').map((i) => i.id)).toEqual([
      'tst-c01-1.1-0002',
    ])
    expect(activeTaskItems(content, 'tst-c01', '1.2')).toHaveLength(2)
  })

  it('explains an unknown cert or task', () => {
    const content = makeContent()
    expect(() => activeTaskItems(content, 'nope-c01', '1.1')).toThrow('Unknown cert')
    expect(() => activeTaskItems(content, 'tst-c01', '9.9')).toThrow('No items for task 9.9')
  })
})

describe('itemsFrom', () => {
  const items = ['x-1.1-0001', 'x-1.1-0020', 'x-1.1-0021', 'x-1.1-0030'].map((id) => ({ id }))

  it('returns everything when no start id is given', () => {
    expect(itemsFrom(items)).toHaveLength(4)
  })

  it('returns items from the start id on, comparing the numbers', () => {
    expect(itemsFrom(items, 'x-1.1-0021').map((i) => i.id)).toEqual(['x-1.1-0021', 'x-1.1-0030'])
  })
})

describe('compareAnswers', () => {
  it('agrees when the reviewer picked the keyed options, in any order', () => {
    const result = compareAnswers([single, multiple], {
      [single.id]: { answer: ['a'], note: 'clear' },
      [multiple.id]: { answer: ['c', 'a'] },
    })
    expect(result).toEqual({ disagreements: [], missing: [], invalid: [], ambiguous: [] })
  })

  it('reports a different answer with the key, the answer and the reviewer’s note', () => {
    const result = compareAnswers([single], {
      [single.id]: { answer: ['b'], note: 'B also works' },
    })
    expect(result.disagreements).toEqual([
      { id: single.id, key: ['a'], answer: ['b'], note: 'B also works' },
    ])
  })

  it('treats a partial or extra multiple-response answer as a disagreement', () => {
    const partial = compareAnswers([multiple], { [multiple.id]: { answer: ['a'] } })
    expect(partial.disagreements.map((d) => d.id)).toEqual([multiple.id])
    const extra = compareAnswers([multiple], { [multiple.id]: { answer: ['a', 'b', 'c'] } })
    expect(extra.disagreements.map((d) => d.id)).toEqual([multiple.id])
  })

  it('lists questions with no answer, and answers that are not option lists', () => {
    const result = compareAnswers([single, multiple], { [multiple.id]: { answer: 'a' } })
    expect(result.missing).toEqual([single.id])
    expect(result.invalid).toEqual([multiple.id])
    expect(result.disagreements).toEqual([])
  })

  it('flags a matching answer whose note says the question is ambiguous', () => {
    const result = compareAnswers([single, multiple], {
      [single.id]: { answer: ['a'], note: 'Ambiguous: B is also defensible' },
      [multiple.id]: { answer: ['a', 'c'], note: 'Clear.' },
    })
    expect(result.disagreements).toEqual([])
    expect(result.ambiguous).toEqual([{ id: single.id, note: 'Ambiguous: B is also defensible' }])
  })

  it('ignores answers for questions that are not in the batch', () => {
    const result = compareAnswers([single], {
      [single.id]: { answer: ['a'] },
      unrelated: { answer: ['a'] },
    })
    expect(result).toEqual({ disagreements: [], missing: [], invalid: [], ambiguous: [] })
  })
})

describe('formatComparison', () => {
  it('passes quietly when everything agrees', () => {
    expect(
      formatComparison({ disagreements: [], missing: [], invalid: [], ambiguous: [] }, 12),
    ).toEqual({
      lines: ['12 of 12 answers match the key.'],
      exitCode: 0,
    })
  })

  it('fails and explains every problem', () => {
    const { lines, exitCode } = formatComparison(
      {
        disagreements: [{ id: 'a-1', key: ['a'], answer: ['b'], note: 'B also works' }],
        missing: ['a-2'],
        invalid: ['a-3'],
        ambiguous: [{ id: 'a-4', note: 'AMBIGUOUS: B also fits' }],
      },
      10,
    )
    expect(exitCode).toBe(1)
    expect(lines).toEqual([
      '✗ a-1: key a, reviewer b. Reviewer: B also works',
      '✗ a-2: no answer',
      '✗ a-3: answer must be a list of option ids',
      '✗ a-4: reviewer flagged it ambiguous. Reviewer: AMBIGUOUS: B also fits',
      '1 disagreement, 1 missing, 1 invalid, 1 flagged ambiguous out of 10.',
    ])
  })
})
