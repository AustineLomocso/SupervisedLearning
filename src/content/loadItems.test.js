import { describe, expect, it, vi } from 'vitest'
import { createItemLoader } from './loadItems.js'

/** @param {string} id */
const item = (id) => ({
  id,
  version: 1,
  type: 'single',
  selectCount: 1,
  difficulty: 1,
  stem: `Stem for ${id}`,
  options: [],
  explanation: '',
  references: [],
})

const INDEX = {
  objectives: { 1.1: ['Objective'], 1.2: ['Objective'] },
  shards: {
    1.1: { '001': ['tst-c01-1.1-0001', 'tst-c01-1.1-0002'], '002': ['tst-c01-1.1-0026'] },
    1.2: { '001': ['tst-c01-1.2-0001'] },
  },
}

const P11A = '/content/tst-c01/items/1.1/001.json'
const P11B = '/content/tst-c01/items/1.1/002.json'
const P12 = '/content/tst-c01/items/1.2/001.json'

/** @param {number} [cacheSize] */
function setup(cacheSize) {
  const shards = {
    [P11A]: vi.fn(async () => ({
      schemaVersion: 1,
      subdomain: '1.1',
      items: [item('tst-c01-1.1-0001'), item('tst-c01-1.1-0002')],
    })),
    [P11B]: vi.fn(async () => ({
      schemaVersion: 1,
      subdomain: '1.1',
      items: [item('tst-c01-1.1-0026')],
    })),
    [P12]: vi.fn(async () => ({
      schemaVersion: 1,
      subdomain: '1.2',
      items: [item('tst-c01-1.2-0001')],
    })),
  }
  const indexLoader = vi.fn(async () => INDEX)
  const loader = createItemLoader({
    indexLoaders: { '../generated/tst-c01.index.json': indexLoader },
    shardLoaders: shards,
    cacheSize,
  })
  return { loader, shards, indexLoader }
}

describe('createItemLoader', () => {
  it('returns items in the requested order, tagged with cert and task', async () => {
    const { loader } = setup()
    const items = await loader.loadItems('tst-c01', ['tst-c01-1.2-0001', 'tst-c01-1.1-0002'])
    expect(items.map((i) => [i.id, i.certId, i.taskCode])).toEqual([
      ['tst-c01-1.2-0001', 'tst-c01', '1.2'],
      ['tst-c01-1.1-0002', 'tst-c01', '1.1'],
    ])
  })

  it('loads only the shards it needs', async () => {
    const { loader, shards } = setup()
    await loader.loadItems('tst-c01', ['tst-c01-1.1-0001'])
    expect(shards[P11A]).toHaveBeenCalledTimes(1)
    expect(shards[P11B]).not.toHaveBeenCalled()
    expect(shards[P12]).not.toHaveBeenCalled()
  })

  it('reuses the cached index and shards', async () => {
    const { loader, shards, indexLoader } = setup()
    await loader.loadItems('tst-c01', ['tst-c01-1.1-0001'])
    await loader.loadItems('tst-c01', ['tst-c01-1.1-0002'])
    expect(indexLoader).toHaveBeenCalledTimes(1)
    expect(shards[P11A]).toHaveBeenCalledTimes(1)
  })

  it('evicts the least recently used shard when the cache is full', async () => {
    const { loader, shards } = setup(1)
    await loader.loadItems('tst-c01', ['tst-c01-1.1-0001'])
    await loader.loadItems('tst-c01', ['tst-c01-1.2-0001'])
    await loader.loadItems('tst-c01', ['tst-c01-1.1-0001'])
    expect(shards[P11A]).toHaveBeenCalledTimes(2)
  })

  it('retries a shard that failed to load', async () => {
    const { loader, shards } = setup()
    shards[P12].mockRejectedValueOnce(new Error('offline'))
    await expect(loader.loadItems('tst-c01', ['tst-c01-1.2-0001'])).rejects.toThrow('offline')
    await expect(loader.loadItems('tst-c01', ['tst-c01-1.2-0001'])).resolves.toHaveLength(1)
    expect(shards[P12]).toHaveBeenCalledTimes(2)
  })

  it('rejects unknown items and unknown certs', async () => {
    const { loader } = setup()
    await expect(loader.loadItems('tst-c01', ['tst-c01-9.9-0001'])).rejects.toThrow(
      'Unknown item: tst-c01-9.9-0001',
    )
    await expect(loader.loadItems('nop-c01', [])).rejects.toThrow('Unknown certification: nop-c01')
  })

  it('lists a task’s item ids in shard order', async () => {
    const { loader } = setup()
    expect(await loader.getSubdomainItemIds('tst-c01', '1.1')).toEqual([
      'tst-c01-1.1-0001',
      'tst-c01-1.1-0002',
      'tst-c01-1.1-0026',
    ])
    expect(await loader.getSubdomainItemIds('tst-c01', '9.9')).toEqual([])
  })

  it('exposes the cert index', async () => {
    const { loader } = setup()
    expect(await loader.getCertIndex('tst-c01')).toBe(INDEX)
  })
})
