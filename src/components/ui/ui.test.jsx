import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CheckCircleIcon } from './icons.jsx'
import Loading from './Loading.jsx'
import { buttonClass } from './styles.js'

describe('ui primitives', () => {
  it('announces loading politely', () => {
    render(<Loading label="Loading lesson…" />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading lesson…')
  })

  it('hides decorative icons from assistive technology', () => {
    const { container } = render(<CheckCircleIcon className="size-4" />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('gives each button variant a distinct style', () => {
    const variants = ['primary', 'secondary', 'danger'].map((variant) => buttonClass(variant))
    expect(new Set(variants).size).toBe(3)
  })
})
