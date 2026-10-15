import AxeBuilder from '@axe-core/playwright'
import { chooseAnswer } from './helpers.js'
import { expect, test } from '@playwright/test'

/** Each page plus a selector that only appears once its async content has rendered. */
const PAGES = [
  // Each Playwright test gets a fresh browser context, so the cards say "Not started yet".
  { name: 'home', url: './', ready: 'text=Not started yet' },
  { name: 'dashboard', url: './#/clf-c02', ready: '#mastery-heading' },
  { name: 'domain', url: './#/clf-c02/d/3', ready: 'ol[aria-labelledby="tasks-heading"]' },
  { name: 'task', url: './#/clf-c02/s/1.1', ready: 'ol[aria-label="Learning path"]' },
  { name: 'lesson', url: './#/clf-c02/s/1.1/review', ready: '.mermaid-diagram svg' },
  { name: 'test setup', url: './#/clf-c02/test/new?kind=diagnostic', ready: 'form' },
  { name: 'settings', url: './#/settings', ready: '#reports-heading' },
]

for (const theme of ['light', 'dark']) {
  for (const { name, url, ready } of PAGES) {
    test(`${name} has no WCAG A/AA violations (${theme} theme)`, async ({ page }) => {
      await page.addInitScript((value) => localStorage.setItem('theme', value), theme)
      await page.goto(url)
      await expect(page.locator(ready).first()).toBeVisible()
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
      expect(results.violations).toEqual([])
    })
  }
}

/** Starts a Pre-Test (Study mode) or the Diagnostic (Exam mode) and returns on its first question. */
async function openRunner(page, mode) {
  if (mode === 'study') {
    await page.goto('./#/clf-c02/test/new?kind=pre&scope=1.1')
    await page.getByRole('button', { name: 'Start Pre-Test' }).click()
  } else {
    await page.goto('./#/clf-c02/test/new?kind=diagnostic')
    await page.getByRole('button', { name: 'Start Diagnostic Exam' }).click()
  }
  await expect(page.getByRole('heading', { level: 2, name: /^Question 1 of / })).toBeVisible()
}

async function expectNoViolations(page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(results.violations).toEqual([])
}

for (const theme of ['light', 'dark']) {
  test(`study runner with an explanation has no violations (${theme} theme)`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem('theme', value), theme)
    await openRunner(page, 'study')
    await chooseAnswer(page)
    await page.getByRole('button', { name: 'Submit answer' }).click()
    await expect(page.getByRole('heading', { name: 'Explanation' })).toBeVisible()
    await page.getByRole('button', { name: 'Report issue' }).click()
    await expectNoViolations(page)
  })

  test(`exam runner has no violations (${theme} theme)`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem('theme', value), theme)
    await openRunner(page, 'exam')
    await expect(page.getByRole('timer')).toBeVisible()
    await expectNoViolations(page)
  })

  test(`results page has no violations (${theme} theme)`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem('theme', value), theme)
    await openRunner(page, 'exam')
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Submit exam' }).click()
    await expect(
      page.getByRole('heading', { level: 1, name: 'Diagnostic Exam results' }),
    ).toBeVisible()
    await expectNoViolations(page)
  })
}
