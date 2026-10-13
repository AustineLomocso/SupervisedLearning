import { describe, expect, it } from 'vitest'
import { CERTS, getCert, getDomain, getSubdomain, listSubdomains } from './certs.js'

describe('certs', () => {
  it('lists both certifications in display order', () => {
    expect(CERTS.map((cert) => cert.code)).toEqual(['CLF-C02', 'AIF-C01'])
  })

  it('finds a cert by id', () => {
    expect(getCert('aif-c01')?.title).toBe('AWS Certified AI Practitioner')
  })

  it('returns null for an unknown id', () => {
    expect(getCert('saa-c03')).toBeNull()
  })

  it('finds a domain by number, including route-param strings', () => {
    expect(getDomain('clf-c02', 2)?.title).toBe('Security and Compliance')
    expect(getDomain('clf-c02', '2')?.id).toBe('clf-c02/d2')
    expect(getDomain('clf-c02', 9)).toBeNull()
    expect(getDomain('saa-c03', 1)).toBeNull()
  })

  it('finds a sub-domain by task code', () => {
    expect(getSubdomain('aif-c01', '3.2')).toMatchObject({
      id: 'aif-c01/3.2',
      title: 'Choose effective prompt engineering techniques.',
    })
    expect(getSubdomain('aif-c01', '9.9')).toBeNull()
  })

  it('lists every sub-domain of a cert in order', () => {
    expect(listSubdomains('clf-c02')).toHaveLength(19)
    expect(
      listSubdomains('aif-c01')
        .map((sub) => sub.code)
        .slice(0, 4),
    ).toEqual(['1.1', '1.2', '1.3', '2.1'])
    expect(listSubdomains('saa-c03')).toEqual([])
  })
})
