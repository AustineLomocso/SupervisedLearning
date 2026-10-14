import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { makeItem } from '../../test/itemFactories.js'
import OptionRationale from './OptionRationale.jsx'

describe('OptionRationale', () => {
  it('explains every option, marking the right answer and the learner’s wrong choice', () => {
    render(<OptionRationale item={makeItem()} order={['b', 'a', 'c', 'd']} selected={['b']} />)
    const rows = within(
      screen.getByRole('list', { name: 'Why each option is right or wrong' }),
    ).getAllByRole('listitem')
    expect(rows).toHaveLength(4)
    expect(rows[0]).toHaveTextContent('Amazon EBS')
    expect(rows[0]).toHaveTextContent('Your answer')
    expect(rows[0]).toHaveTextContent('EBS is block storage for EC2.')
    expect(rows[1]).toHaveTextContent('Correct answer')
    expect(rows[1]).toHaveTextContent('S3 is AWS object storage.')
    expect(rows[2]).not.toHaveTextContent('Your answer')
    expect(rows[3]).toHaveTextContent('RDS is a managed database.')
  })

  it('marks a correct choice as both correct and chosen', () => {
    render(<OptionRationale item={makeItem()} order={['a', 'b', 'c', 'd']} selected={['a']} />)
    const first = screen.getAllByRole('listitem')[0]
    expect(first).toHaveTextContent('Correct answer')
    expect(first).toHaveTextContent('Your answer')
  })
})
