/**
 * Content types. Authored shapes are inferred from the Zod schemas in schema.js through
 * type-only imports, so Zod never reaches the app bundle.
 */

/** @typedef {import('zod').infer<typeof import('./schema.js').BlueprintSchema>} Blueprint */
/** @typedef {import('zod').infer<typeof import('./schema.js').ReferenceSchema>} Reference */
/** @typedef {import('zod').infer<typeof import('./schema.js').CuratedReferenceSchema>} CuratedReference */
/** @typedef {import('zod').infer<typeof import('./schema.js').OptionSchema>} ItemOption */
/** @typedef {import('zod').infer<typeof import('./schema.js').ItemSchema>} Item */
/** @typedef {import('zod').infer<typeof import('./schema.js').ShardSchema>} Shard */

/**
 * An item as returned by the loader, tagged with where it came from.
 * @typedef {Item & { certId: string, taskCode: string }} LoadedItem
 */

/**
 * @typedef {object} ManifestSubdomain
 * @property {string} id sub-domain id, e.g. "clf-c02/1.1"
 * @property {string} code task statement code, e.g. "1.1"
 * @property {string} title official task statement
 * @property {number} itemCount active (non-retired) items
 * @property {boolean} hasLesson
 */

/**
 * @typedef {object} ManifestDomain
 * @property {string} id domain id, e.g. "clf-c02/d1"
 * @property {number} no
 * @property {string} title
 * @property {number} weight share of scored content, 0–1
 * @property {number} itemCount
 * @property {ManifestSubdomain[]} subdomains
 */

/**
 * @typedef {object} ManifestCert
 * @property {string} id e.g. "clf-c02"
 * @property {string} code e.g. "CLF-C02"
 * @property {string} title
 * @property {Blueprint['exam']} exam
 * @property {number} itemCount
 * @property {ManifestDomain[]} domains
 */

/**
 * Contents of src/generated/manifest.json, written by `npm run build:index`.
 * @typedef {{ schemaVersion: 1, certs: ManifestCert[] }} Manifest
 */

/**
 * Contents of src/generated/<certId>.index.json. `shards` maps task code → shard number
 * ("001") → active item ids in that shard.
 * @typedef {object} CertIndex
 * @property {Record<string, string[]>} objectives
 * @property {Record<string, Record<string, string[]>>} shards
 * @property {Record<string, string>} retired retired item id → "<task>/<shardNo>"; still loadable
 */

export {}
