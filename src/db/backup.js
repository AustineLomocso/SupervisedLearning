import { db } from './db.js'

/** @typedef {import('./types.js').Attempt} Attempt */
/** @typedef {import('./types.js').ItemStat} ItemStat */
/** @typedef {import('./types.js').SubdomainProgress} SubdomainProgress */
/** @typedef {import('./types.js').Flag} Flag */
/** @typedef {import('./types.js').Setting} Setting */

export const BACKUP_FORMAT = 'awsprep-backup'
export const BACKUP_VERSION = 1

const TABLE_NAMES = ['attempts', 'itemStats', 'subdomainProgress', 'flags', 'settings']

/**
 * @typedef {object} BackupTables
 * @property {Attempt[]} attempts
 * @property {ItemStat[]} itemStats
 * @property {SubdomainProgress[]} subdomainProgress
 * @property {Flag[]} flags
 * @property {Setting[]} settings
 */

/**
 * @typedef {object} Backup
 * @property {string} format always BACKUP_FORMAT
 * @property {number} version
 * @property {string} exportedAt ISO timestamp
 * @property {BackupTables} tables
 */

export class BackupError extends Error {
  /** @param {string} message shown to the learner */
  constructor(message) {
    super(message)
    this.name = 'BackupError'
  }
}

/**
 * Snapshot of all local progress, ready to be saved as a JSON file.
 * @param {number} [now] epoch ms
 * @returns {Promise<Backup>}
 */
export async function exportBackup(now = Date.now()) {
  const tables = await db.transaction('r', db.tables, async () => ({
    attempts: await db.attempts.toArray(),
    itemStats: await db.itemStats.toArray(),
    subdomainProgress: await db.subdomainProgress.toArray(),
    flags: await db.flags.toArray(),
    settings: await db.settings.toArray(),
  }))
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date(now).toISOString(),
    tables,
  }
}

/**
 * Checks the backup's envelope (format, version, table arrays). Rows are trusted: a bad
 * row can only affect the learner's own local data.
 * @param {unknown} value
 * @returns {asserts value is Backup}
 */
export function assertValidBackup(value) {
  if (typeof value !== 'object' || value === null) {
    throw new BackupError('The file is not a valid progress backup.')
  }
  const candidate = /** @type {Record<string, unknown>} */ (value)
  if (candidate.format !== BACKUP_FORMAT) {
    throw new BackupError('This file is not a progress backup from this app.')
  }
  if (typeof candidate.version !== 'number' || candidate.version > BACKUP_VERSION) {
    throw new BackupError('This backup was made by a newer version of the app.')
  }
  const tables = /** @type {Record<string, unknown> | null} */ (
    typeof candidate.tables === 'object' ? candidate.tables : null
  )
  for (const name of TABLE_NAMES) {
    if (!tables || !Array.isArray(tables[name])) {
      throw new BackupError(`The backup is missing its "${name}" data.`)
    }
  }
}

/**
 * Replaces ALL local progress with the backup's contents, atomically.
 * @param {unknown} value parsed JSON from a backup file
 */
export async function importBackup(value) {
  assertValidBackup(value)
  const { tables } = value
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()))
    await db.attempts.bulkPut(tables.attempts)
    await db.itemStats.bulkPut(tables.itemStats)
    await db.subdomainProgress.bulkPut(tables.subdomainProgress)
    await db.flags.bulkPut(tables.flags)
    await db.settings.bulkPut(tables.settings)
  })
}
