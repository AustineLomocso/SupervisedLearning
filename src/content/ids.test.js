import { describe, expect, it } from 'vitest'
import { domainId, subdomainId } from './ids.js'

describe('ids', () => {
  it('builds a sub-domain id from a cert id and task code', () => {
    expect(subdomainId('clf-c02', '1.1')).toBe('clf-c02/1.1')
  })

  it('builds a domain id from a cert id and domain number', () => {
    expect(domainId('aif-c01', 3)).toBe('aif-c01/d3')
  })
})
