// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { CONTENT_DIR } from './lib/paths.mjs'
import { readContent } from './lib/readContent.mjs'
import { formatIssue, validateContent } from './lib/validate.mjs'

const content = await readContent(CONTENT_DIR)

describe('real content', () => {
  it('has no validation errors', () => {
    expect(validateContent(content).errors.map(formatIssue)).toEqual([])
  })

  it.each([
    ['clf-c02', 4, 19, [0.24, 0.3, 0.34, 0.12]],
    ['aif-c01', 5, 14, [0.2, 0.24, 0.28, 0.14, 0.14]],
  ])('%s has %i domains, %i tasks and the official weights', (certId, domains, tasks, weights) => {
    const cert = content.certs.find((c) => c.certId === certId)
    expect(cert?.blueprint.domains).toHaveLength(domains)
    expect(cert?.blueprint.domains.flatMap((d) => d.subdomains)).toHaveLength(tasks)
    expect(cert?.blueprint.domains.map((d) => d.weight)).toEqual(weights)
  })
})
