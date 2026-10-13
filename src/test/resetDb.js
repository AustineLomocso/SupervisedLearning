import { db } from '../db/db.js'

/** Empties every table so each test starts from a clean database. */
export async function resetDb() {
  await Promise.all(db.tables.map((table) => table.clear()))
}
