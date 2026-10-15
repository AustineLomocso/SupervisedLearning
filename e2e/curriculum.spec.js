import { expect, test } from '@playwright/test'

const REVIEWED = /^Marked as reviewed on/

test('guided path: dashboard → task → lesson → mark reviewed', async ({ page }) => {
  await page.goto('./#/clf-c02')
  await expect(page.getByRole('heading', { name: 'Recommended next' })).toBeVisible()
  await page.getByRole('link', { name: /^1\.1 : / }).click()
  await expect(page.getByRole('heading', { level: 1, name: /^Task 1\.1:/ })).toBeVisible()

  const path = page.getByRole('list', { name: 'Learning path' })
  await path.getByRole('link', { name: 'Review' }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Define the benefits of the AWS Cloud' }),
  ).toBeVisible()
  // Diagrams are drawn only once they come near the screen.
  await page.locator('.mermaid-diagram').scrollIntoViewIfNeeded()
  await expect(page.locator('.mermaid-diagram svg')).toBeVisible()

  await page.getByRole('button', { name: 'Mark as reviewed' }).click()
  await expect(page.getByText(REVIEWED)).toBeVisible()
  await page.reload()
  await expect(page.getByText(REVIEWED)).toBeVisible()

  await page
    .getByRole('navigation', { name: 'Breadcrumb' })
    .getByRole('link', { name: 'Task 1.1' })
    .click()
  const postStep = path.getByRole('listitem').filter({ hasText: 'Check what you learned.' })
  await expect(postStep).toContainText('Recommended next')
  await expect(path).toContainText(/Reviewed /)
})

test('progress survives export, reset and restore', async ({ page }) => {
  await page.goto('./#/clf-c02/s/1.1/review')
  await page.getByRole('button', { name: 'Mark as reviewed' }).click()
  await expect(page.getByText(REVIEWED)).toBeVisible()

  await page.goto('./#/settings')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download backup' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^awsprep-backup-\d{4}-\d{2}-\d{2}\.json$/)
  const backupPath = await download.path()

  page.on('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Reset progress' }).click()
  await expect(page.getByText('Progress reset.')).toBeVisible()

  await page.getByLabel('Restore from backup').setInputFiles(backupPath)
  await expect(page.getByText('Progress restored from the backup.')).toBeVisible()

  await page.goto('./#/clf-c02/s/1.1/review')
  await expect(page.getByText(REVIEWED)).toBeVisible()
})
