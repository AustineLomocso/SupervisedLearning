import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { routes } from '../router.jsx'

/**
 * Renders the real app route table at `path`.
 * @param {string} path
 */
export function renderRoute(path) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}
