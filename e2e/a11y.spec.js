import AxeBuilder from '@axe-core/playwright'
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
