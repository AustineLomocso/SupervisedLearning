// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { makeContent, makeMultipleItem } from '../__fixtures__/contentBuilders.mjs'
import { computeStats, formatStats } from './stats.mjs'

describe('computeStats', () => {
  it('counts active, retired, multiple-response and difficulty per task, plus lessons', () => {
    const [cert] = computeStats(
      makeContent((c) => {
        c.shards[0].data.items[0] = makeMultipleItem({ difficulty: 3 })
        c.shards[0].data.items[1].retired = true
        c.lessons.shift()
      }),
    )
    expect(cert).toMatchObject({ certId: 'tst-c01', seedTarget: 2, fullTarget: 4 })
    expect(cert.tasks[0]).toEqual({
      task: '1.1',
      active: 1,
      retired: 1,
      multiple: 1,
      difficulty: [0, 0, 1],
      objectives: [0, 0],
      untagged: 1,
      hasLesson: false,
    })
    expect(cert.tasks[1]).toEqual({
      task: '1.2',
      active: 2,
      retired: 0,
      multiple: 0,
      difficulty: [0, 2, 0],
      objectives: [0],
      untagged: 2,
      hasLesson: true,
    })
  })

  it('counts tagged items per objective of the task', () => {
    const [cert] = computeStats(
      makeContent((c) => {
        c.shards[0].data.items[0].objective = 1
        c.shards[0].data.items[1].objective = 1
        c.shards[1].data.items[0].objective = 0
      }),
    )
    expect(cert.tasks[0].objectives).toEqual([0, 2])
    expect(cert.tasks[0].untagged).toBe(0)
    expect(cert.tasks[1].objectives).toEqual([1])
    expect(cert.tasks[1].untagged).toBe(1)
  })
})

describe('formatStats', () => {
  it('prints a per-cert summary and a row per task', () => {
    const text = formatStats(computeStats(makeContent()))
    expect(text).toContain('tst-c01: 6 active items')
    expect(text).toMatch(/^ {2}1\.1 +2 /m)
  })

  it('marks tasks that reach a custom target and shows the objective spread', () => {
    const text = formatStats(
      computeStats(
        makeContent((c) => {
          c.shards[0].data.items[0].objective = 0
          c.shards[0].data.items[1].objective = 1
        }),
      ),
      { target: 2 },
    )
    expect(text).toContain('target 2')
    expect(text).toMatch(/^ {2}1\.1 .*✓.*1\/1/m)
    expect(text).toMatch(/^ {2}2\.1 .*·/m)
  })
})
