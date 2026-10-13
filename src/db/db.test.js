import { describe, expect, it } from 'vitest'
import { db, DB_NAME, openDatabase } from './db.js'

describe('db', () => {
  it('opens with the five v1 tables', async () => {
    expect(await openDatabase()).toBe(true)
    expect(db.name).toBe(DB_NAME)
    expect(db.tables.map((table) => table.name).sort()).toEqual([
      'attempts',
      'flags',
      'itemStats',
      'settings',
      'subdomainProgress',
    ])
  })

  it('declares the indexes later phases query by', () => {
    const indexNames = (/** @type {import('dexie').Table} */ table) =>
      table.schema.indexes.map((index) => index.name)
    expect(indexNames(db.attempts)).toEqual(
      expect.arrayContaining(['certId', '[certId+kind]', 'scopeId', 'status', 'startedAt']),
    )
    expect(indexNames(db.itemStats)).toEqual(
      expect.arrayContaining(['certId', 'subdomainId', 'lastSeenAt']),
    )
    expect(indexNames(db.subdomainProgress)).toEqual(['certId'])
    expect(indexNames(db.flags)).toEqual(expect.arrayContaining(['itemId', 'certId', 'createdAt']))
  })
})
