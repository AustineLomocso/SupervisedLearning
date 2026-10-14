import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { deriveSubdomainStatus } from '../../engine/subdomainStatus.js'
import { makeAttempt, makeResult } from '../../test/factories.js'
import StepChips from './StepChips.jsx'
import SubdomainStepper from './SubdomainStepper.jsx'

const SUB = 'clf-c02/1.1'

/** @param {import('../../engine/subdomainStatus.js').SubdomainStatus} status */
function renderStepper(status) {
  render(
    <MemoryRouter>
      <SubdomainStepper certId="clf-c02" taskCode="1.1" status={status} />
    </MemoryRouter>,
  )
  /** @param {string} label */
  const step = (label) => screen.getByRole('link', { name: label }).closest('li')
  return { step }
}

describe('SubdomainStepper', () => {
  it('links the three steps in order', () => {
    renderStepper(deriveSubdomainStatus(SUB, [], undefined))
    const links = within(screen.getByRole('list', { name: 'Learning path' }))
      .getAllByRole('link')
      .map((link) => [link.textContent, link.getAttribute('href')])
    expect(links).toEqual([
      ['Pre-Test', '/clf-c02/test/new?kind=pre&scope=1.1'],
      ['Review', '/clf-c02/s/1.1/review'],
      ['Post-Test', '/clf-c02/test/new?kind=post&scope=1.1'],
    ])
  })

  it('recommends the Pre-Test to a newcomer', () => {
    const { step } = renderStepper(deriveSubdomainStatus(SUB, [], undefined))
    expect(step('Pre-Test')).toHaveTextContent('Recommended next')
    expect(step('Pre-Test')).toHaveTextContent('Not taken yet')
    expect(step('Review')).toHaveTextContent('Not reviewed yet')
    expect(step('Review')).not.toHaveTextContent('Recommended next')
  })

  it('shows scores and moves the recommendation forward', () => {
    const status = deriveSubdomainStatus(
      SUB,
      [makeAttempt({ kind: 'pre', result: makeResult(60) })],
      { subdomainId: SUB, certId: 'clf-c02', reviewCompletedAt: new Date(2026, 9, 14).getTime() },
    )
    const { step } = renderStepper(status)
    expect(step('Pre-Test')).toHaveTextContent('Done · best score 60%')
    expect(step('Review')).toHaveTextContent(/Reviewed .*2026/)
    expect(step('Post-Test')).toHaveTextContent('Recommended next')
  })

  it('recommends nothing once the Post-Test is done', () => {
    renderStepper(
      deriveSubdomainStatus(
        SUB,
        [makeAttempt({ kind: 'post', result: makeResult(90) })],
        undefined,
      ),
    )
    expect(screen.queryByText('Recommended next')).not.toBeInTheDocument()
  })
})

describe('StepChips', () => {
  it('states each step as text', () => {
    render(
      <StepChips
        status={deriveSubdomainStatus(
          SUB,
          [makeAttempt({ kind: 'pre', result: makeResult(60) })],
          undefined,
        )}
      />,
    )
    const chips = within(screen.getByRole('list', { name: 'Steps' }))
      .getAllByRole('listitem')
      .map((chip) => chip.textContent)
    expect(chips).toEqual(['Pre-Test: done', 'Review: not done', 'Post-Test: not done'])
  })
})
