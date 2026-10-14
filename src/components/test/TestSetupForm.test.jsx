import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getCert } from '../../content/certs.js'
import { resolveTestScope } from '../../engine/testConfig.js'
import { startTest } from '../../engine/startTest.js'
import TestSetupForm from './TestSetupForm.jsx'

vi.mock('../../engine/startTest.js', () => ({ startTest: vi.fn() }))

const cert = getCert('clf-c02')

/** @param {import('../../db/types.js').AttemptKind} kind @param {string | null} scope */
function renderForm(kind, scope) {
  const router = createMemoryRouter(
    [
      {
        path: '/setup',
        element: (
          <TestSetupForm cert={cert} kind={kind} scope={resolveTestScope(cert, kind, scope)} />
        ),
      },
      { path: '/attempt/:attemptId', element: <p>Runner page</p> },
    ],
    { initialEntries: ['/setup'] },
  )
  render(<RouterProvider router={router} />)
  return router
}

beforeEach(() => {
  vi.mocked(startTest).mockReset()
})

describe('TestSetupForm', () => {
  it('starts a Pre-Test with the chosen length and opens the attempt', async () => {
    vi.mocked(startTest).mockResolvedValue({ id: 'abc' })
    const user = userEvent.setup()
    const router = renderForm('pre', '1.1')
    await user.click(screen.getByRole('radio', { name: '15' }))
    await user.click(screen.getByRole('button', { name: 'Start Pre-Test' }))
    expect(startTest).toHaveBeenCalledWith({
      cert,
      kind: 'pre',
      scopeId: 'clf-c02/1.1',
      length: 15,
      mode: 'study',
    })
    await waitFor(() => expect(router.state.location.pathname).toBe('/attempt/abc'))
  })

  it('starts the Diagnostic Exam in the chosen mode with the full exam length', async () => {
    vi.mocked(startTest).mockResolvedValue({ id: 'xyz' })
    const user = userEvent.setup()
    renderForm('diagnostic', null)
    await user.click(screen.getByRole('radio', { name: 'Study mode' }))
    await user.click(screen.getByRole('button', { name: 'Start Diagnostic Exam' }))
    expect(startTest).toHaveBeenCalledWith({
      cert,
      kind: 'diagnostic',
      scopeId: 'clf-c02',
      length: 65,
      mode: 'study',
    })
  })

  it('locks the button while starting', async () => {
    /** @type {(value: unknown) => void} */
    let finish = () => {}
    vi.mocked(startTest).mockReturnValue(new Promise((resolve) => (finish = resolve)))
    const user = userEvent.setup()
    renderForm('pre', '1.1')
    await user.click(screen.getByRole('button', { name: 'Start Pre-Test' }))
    expect(screen.getByRole('button', { name: /Starting/ })).toBeDisabled()
    finish({ id: 'late' })
  })

  it('shows an error and lets the learner try again', async () => {
    vi.mocked(startTest).mockRejectedValue(new Error('boom'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = userEvent.setup()
    renderForm('pre', '1.1')
    await user.click(screen.getByRole('button', { name: 'Start Pre-Test' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t start the test')
    expect(screen.getByRole('button', { name: 'Start Pre-Test' })).toBeEnabled()
  })
})
