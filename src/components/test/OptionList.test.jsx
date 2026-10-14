import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { makeItem, makeMultiItem } from '../../test/itemFactories.js'
import OptionList from './OptionList.jsx'

describe('OptionList', () => {
  it('shows single-answer options as radios in the stored order with letters', () => {
    render(
      <OptionList
        item={makeItem()}
        order={['c', 'a', 'd', 'b']}
        selected={[]}
        locked={false}
        onToggle={() => {}}
      />,
    )
    const radios = screen.getAllByRole('radio')
    expect(radios.map((radio) => radio.getAttribute('value'))).toEqual(['c', 'a', 'd', 'b'])
    expect(screen.getByRole('radio', { name: 'Amazon S3' })).toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('D')).toBeInTheDocument()
  })

  it('reports the chosen option', async () => {
    const onToggle = vi.fn()
    const user = userEvent.setup()
    render(
      <OptionList
        item={makeItem()}
        order={['a', 'b', 'c', 'd']}
        selected={[]}
        locked={false}
        onToggle={onToggle}
      />,
    )
    await user.click(screen.getByRole('radio', { name: 'Amazon EBS' }))
    expect(onToggle).toHaveBeenCalledWith('b')
  })

  it('uses checkboxes for multiple response and stops at the selection count', () => {
    render(
      <OptionList
        item={makeMultiItem()}
        order={['a', 'b', 'c', 'd', 'e']}
        selected={['a', 'c']}
        locked={false}
        onToggle={() => {}}
      />,
    )
    expect(screen.getAllByRole('checkbox')).toHaveLength(5)
    expect(screen.getByRole('checkbox', { name: 'Pay-as-you-go pricing' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Elastic capacity' })).toBeEnabled()
    expect(screen.getByRole('checkbox', { name: 'Fixed capacity' })).toBeDisabled()
    expect(screen.getByText('2 of 2 chosen')).toBeInTheDocument()
  })

  it('leaves choices open below the limit', () => {
    render(
      <OptionList
        item={makeMultiItem()}
        order={['a', 'b', 'c', 'd', 'e']}
        selected={['a']}
        locked={false}
        onToggle={() => {}}
      />,
    )
    expect(screen.getByRole('checkbox', { name: 'Fixed capacity' })).toBeEnabled()
    expect(screen.getByText('1 of 2 chosen')).toBeInTheDocument()
  })

  it('disables everything when locked', () => {
    render(
      <OptionList
        item={makeItem()}
        order={['a', 'b', 'c', 'd']}
        selected={['a']}
        locked
        onToggle={() => {}}
      />,
    )
    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled()
  })
})
