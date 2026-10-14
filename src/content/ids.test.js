import { describe, expect, it } from 'vitest'
import { domainId, parseItemId, subdomainId } from './ids.js'

describe('ids', () => {
  it('builds a sub-domain id from a cert id and task code', () => {
    expect(subdomainId('clf-c02', '1.1')).toBe('clf-c02/1.1')
  })

  it('builds a domain id from a cert id and domain number', () => {
    expect(domainId('aif-c01', 3)).toBe('aif-c01/d3')
  })

  it('splits an item id into its cert and task', () => {
    expect(parseItemId('clf-c02-1.1-0042')).toEqual({ certId: 'clf-c02', taskCode: '1.1' })
    expect(parseItemId('aif-c01-3.10-0001')).toEqual({ certId: 'aif-c01', taskCode: '3.10' })
  })

  it('rejects strings that are not item ids', () => {
    expect(parseItemId('clf-c02-1.1')).toBeNull()
    expect(parseItemId('nonsense')).toBeNull()
  })
})
