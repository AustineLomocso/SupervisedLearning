import { describe, expect, it } from 'vitest'
import { CERTS, listSubdomains } from './certs.js'
import { getCertIndex, getSubdomainItemIds, loadItems } from './loadItems.js'
import { loadReview } from './loadReview.js'

describe.each(CERTS.map((cert) => [cert.id]))('%s content', (certId) => {
  it('indexes objectives for every sub-domain', async () => {
    const index = await getCertIndex(certId)
    for (const sub of listSubdomains(certId)) {
      expect(index.objectives[sub.code]?.length, sub.code).toBeGreaterThan(0)
    }
  })

  it('loads every indexed item from its shard', async () => {
    const subs = listSubdomains(certId)
    const idsByTask = await Promise.all(subs.map((sub) => getSubdomainItemIds(certId, sub.code)))
    const ids = idsByTask.flat()
    expect(ids).toHaveLength(subs.reduce((sum, sub) => sum + sub.itemCount, 0))
    const items = await loadItems(certId, ids)
    expect(items.map((loaded) => loaded.id)).toEqual(ids)
    const taskById = new Map(subs.flatMap((sub, i) => idsByTask[i].map((id) => [id, sub.code])))
    for (const loaded of items) expect(loaded.taskCode).toBe(taskById.get(loaded.id))
  })

  it('loads every lesson the manifest lists', async () => {
    for (const sub of listSubdomains(certId).filter((s) => s.hasLesson)) {
      expect(await loadReview(certId, sub.code)).toMatch(/^# /)
    }
  })
})
