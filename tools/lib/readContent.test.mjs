// @vitest-environment node
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { readContent } from './readContent.mjs'

const FIXTURES = fileURLToPath(new URL('../__fixtures__/content', import.meta.url))

describe('readContent', () => {
  it('reads every cert folder and skips loose files', async () => {
    const content = await readContent(FIXTURES)
    expect(content.certs.map((cert) => cert.certId)).toEqual(['tst-c01', 'tst-c02'])
  })

  it('loads the blueprint, references, shards in numeric task order, and lessons', async () => {
    const [cert] = (await readContent(FIXTURES)).certs
    expect(cert.blueprint).toMatchObject({ certId: 'tst-c01' })
    expect(cert.references).toHaveLength(1)
    expect(cert.shards.map((shard) => `${shard.task}/${shard.file}`)).toEqual([
      '1.1/001.json',
      '1.2/001.json',
      '1.10/001.json',
    ])
    expect(cert.shards[0].data).toMatchObject({ subdomain: '1.1' })
    expect(cert.lessons).toEqual([
      { task: '1.1', text: expect.stringContaining('# Fixture lesson') },
    ])
  })

  it('reports missing files as a null blueprint and empty lists', async () => {
    const cert = (await readContent(FIXTURES)).certs[1]
    expect(cert).toMatchObject({ certId: 'tst-c02', blueprint: null, references: [], shards: [] })
    expect(cert.lessons.map((lesson) => lesson.task)).toEqual(['2.1'])
  })

  it('returns no certs when the content folder does not exist', async () => {
    expect(await readContent(path.join(FIXTURES, 'missing'))).toEqual({ certs: [] })
  })
})
