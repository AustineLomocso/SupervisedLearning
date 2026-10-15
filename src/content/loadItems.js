import { LruCache } from './lru.js'

/** @typedef {import('./types.js').CertIndex} CertIndex */
/** @typedef {import('./types.js').Shard} Shard */
/** @typedef {import('./types.js').LoadedItem} LoadedItem */
/** @typedef {Record<string, () => Promise<unknown>>} ModuleLoaders */
/** @typedef {{ index: CertIndex, locations: Map<string, string> }} CertData */

/**
 * Lazily loads per-cert indexes and 25-item question shards. Loader keys match the glob
 * patterns at the bottom of this file: "../generated/<cert>.index.json" and
 * "/content/<cert>/items/<task>/<NNN>.json".
 * @param {{ indexLoaders: ModuleLoaders, shardLoaders: ModuleLoaders, cacheSize?: number }} options
 */
export function createItemLoader({ indexLoaders, shardLoaders, cacheSize = 80 }) {
  /** @type {Map<string, Promise<CertData>>} */
  const certs = new Map()
  /** @type {LruCache<string, Promise<Shard>>} */
  const shards = new LruCache(cacheSize)

  /**
   * @param {string} certId
   * @returns {Promise<CertData>}
   */
  function certData(certId) {
    const cached = certs.get(certId)
    if (cached) return cached
    const load = indexLoaders[`../generated/${certId}.index.json`]
    if (!load) return Promise.reject(new Error(`Unknown certification: ${certId}`))
    const promise = load().then((module) => {
      const index = /** @type {CertIndex} */ (module)
      /** @type {Map<string, string>} */
      const locations = new Map()
      for (const [task, files] of Object.entries(index.shards)) {
        for (const [shardNo, ids] of Object.entries(files)) {
          for (const id of ids)
            locations.set(id, `/content/${certId}/items/${task}/${shardNo}.json`)
        }
      }
      // Retired items stay loadable so old attempts can resume and show their results.
      for (const [id, where] of Object.entries(index.retired ?? {})) {
        locations.set(id, `/content/${certId}/items/${where}.json`)
      }
      return { index, locations }
    })
    certs.set(certId, promise)
    // Forget failures (e.g. offline) so the next call retries.
    promise.catch(() => certs.delete(certId))
    return promise
  }

  /**
   * @param {string} path
   * @returns {Promise<Shard>}
   */
  function shard(path) {
    const cached = shards.get(path)
    if (cached) return cached
    const load = shardLoaders[path]
    if (!load) return Promise.reject(new Error(`Missing shard: ${path}`))
    const promise = load().then((module) => /** @type {Shard} */ (module))
    shards.set(path, promise)
    promise.catch(() => shards.delete(path))
    return promise
  }

  /**
   * @param {string} certId
   * @returns {Promise<CertIndex>}
   */
  async function getCertIndex(certId) {
    return (await certData(certId)).index
  }

  /**
   * Active item ids for one task, in shard order.
   * @param {string} certId
   * @param {string} taskCode
   * @returns {Promise<string[]>}
   */
  async function getSubdomainItemIds(certId, taskCode) {
    const files = (await certData(certId)).index.shards[taskCode] ?? {}
    return Object.keys(files)
      .sort()
      .flatMap((shardNo) => files[shardNo])
  }

  /**
   * Loads items in the requested order, fetching each needed shard once.
   * @param {string} certId
   * @param {string[]} ids
   * @returns {Promise<LoadedItem[]>}
   */
  async function loadItems(certId, ids) {
    const { locations } = await certData(certId)
    const paths = ids.map((id) => {
      const path = locations.get(id)
      if (!path) throw new Error(`Unknown item: ${id}`)
      return path
    })
    const unique = [...new Set(paths)]
    const loaded = await Promise.all(unique.map((path) => shard(path)))
    const byPath = new Map(unique.map((path, i) => [path, loaded[i]]))
    return ids.map((id, i) => {
      const { subdomain, items } = /** @type {Shard} */ (byPath.get(paths[i]))
      const found = items.find((candidate) => candidate.id === id)
      if (!found) throw new Error(`Item ${id} is missing from ${paths[i]}`)
      return { ...found, certId, taskCode: subdomain }
    })
  }

  return { getCertIndex, getSubdomainItemIds, loadItems }
}

const defaultLoader = createItemLoader({
  indexLoaders: import.meta.glob('../generated/*.index.json', { import: 'default' }),
  shardLoaders: import.meta.glob('/content/*/items/*/*.json', { import: 'default' }),
})

export const { getCertIndex, getSubdomainItemIds, loadItems } = defaultLoader
