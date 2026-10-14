import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { makeItem } from '../../test/itemFactories.js'
import { resetDb } from '../../test/resetDb.js'
import ExplanationPanel from './ExplanationPanel.jsx'

beforeEach(resetDb)

const order = ['a', 'b', 'c', 'd']

describe('ExplanationPanel', () => {
  it('announces a correct answer', () => {
    render(<ExplanationPanel item={makeItem()} order={order} selected={['a']} correct />)
    expect(screen.getByRole('status')).toHaveTextContent('Correct')
  })

  it('announces an incorrect answer and still explains everything', () => {
    render(<ExplanationPanel item={makeItem()} order={order} selected={['b']} correct={false} />)
    expect(screen.getByRole('status')).toHaveTextContent('Incorrect')
    for (const rationale of [
      'S3 is AWS object storage.',
      'EBS is block storage for EC2.',
      'EC2 provides compute capacity.',
      'RDS is a managed database.',
    ]) {
      expect(screen.getByText(rationale)).toBeInTheDocument()
    }
    expect(screen.getByText(/designed for 11 nines of durability/)).toBeInTheDocument()
  })

  it('links the AWS references in a new tab', () => {
    render(<ExplanationPanel item={makeItem()} order={order} selected={['a']} correct />)
    const link = screen.getByRole('link', { name: 'What is Amazon S3? (opens in a new tab)' })
    expect(link).toHaveAttribute('href', 'https://docs.aws.amazon.com/s3/')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('offers Report issue', () => {
    render(<ExplanationPanel item={makeItem()} order={order} selected={['a']} correct />)
    expect(screen.getByRole('button', { name: 'Report issue' })).toBeInTheDocument()
  })

  it('moves focus to the explanation heading when asked', () => {
    render(
      <ExplanationPanel item={makeItem()} order={order} selected={['a']} correct focusOnMount />,
    )
    expect(screen.getByRole('heading', { name: 'Explanation' })).toHaveFocus()
  })

  it('leaves focus alone by default', () => {
    render(<ExplanationPanel item={makeItem()} order={order} selected={['a']} correct />)
    expect(screen.getByRole('heading', { name: 'Explanation' })).not.toHaveFocus()
  })
})
