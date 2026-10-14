import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import QuestionNavigator from './QuestionNavigator.jsx'

const itemIds = ['q1', 'q2', 'q3']
const responses = {
  q1: { selected: ['a'], submitted: false, correct: null, markedForReview: false, answeredAt: 1 },
  q2: { selected: [], submitted: false, correct: null, markedForReview: true, answeredAt: null },
}

describe('QuestionNavigator', () => {
  it('describes each question’s state in words', () => {
    render(
      <QuestionNavigator
        itemIds={itemIds}
        responses={responses}
        currentIndex={0}
        onGo={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: 'Question 1: answered' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Question 2: unanswered, marked for review' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Question 3: unanswered' })).toBeInTheDocument()
  })

  it('marks the current question', () => {
    render(
      <QuestionNavigator
        itemIds={itemIds}
        responses={responses}
        currentIndex={2}
        onGo={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: 'Question 3: unanswered' })).toHaveAttribute(
      'aria-current',
      'step',
    )
    expect(screen.getByRole('button', { name: 'Question 1: answered' })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('jumps to a question', async () => {
    const onGo = vi.fn()
    const user = userEvent.setup()
    render(
      <QuestionNavigator itemIds={itemIds} responses={responses} currentIndex={0} onGo={onGo} />,
    )
    await user.click(screen.getByRole('button', { name: 'Question 3: unanswered' }))
    expect(onGo).toHaveBeenCalledWith(2)
  })

  it('has a legend that does not rely on color', () => {
    render(
      <QuestionNavigator
        itemIds={itemIds}
        responses={responses}
        currentIndex={0}
        onGo={() => {}}
      />,
    )
    expect(screen.getByText(/Filled = answered/)).toBeInTheDocument()
    expect(screen.getByText(/⚑ = marked for review/)).toBeInTheDocument()
  })
})
