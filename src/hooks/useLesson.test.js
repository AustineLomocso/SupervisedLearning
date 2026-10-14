import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadReview } from '../content/loadReview.js'
import { useLesson } from './useLesson.js'

vi.mock('../content/loadReview.js', () => ({ loadReview: vi.fn() }))

beforeEach(() => {
  vi.mocked(loadReview).mockReset()
  vi.restoreAllMocks()
})

describe('useLesson', () => {
  it('loads the lesson for the task', async () => {
    vi.mocked(loadReview).mockResolvedValue('# Hello')
    const { result } = renderHook(() => useLesson('clf-c02', '1.1'))
    expect(result.current).toEqual({ status: 'loading' })
    await waitFor(() => expect(result.current).toEqual({ status: 'ready', markdown: '# Hello' }))
    expect(loadReview).toHaveBeenCalledWith('clf-c02', '1.1')
  })

  it('reports a failed load', async () => {
    vi.mocked(loadReview).mockRejectedValue(new Error('offline'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result } = renderHook(() => useLesson('clf-c02', '1.1'))
    await waitFor(() => expect(result.current).toEqual({ status: 'error' }))
  })

  it('does nothing without a task', () => {
    const { result } = renderHook(() => useLesson('clf-c02', null))
    expect(result.current).toEqual({ status: 'loading' })
    expect(loadReview).not.toHaveBeenCalled()
  })

  it('never shows the previous task’s lesson while the next one loads', async () => {
    vi.mocked(loadReview).mockImplementation(async (_certId, task) => `# ${task}`)
    const { result, rerender } = renderHook(({ task }) => useLesson('clf-c02', task), {
      initialProps: { task: '1.1' },
    })
    await waitFor(() => expect(result.current).toEqual({ status: 'ready', markdown: '# 1.1' }))
    rerender({ task: '1.2' })
    expect(result.current).toEqual({ status: 'loading' })
    await waitFor(() => expect(result.current).toEqual({ status: 'ready', markdown: '# 1.2' }))
  })
})
