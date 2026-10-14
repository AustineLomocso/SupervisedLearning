import { expect, test } from '@playwright/test'
import { chooseAnswer, readAttempts } from './helpers.js'

test('Pre-Test: answer, see the explanation, reload and resume', async ({ page }) => {
  await page.goto('./#/clf-c02/s/1.1')
  await page.getByRole('link', { name: 'Pre-Test' }).click()
  await page.getByRole('radio', { name: '5', exact: true }).check()
  await page.getByRole('button', { name: 'Start Pre-Test' }).click()

  await expect(page.getByRole('heading', { level: 2, name: 'Question 1 of 5' })).toBeVisible()
  const submit = page.getByRole('button', { name: 'Submit answer' })
  await expect(submit).toBeDisabled()
  await chooseAnswer(page)
  await submit.click()
  await expect(page.getByRole('heading', { name: 'Explanation' })).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: /^(Correct|Incorrect)$/ })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { level: 2, name: 'Question 1 of 5' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Explanation' })).toBeVisible()

  await page.getByRole('button', { name: 'Next question' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Question 2 of 5' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { level: 2, name: 'Question 2 of 5' })).toBeVisible()
})

test('Diagnostic in Exam mode: timer, no feedback, submit, results and heatmap', async ({
  page,
}) => {
  await page.goto('./#/clf-c02/test/new?kind=diagnostic')
  await page.getByRole('button', { name: 'Start Diagnostic Exam' }).click()
  await expect(page.getByRole('timer')).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Question 1 of 65' })).toBeVisible()
  await chooseAnswer(page)
  await expect(page.getByRole('heading', { name: 'Explanation' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Submit answer' })).toHaveCount(0)

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Submit exam' }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Diagnostic Exam results' }),
  ).toBeVisible()
  await expect(page.getByText(/Estimated scaled score/)).toBeVisible()
  await expect(page.getByText(/This is an estimate/)).toBeVisible()

  await page.goto('./#/clf-c02')
  await expect(
    page
      .getByRole('list', { name: /^Domain 1:/ })
      .getByText('Weak')
      .first(),
  ).toBeVisible()
})

test('a Post-Test repeats no Pre-Test question while unseen ones remain', async ({ page }) => {
  await page.goto('./#/clf-c02/test/new?kind=pre&scope=1.1')
  await page.getByRole('radio', { name: '10', exact: true }).check()
  await page.getByRole('button', { name: 'Start Pre-Test' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Question 1 of 10' })).toBeVisible()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Finish test' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Pre-Test results' })).toBeVisible()

  await page.goto('./#/clf-c02/test/new?kind=post&scope=1.1')
  await page.getByRole('radio', { name: '10', exact: true }).check()
  await page.getByRole('button', { name: 'Start Post-Test' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Question 1 of 10' })).toBeVisible()

  const attempts = await readAttempts(page)
  const pre = attempts.find((attempt) => attempt.kind === 'pre')
  const post = attempts.find((attempt) => attempt.kind === 'post')
  expect(pre.itemIds).toHaveLength(10)
  expect(post.itemIds.filter((id) => pre.itemIds.includes(id))).toEqual([])
})

test('starting a one-task test loads far fewer scripts than starting an exam', async ({
  browser,
  baseURL,
}) => {
  /** Counts script requests made between clicking Start and the runner showing. */
  async function scriptsLoadedBy(url, startName, firstHeading) {
    // A hand-made context does not inherit the config's baseURL, so pass it in.
    const context = await browser.newContext({ baseURL })
    const page = await context.newPage()
    await page.goto(url)
    await page.getByRole('button', { name: startName }).waitFor()
    let count = 0
    page.on('request', (request) => {
      if (request.resourceType() === 'script') count += 1
    })
    await page.getByRole('button', { name: startName }).click()
    await expect(page.getByRole('heading', { level: 2, name: firstHeading })).toBeVisible()
    await context.close()
    return count
  }
  const single = await scriptsLoadedBy(
    './#/clf-c02/test/new?kind=pre&scope=1.1',
    'Start Pre-Test',
    /^Question 1 of 10$/,
  )
  const exam = await scriptsLoadedBy(
    './#/clf-c02/test/new?kind=diagnostic',
    'Start Diagnostic Exam',
    /^Question 1 of 65$/,
  )
  expect(single).toBeLessThan(exam)
})
