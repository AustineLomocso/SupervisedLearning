import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { listFlags } from '../../db/flags.js'
import { makeItem } from '../../test/itemFactories.js'
import { resetDb } from '../../test/resetDb.js'
import ReportIssueForm from './ReportIssueForm.jsx'

beforeEach(resetDb)

describe('ReportIssueForm', () => {
  it('starts collapsed and cannot send without a reason', async () => {
    const user = userEvent.setup()
    render(<ReportIssueForm item={makeItem()} />)
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Report issue' }))
    expect(screen.getByRole('button', { name: 'Send report' })).toBeDisabled()
  })

  it('saves the report with the item id and version', async () => {
    const user = userEvent.setup()
    render(<ReportIssueForm item={makeItem({ version: 3 })} />)
    await user.click(screen.getByRole('button', { name: 'Report issue' }))
    await user.click(screen.getByRole('radio', { name: 'Wrong answer' }))
    await user.type(screen.getByLabelText('Details (optional)'), 'B is also right')
    await user.click(screen.getByRole('button', { name: 'Send report' }))
    expect(await screen.findByText(/Your report was saved/)).toBeInTheDocument()
    const [flag] = await listFlags()
    expect(flag).toMatchObject({
      itemId: 'clf-c02-1.1-0001',
      itemVersion: 3,
      certId: 'clf-c02',
      reason: 'wrong-answer',
      note: 'B is also right',
    })
  })

  it('can be cancelled', async () => {
    const user = userEvent.setup()
    render(<ReportIssueForm item={makeItem()} />)
    await user.click(screen.getByRole('button', { name: 'Report issue' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('button', { name: 'Report issue' })).toBeInTheDocument()
    expect(await listFlags()).toEqual([])
  })
})
