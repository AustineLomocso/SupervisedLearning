import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { makeItem, makeMultiItem } from '../../test/itemFactories.js'
import QuestionCard from './QuestionCard.jsx'

describe('QuestionCard', () => {
  it('shows the position and the question', () => {
    render(
      <QuestionCard item={makeItem()} index={2} total={10}>
        <p>options go here</p>
      </QuestionCard>,
    )
    expect(screen.getByRole('heading', { level: 2, name: 'Question 3 of 10' })).toBeInTheDocument()
    expect(screen.getByText(/object storage with 11 nines/)).toBeInTheDocument()
    expect(screen.getByText('options go here')).toBeInTheDocument()
    expect(screen.queryByText(/^Choose/)).not.toBeInTheDocument()
  })

  it('tells the learner how many to choose for multiple response', () => {
    render(<QuestionCard item={makeMultiItem()} index={0} total={5} />)
    expect(screen.getByText('Choose TWO')).toBeInTheDocument()
  })
})
