import { domainId, subdomainId } from '../../src/content/ids.js'

/** @typedef {import('./readContent.mjs').CertContent} CertContent */
/** @typedef {import('./readContent.mjs').Content} Content */
/** @typedef {import('../../src/content/types.js').Manifest} Manifest */
/** @typedef {import('../../src/content/types.js').ManifestCert} ManifestCert */
/** @typedef {import('../../src/content/types.js').CertIndex} CertIndex */

// These builders assume the content already passed validateContent().

/**
 * Active (non-retired) item ids per task, per shard, in file order.
 * @param {CertContent} cert
 * @returns {Map<string, { shardNo: string, ids: string[] }[]>}
 */
function activeIdsByTask(cert) {
  const byTask = new Map()
  for (const shard of cert.shards) {
    const ids = shard.data.items.filter((item) => !item.retired).map((item) => item.id)
    const list = byTask.get(shard.task) ?? []
    list.push({ shardNo: shard.file.replace(/\.json$/, ''), ids })
    byTask.set(shard.task, list)
  }
  return byTask
}

/** @param {{ itemCount: number }[]} list */
const totalItems = (list) => list.reduce((sum, entry) => sum + entry.itemCount, 0)

/**
 * @param {Content} content
 * @returns {Manifest}
 */
export function buildManifest(content) {
  const certs = content.certs.map((cert) => {
    const { blueprint } = cert
    const byTask = activeIdsByTask(cert)
    const lessonTasks = new Set(cert.lessons.map((lesson) => lesson.task))
    /** @param {string} code */
    const countFor = (code) =>
      (byTask.get(code) ?? []).reduce((n, shard) => n + shard.ids.length, 0)
    const domains = blueprint.domains.map((domain) => {
      const subdomains = domain.subdomains.map((sub) => ({
        id: subdomainId(blueprint.certId, sub.code),
        code: sub.code,
        title: sub.title,
        itemCount: countFor(sub.code),
        hasLesson: lessonTasks.has(sub.code),
      }))
      return {
        id: domainId(blueprint.certId, domain.no),
        no: domain.no,
        title: domain.title,
        weight: domain.weight,
        itemCount: totalItems(subdomains),
        subdomains,
      }
    })
    /** @type {ManifestCert} */
    const summary = {
      id: blueprint.certId,
      code: blueprint.code,
      title: blueprint.title,
      exam: blueprint.exam,
      itemCount: totalItems(domains),
      domains,
    }
    return { displayOrder: blueprint.displayOrder, summary }
  })
  certs.sort((a, b) => a.displayOrder - b.displayOrder)
  return { schemaVersion: 1, certs: certs.map((cert) => cert.summary) }
}

/**
 * @param {CertContent} cert
 * @returns {CertIndex}
 */
export function buildCertIndex(cert) {
  const byTask = activeIdsByTask(cert)
  /** @type {CertIndex} */
  const index = { objectives: {}, shards: {} }
  for (const domain of cert.blueprint.domains) {
    for (const sub of domain.subdomains) {
      index.objectives[sub.code] = sub.objectives
      const shards = (byTask.get(sub.code) ?? []).filter((shard) => shard.ids.length > 0)
      index.shards[sub.code] = Object.fromEntries(shards.map((shard) => [shard.shardNo, shard.ids]))
    }
  }
  return index
}
