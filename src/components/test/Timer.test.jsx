import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Timer from './Timer.jsx'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 15, 12, 0, 0))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Timer', () => {
  it('counts down every second', () => {
    render(<Timer deadlineAt={Date.now() + 90 * 60_000} onExpire={() => {}} />)
    expect(screen.getByRole('timer')).toHaveTextContent('1:30:00')
    act(() => vi.advanceTimersByTime(5_000))
    expect(screen.getByRole('timer')).toHaveTextContent('1:29:55')
  })

  it('announces the 10-minute and 1-minute warnings once each', () => {
    render(<Timer deadlineAt={Date.now() + 11 * 60_000} onExpire={() => {}} />)
    const live = screen.getByTestId('timer-announcement')
    expect(live).toBeEmptyDOMElement()
    act(() => vi.advanceTimersByTime(60_000))
    expect(live).toHaveTextContent('Less than 10 minutes remaining')
    act(() => vi.advanceTimersByTime(9 * 60_000))
    expect(live).toHaveTextContent('Less than 1 minute remaining')
  })

  it('does not announce the 10-minute warning every second', () => {
    render(<Timer deadlineAt={Date.now() + 9 * 60_000} onExpire={() => {}} />)
    const live = screen.getByTestId('timer-announcement')
    const first = live.textContent
    act(() => vi.advanceTimersByTime(3_000))
    expect(live.textContent).toBe(first)
  })

  it('calls onExpire exactly once when time runs out', () => {
    const onExpire = vi.fn()
    render(<Timer deadlineAt={Date.now() + 3_000} onExpire={onExpire} />)
    act(() => vi.advanceTimersByTime(10_000))
    expect(onExpire).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('timer')).toHaveTextContent('0:00')
    expect(screen.getByTestId('timer-announcement')).toHaveTextContent('Time is up')
  })

  it('expires straight away when the deadline has already passed', () => {
    const onExpire = vi.fn()
    render(<Timer deadlineAt={Date.now() - 1_000} onExpire={onExpire} />)
    expect(onExpire).toHaveBeenCalledTimes(1)
  })
})
