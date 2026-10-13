import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useUiStore } from '../stores/useUiStore.js'
import { restoreStorage, stubStorage } from '../test/stubStorage.js'
import SettingsPage from './SettingsPage.jsx'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
  useUiStore.setState({ theme: 'system' })
})

afterEach(restoreStorage)

describe('SettingsPage', () => {
  it('switches to the dark theme', async () => {
    stubStorage({ persisted: async () => true })
    const user = userEvent.setup()
    render(<SettingsPage />)
    expect(screen.getByRole('radio', { name: 'Match my device' })).toBeChecked()
    await user.click(screen.getByRole('radio', { name: 'Dark' }))
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked()
    expect(document.documentElement).toHaveClass('dark')
  })

  it('reports protected storage without offering the button', async () => {
    stubStorage({ persisted: async () => true })
    render(<SettingsPage />)
    expect(await screen.findByText(/^Protected\./)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /keep my progress/i })).not.toBeInTheDocument()
  })

  it('offers to request protection and shows the result', async () => {
    stubStorage({ persisted: async () => false, persist: async () => true })
    const user = userEvent.setup()
    render(<SettingsPage />)
    expect(await screen.findByText(/^Not protected\./)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ask the browser to keep my progress' }))
    expect(await screen.findByText(/^Protected\./)).toBeInTheDocument()
  })

  it('explains when the browser cannot protect storage', async () => {
    stubStorage(undefined)
    render(<SettingsPage />)
    expect(await screen.findByText(/can’t protect stored progress/)).toBeInTheDocument()
  })
})
