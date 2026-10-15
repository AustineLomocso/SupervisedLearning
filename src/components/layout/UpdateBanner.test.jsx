import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useUiStore } from '../../stores/useUiStore.js'
import UpdateBanner from './UpdateBanner.jsx'

beforeEach(() => {
  useUiStore.setState({ updateAvailable: false })
})

afterEach(() => vi.unstubAllGlobals())

describe('UpdateBanner', () => {
  it('renders nothing until an update is detected', () => {
    const { container } = render(<UpdateBanner />)
    expect(container).toBeEmptyDOMElement()
  })

  it('announces the update and reloads on request', async () => {
    const reload = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload })
    useUiStore.setState({ updateAvailable: true })
    const user = userEvent.setup()
    render(<UpdateBanner />)
    expect(screen.getByRole('status')).toHaveTextContent('A new version of the app is available.')
    await user.click(screen.getByRole('button', { name: 'Reload' }))
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
