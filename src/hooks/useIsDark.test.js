import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useIsDark } from './useIsDark.js'

afterEach(() => document.documentElement.classList.remove('dark'))

describe('useIsDark', () => {
  it('follows the dark class on <html>', async () => {
    const { result } = renderHook(() => useIsDark())
    expect(result.current).toBe(false)
    act(() => document.documentElement.classList.add('dark'))
    await waitFor(() => expect(result.current).toBe(true))
  })
})
