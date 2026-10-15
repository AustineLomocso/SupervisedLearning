// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { contentChunkName } from './chunkNames.mjs'

describe('contentChunkName', () => {
  it('names a question shard by cert, task and shard number', () => {
    expect(contentChunkName('/repo/content/clf-c02/items/1.1/001.json')).toBe('clf-c02-1.1-001')
    // A Windows build reports backslash paths.
    const sep = String.fromCharCode(92)
    const windowsId = ['C:', 'repo', 'content', 'aif-c01', 'items', '3.10', '002.json'].join(sep)
    expect(contentChunkName(windowsId)).toBe('aif-c01-3.10-002')
  })

  it('names a lesson by cert and task, ignoring the ?raw query', () => {
    expect(contentChunkName('/repo/content/clf-c02/review/1.1.md?raw')).toBe('clf-c02-1.1-lesson')
  })

  it('names a cert index', () => {
    expect(contentChunkName('/repo/src/generated/clf-c02.index.json')).toBe('clf-c02-index')
  })

  it('leaves everything else alone', () => {
    expect(contentChunkName('/repo/src/routes/HomePage.jsx')).toBeNull()
    expect(contentChunkName('/repo/src/generated/manifest.json')).toBeNull()
    expect(contentChunkName('/repo/content/clf-c02/blueprint.json')).toBeNull()
    expect(contentChunkName(null)).toBeNull()
  })
})
