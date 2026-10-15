import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, Link, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { useUiStore } from '../../stores/useUiStore.js'
import AppShell from './AppShell.jsx'

/** @param {string} [initialPath] */
function renderShell(initialPath = '/') {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <AppShell />,
        children: [
          {
            index: true,
            element: (
              <>
                <h1>Home page</h1>
                <Link to="/next">Go next</Link>
              </>
            ),
          },
          { path: 'next', element: <h1>Next page</h1>, handle: { crumb: () => 'Next' } },
        ],
      },
    ],
    { initialEntries: [initialPath] },
  )
  render(<RouterProvider router={router} />)
  return router
}

beforeEach(() => {
  useUiStore.setState({ storageError: false })
})

describe('AppShell', () => {
  it('renders navigation, the main landmark and the disclaimers', () => {
    renderShell()
    const mainNav = screen.getByRole('navigation', { name: 'Main' })
    expect(within(mainNav).getByRole('link', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toContainElement(
      screen.getByRole('heading', { name: 'Home page' }),
    )
    const footer = screen.getByRole('contentinfo')
    expect(footer).toHaveTextContent(/not affiliated with/i)
    expect(footer).toHaveTextContent(/AI-generated/i)
  })

  it('skip link focuses the main content without changing the route', async () => {
    const user = userEvent.setup()
    const router = renderShell()
    await user.click(screen.getByRole('link', { name: 'Skip to main content' }))
    expect(screen.getByRole('main')).toHaveFocus()
    expect(router.state.location.pathname).toBe('/')
  })

  it('moves focus to the main content after navigation', async () => {
    const user = userEvent.setup()
    renderShell()
    await user.click(screen.getByRole('link', { name: 'Go next' }))
    expect(await screen.findByRole('heading', { name: 'Next page' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveFocus()
  })

  it('shows breadcrumbs on nested pages with the current page marked', () => {
    renderShell('/next')
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(nav).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(within(nav).getByText('Next')).toHaveAttribute('aria-current', 'page')
  })

  it('hides breadcrumbs on the home page', () => {
    renderShell('/')
    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).not.toBeInTheDocument()
  })

  it('offers a reload when a new version has been deployed', () => {
    useUiStore.setState({ updateAvailable: true })
    renderShell()
    expect(screen.getByRole('status')).toHaveTextContent(/new version/i)
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()
  })

  it('warns when progress cannot be saved', () => {
    useUiStore.setState({ storageError: true })
    renderShell()
    expect(screen.getByRole('alert')).toHaveTextContent(/be saved/i)
  })
})
