import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderRoute } from './test/renderRoute.jsx'

vi.mock('mermaid', () => ({
  default: { initialize: vi.fn(), render: vi.fn(async () => ({ svg: '<svg></svg>' })) },
}))

describe('routes', () => {
  it.each([
    ['/', 'AWS Practitioner Exam Prep'],
    ['/settings', 'Settings'],
    ['/clf-c02', 'CLF-C02: AWS Certified Cloud Practitioner'],
    ['/aif-c01/d/3', 'Domain 3'],
    ['/clf-c02/s/1.1', 'Task 1.1'],
    ['/clf-c02/s/1.1/review', 'Define the benefits of the AWS Cloud'],
    ['/clf-c02/test/new?kind=diagnostic', 'Diagnostic Exam'],
    ['/aif-c01/test/new?kind=pre&scope=2.1', 'Pre-Test'],
    ['/attempt/abc', 'Test in progress'],
    ['/attempt/abc/results', 'Results'],
  ])('%s renders its page', async (path, heading) => {
    renderRoute(path)
    expect(
      await screen.findByRole('heading', { level: 1, name: heading }, { timeout: 10000 }),
    ).toBeInTheDocument()
  })

  it.each([
    '/saa-c03',
    '/clf-c02/nope',
    '/clf-c02/s/9.9/review',
    '/clf-c02/test/new?kind=quiz',
    '/attempt',
  ])('%s shows the not-found page', async (path) => {
    renderRoute(path)
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument()
  })

  it('breadcrumbs trace the curriculum path', async () => {
    renderRoute('/clf-c02/s/1.1/review')
    await screen.findByRole('heading', {
      level: 1,
      name: 'Define the benefits of the AWS Cloud',
    })
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
    const labels = within(nav)
      .getAllByRole('listitem')
      .map((item) => item.textContent?.replace('/', '').trim())
    expect(labels).toEqual(['Home', 'CLF-C02', 'Task 1.1', 'Review'])
  })

  it('home links to each certification dashboard', async () => {
    renderRoute('/')
    const link = await screen.findByRole('link', { name: /AIF-C01/ })
    expect(link).toHaveAttribute('href', '/aif-c01')
  })

  it('the cert dashboard links to the diagnostic exam setup', async () => {
    renderRoute('/clf-c02')
    const link = await screen.findByRole('link', { name: 'Diagnostic Exam' })
    expect(link).toHaveAttribute('href', '/clf-c02/test/new?kind=diagnostic')
  })

  it('the sub-domain page links the Pre-Test, Review and Post-Test steps in order', async () => {
    renderRoute('/clf-c02/s/1.1')
    const steps = within(await screen.findByRole('list', { name: 'Learning path' }))
      .getAllByRole('link')
      .map((link) => [link.textContent, link.getAttribute('href')])
    expect(steps).toEqual([
      ['Pre-Test', '/clf-c02/test/new?kind=pre&scope=1.1'],
      ['Review', '/clf-c02/s/1.1/review'],
      ['Post-Test', '/clf-c02/test/new?kind=post&scope=1.1'],
    ])
  })
})
