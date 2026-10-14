import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BACKUP_FORMAT, exportBackup } from '../../db/backup.js'
import { db } from '../../db/db.js'
import { setSetting } from '../../db/settings.js'
import { downloadJson } from '../../lib/download.js'
import { makeAttempt } from '../../test/factories.js'
import { resetDb } from '../../test/resetDb.js'
import BackupSection from './BackupSection.jsx'

vi.mock('../../lib/download.js', async (importOriginal) => ({
  ...(await importOriginal()),
  downloadJson: vi.fn(),
}))

/** @param {unknown} data */
const jsonFile = (data) =>
  new File([typeof data === 'string' ? data : JSON.stringify(data)], 'backup.json', {
    type: 'application/json',
  })

beforeEach(async () => {
  await resetDb()
  vi.mocked(downloadJson).mockClear()
})

afterEach(() => vi.restoreAllMocks())

describe('BackupSection', () => {
  it('downloads a backup of everything stored', async () => {
    await setSetting('k', 1)
    const user = userEvent.setup()
    render(<BackupSection />)
    await user.click(screen.getByRole('button', { name: 'Download backup' }))
    await waitFor(() => expect(downloadJson).toHaveBeenCalledTimes(1))
    const [name, data] = vi.mocked(downloadJson).mock.calls[0]
    expect(name).toMatch(/^awsprep-backup-\d{4}-\d{2}-\d{2}\.json$/)
    expect(data).toMatchObject({
      format: BACKUP_FORMAT,
      tables: { settings: [{ key: 'k', value: 1 }] },
    })
    expect(screen.getByRole('status')).toHaveTextContent('Backup downloaded.')
  })

  it('restores a backup after confirmation', async () => {
    await db.attempts.add(makeAttempt({ id: 'from-backup' }))
    const backup = await exportBackup()
    await resetDb()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    render(<BackupSection />)
    await user.upload(screen.getByLabelText('Restore from backup'), jsonFile(backup))
    expect(await screen.findByText('Progress restored from the backup.')).toBeInTheDocument()
    expect(await db.attempts.get('from-backup')).toBeDefined()
  })

  it('leaves data alone when the learner cancels', async () => {
    const backup = await exportBackup()
    await db.attempts.add(makeAttempt({ id: 'keep-me' }))
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    render(<BackupSection />)
    await user.upload(screen.getByLabelText('Restore from backup'), jsonFile(backup))
    await waitFor(() => expect(confirm).toHaveBeenCalled())
    expect(await db.attempts.get('keep-me')).toBeDefined()
  })

  it('rejects files that are not JSON without asking', async () => {
    const confirm = vi.spyOn(window, 'confirm')
    const user = userEvent.setup()
    render(<BackupSection />)
    await user.upload(screen.getByLabelText('Restore from backup'), jsonFile('not json'))
    expect(await screen.findByRole('alert')).toHaveTextContent('The file is not valid JSON.')
    expect(confirm).not.toHaveBeenCalled()
  })

  it('rejects JSON that is not a backup', async () => {
    const user = userEvent.setup()
    render(<BackupSection />)
    await user.upload(screen.getByLabelText('Restore from backup'), jsonFile({ hello: 'world' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This file is not a progress backup from this app.',
    )
  })
})
