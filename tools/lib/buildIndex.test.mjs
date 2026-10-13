// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { makeContent } from '../__fixtures__/contentBuilders.mjs'
import { buildCertIndex, buildManifest } from './buildIndex.mjs'

describe('buildManifest', () => {
  it('summarises certs, domains and sub-domains with item counts and lesson flags', () => {
    const manifest = buildManifest(makeContent((c) => c.lessons.pop()))
    expect(manifest.schemaVersion).toBe(1)
    const [cert] = manifest.certs
    expect(cert).toMatchObject({
      id: 'tst-c01',
      code: 'TST-C01',
      title: 'Test Certification',
      itemCount: 6,
      exam: { questions: 65, scored: 50, minutes: 90, passScaled: 700 },
    })
    expect(cert.domains.map((d) => [d.id, d.no, d.itemCount, d.weight])).toEqual([
      ['tst-c01/d1', 1, 4, 0.6],
      ['tst-c01/d2', 2, 2, 0.4],
    ])
    expect(cert.domains[1].subdomains).toEqual([
      { id: 'tst-c01/2.1', code: '2.1', title: 'Task three.', itemCount: 2, hasLesson: false },
    ])
  })

  it('excludes retired items from counts', () => {
    const manifest = buildManifest(makeContent((c) => (c.shards[0].data.items[0].retired = true)))
    expect(manifest.certs[0].itemCount).toBe(5)
    expect(manifest.certs[0].domains[0].subdomains[0].itemCount).toBe(1)
  })

  it('orders certs by displayOrder', () => {
    const content = makeContent()
    const second = structuredClone(content.certs[0])
    second.certId = 'two-c01'
    second.blueprint.certId = 'two-c01'
    second.blueprint.displayOrder = 0
    content.certs.push(second)
    expect(buildManifest(content).certs.map((cert) => cert.id)).toEqual(['two-c01', 'tst-c01'])
  })
})

describe('buildCertIndex', () => {
  it('maps every task to its objectives and active item ids per shard', () => {
    const cert = makeContent((c) => (c.shards[2].data.items[1].retired = true)).certs[0]
    expect(buildCertIndex(cert)).toEqual({
      objectives: {
        1.1: ['Objective 1.1 A', 'Objective 1.1 B'],
        1.2: ['Objective 1.2 A'],
        2.1: ['Objective 2.1 A'],
      },
      shards: {
        1.1: { '001': ['tst-c01-1.1-0001', 'tst-c01-1.1-0002'] },
        1.2: { '001': ['tst-c01-1.2-0001', 'tst-c01-1.2-0002'] },
        2.1: { '001': ['tst-c01-2.1-0001'] },
      },
    })
  })

  it('gives tasks without items an empty shard map', () => {
    const cert = makeContent((c) => c.shards.pop()).certs[0]
    expect(buildCertIndex(cert).shards['2.1']).toEqual({})
  })
})
