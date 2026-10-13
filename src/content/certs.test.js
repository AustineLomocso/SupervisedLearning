import { describe, expect, it } from 'vitest'
import { CERTS, getCert } from './certs.js'

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
})
