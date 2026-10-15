const BACKSLASH = String.fromCharCode(92)

/**
 * Readable build chunk names for content modules, so the size check (and anyone reading
 * dist/) can tell question shards, lessons and cert indexes apart.
 * @param {string | null} moduleId a chunk's facadeModuleId (an absolute path, maybe with a ?query)
 * @returns {string | null} the name without hash or extension, or null for non-content chunks
 */
export function contentChunkName(moduleId) {
  if (!moduleId) return null
  const id = moduleId.replaceAll(BACKSLASH, '/').replace(/[?].*$/, '')
  const shard = /\/content\/([^/]+)\/items\/([^/]+)\/(\d+)\.json$/.exec(id)
  if (shard) return `${shard[1]}-${shard[2]}-${shard[3]}`
  const lesson = /\/content\/([^/]+)\/review\/([^/]+)\.md$/.exec(id)
  if (lesson) return `${lesson[1]}-${lesson[2]}-lesson`
  const index = /\/src\/generated\/([^/]+)\.index\.json$/.exec(id)
  if (index) return `${index[1]}-index`
  return null
}
