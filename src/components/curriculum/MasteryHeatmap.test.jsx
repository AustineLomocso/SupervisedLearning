import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { getCert } from '../../content/certs.js'
import MasteryBadge from './MasteryBadge.jsx'
import MasteryHeatmap from './MasteryHeatmap.jsx'

const cert = getCert('clf-c02')
const mastery = new Map([
  ['clf-c02/1.1', { answered: 20, correct: 16, pct: 80, band: 'strong', lowConfidence: false }],
  ['clf-c02/2.1', { answered: 3, correct: 1, pct: 33, band: 'weak', lowConfidence: true }],
])

function renderHeatmap() {
  render(
    <MemoryRouter>
      <MasteryHeatmap cert={cert} mastery={mastery} />
    </MemoryRouter>,
  )
}

describe('MasteryBadge', () => {
  it('pairs the band label with the percentage', () => {
    render(<MasteryBadge mastery={mastery.get('clf-c02/1.1')} />)
    expect(screen.getByText('Strong')).toBeInTheDocument()
    expect(screen.getByText('80%')).toBeInTheDocument()
  })

  it('shows no percentage before any answers', () => {
    render(
      <MasteryBadge
        mastery={{ answered: 0, correct: 0, pct: null, band: 'not-started', lowConfidence: false }}
      />,
    )
    expect(screen.getByText('Not started')).toBeInTheDocument()
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
  })
})

describe('MasteryHeatmap', () => {
  it('renders one labelled cell per task', () => {
    renderHeatmap()
    const cells = screen.getAllByRole('link')
    expect(cells).toHaveLength(19)
    const strong = screen.getByRole('link', { name: /^1\.1: Define the benefits/ })
    expect(strong).toHaveAttribute('href', '/clf-c02/s/1.1')
    expect(strong).toHaveTextContent('Strong')
    expect(strong).toHaveTextContent('80%')
    expect(cells.filter((cell) => cell.textContent?.includes('Not started'))).toHaveLength(17)
  })

  it('marks low-confidence cells in text, not only with the border', () => {
    renderHeatmap()
    const weak = screen.getByRole('link', { name: /^2\.1:/ })
    expect(weak).toHaveTextContent('Weak')
    expect(weak).toHaveTextContent('(few answers)')
  })

  it('groups cells under their domain', () => {
    renderHeatmap()
    const domain3 = screen.getByRole('list', { name: 'Domain 3: Cloud Technology and Services' })
    expect(within(domain3).getAllByRole('link')).toHaveLength(8)
  })

  it('explains every band in the legend', () => {
    renderHeatmap()
    const legend = screen.getByRole('list', { name: 'Legend' })
    expect(legend).toHaveTextContent('Weak (under 50%)')
    expect(legend).toHaveTextContent('Developing (50–74%)')
    expect(legend).toHaveTextContent('Strong (75% or more)')
    expect(legend).toHaveTextContent('Not started (no answers yet)')
  })
})
