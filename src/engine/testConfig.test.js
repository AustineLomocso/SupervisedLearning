import { describe, expect, it } from 'vitest'
import { getCert, getDomain, getSubdomain } from '../content/certs.js'
import { defaultLength, isExamKind, lengthChoices, resolveTestScope } from './testConfig.js'

const clf = getCert('clf-c02')

describe('resolveTestScope', () => {
  it('scopes Pre- and Post-Tests to a task', () => {
    expect(resolveTestScope(clf, 'pre', '1.1')).toEqual({
      scopeId: 'clf-c02/1.1',
      label: 'Task 1.1: Define the benefits of the AWS Cloud.',
      poolSize: getSubdomain('clf-c02', '1.1')?.itemCount,
    })
  })

  it('scopes a Domain Assessment to a domain', () => {
    expect(resolveTestScope(clf, 'domain', '3')).toEqual({
      scopeId: 'clf-c02/d3',
      label: 'Domain 3: Cloud Technology and Services',
      poolSize: getDomain('clf-c02', 3)?.itemCount,
    })
  })

  it('scopes cert-wide tests to the whole cert', () => {
    expect(resolveTestScope(clf, 'diagnostic', null)).toEqual({
      scopeId: 'clf-c02',
      label: 'CLF-C02: AWS Certified Cloud Practitioner',
      poolSize: clf?.itemCount,
    })
  })

  it.each([
    ['pre', null],
    ['post', '9.9'],
    ['domain', '1.1'],
    ['domain', null],
    ['diagnostic', '1.1'],
    ['drill', '2'],
  ])('rejects %s with scope %s', (kind, scope) => {
    expect(resolveTestScope(clf, kind, scope)).toBeNull()
  })
})

describe('lengthChoices', () => {
  it('turns off lengths the pool cannot fill', () => {
    expect(lengthChoices('post', 18)).toEqual([
      { value: 10, available: true },
      { value: 15, available: true },
      { value: 20, available: false },
      { value: 25, available: false },
    ])
  })
})

describe('defaultLength', () => {
  it('uses the spec default when the pool allows it', () => {
    expect(defaultLength('pre', 20)).toBe(10)
    expect(defaultLength('post', 40)).toBe(15)
    expect(defaultLength('domain', 80)).toBe(30)
    expect(defaultLength('drill', 300)).toBe(20)
  })

  it('falls back to the longest choice that fits', () => {
    expect(defaultLength('post', 12)).toBe(10)
  })

  it('is null when no choice fits', () => {
    expect(defaultLength('pre', 3)).toBeNull()
  })
})

describe('isExamKind', () => {
  it('is true only for the Diagnostic and Full exams', () => {
    expect(['pre', 'post', 'domain', 'drill', 'diagnostic', 'full'].filter(isExamKind)).toEqual([
      'diagnostic',
      'full',
    ])
  })
})
