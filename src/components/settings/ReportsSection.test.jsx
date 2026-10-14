import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addFlag } from '../../db/flags.js'
import { downloadJson } from '../../lib/download.js'
import { resetDb } from '../../test/resetDb.js'
import ReportsSection from './ReportsSection.jsx'

vi.mock('../../lib/download.js', async (importOriginal) => ({
  ...(await importOriginal()),
  downloadJson: vi.fn(),
}))

beforeEach(async () => {
  await resetDb()
  vi.mocked(downloadJson).mockClear()
})

describe('ReportsSection', () => {
  it('explains when there are no reports', async () => {
    render(<ReportsSection />)
    expect(await screen.findByText(/haven’t reported any questions/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Export reports' })).not.toBeInTheDocument()
  })

  it('lists, exports and deletes reports', async () => {
    await addFlag(
      {
        itemId: 'clf-c02-1.1-0001',
        itemVersion: 2,
        certId: 'clf-c02',
        reason: 'wrong-answer',
        note: 'B is also right',
      },
      1_000,
    )
    await addFlag(
      { itemId: 'aif-c01-2.1-0003', itemVersion: 1, certId: 'aif-c01', reason: 'typo' },
      2_000,
    )
    const user = userEvent.setup()
    render(<ReportsSection />)
    const list = await screen.findByRole('list', { name: 'Reports' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(list).toHaveTextContent('Wrong answer')
    expect(list).toHaveTextContent('B is also right')

    await user.click(screen.getByRole('button', { name: 'Export reports' }))
    expect(downloadJson).toHaveBeenCalledWith(
      expect.stringMatching(/^awsprep-reports-\d{4}-\d{2}-\d{2}\.json$/),
      expect.objectContaining({
        format: 'awsprep-reports',
        reports: expect.arrayContaining([expect.objectContaining({ itemId: 'clf-c02-1.1-0001' })]),
      }),
    )

    await user.click(screen.getByRole('button', { name: 'Delete report on aif-c01-2.1-0003' }))
    await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(1))
  })
})
