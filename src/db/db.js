import { Dexie } from 'dexie'

export const DB_NAME = 'awsprep'

/**
 * @typedef {Dexie & {
 *   attempts: import('dexie').EntityTable<import('./types.js').Attempt, 'id'>,
 *   itemStats: import('dexie').EntityTable<import('./types.js').ItemStat, 'itemId'>,
 *   subdomainProgress: import('dexie').EntityTable<import('./types.js').SubdomainProgress, 'subdomainId'>,
 *   flags: import('dexie').EntityTable<import('./types.js').Flag, 'id'>,
 *   settings: import('dexie').EntityTable<import('./types.js').Setting, 'key'>,
 * }} AppDatabase
 */

/** @type {AppDatabase} */
export const db = /** @type {AppDatabase} */ (new Dexie(DB_NAME))

// Schema v1. Never edit a released version: add db.version(2) with an upgrade instead.
db.version(1).stores({
  attempts: 'id, certId, [certId+kind], scopeId, status, startedAt',
  itemStats: 'itemId, certId, subdomainId, lastSeenAt',
  subdomainProgress: 'subdomainId, certId',
  flags: '++id, itemId, certId, createdAt',
  settings: 'key',
})

/**
 * Opens the database eagerly so storage problems surface at startup.
 * @returns {Promise<boolean>} false when IndexedDB is unavailable (e.g. some private-browsing modes)
 */
export async function openDatabase() {
  try {
    await db.open()
    return true
  } catch (error) {
    console.error('Failed to open IndexedDB', error)
    return false
  }
}
