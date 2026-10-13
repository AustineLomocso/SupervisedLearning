import { expect, test } from '@playwright/test'

test('home lists both certifications and opens a dashboard', async ({ page }) => {
  await page.goto('./')
  await expect(
    page.getByRole('heading', { level: 1, name: 'AWS Practitioner Exam Prep' }),
  ).toBeVisible()
  await page.getByRole('link', { name: /CLF-C02/ }).click()
  await expect(page).toHaveURL(/#\/clf-c02$/)
  await expect(page.getByRole('heading', { level: 1, name: /^CLF-C02:/ })).toBeVisible()
})

test('a deep link survives a full reload', async ({ page }) => {
  await page.goto('./#/aif-c01/s/2.1/review')
  const heading = page.getByRole('heading', { level: 1, name: 'Review: Task 2.1' })
  await expect(heading).toBeVisible()
  await page.reload()
  await expect(heading).toBeVisible()
})

test('the theme choice persists across reloads', async ({ page }) => {
  await page.goto('./#/settings')
  await page.getByRole('radio', { name: 'Dark' }).check()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await expect(page.getByRole('radio', { name: 'Dark' })).toBeChecked()
})

test('IndexedDB schema is created and stored data survives a reload', async ({ page }) => {
  await page.goto('./')
  await expect
    .poll(() => page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name)))
    .toContain('awsprep')

  const storeNames = await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open('awsprep')
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const names = [...request.result.objectStoreNames].sort()
          request.result.close()
          resolve(names)
        }
      }),
  )
  expect(storeNames).toEqual(['attempts', 'flags', 'itemStats', 'settings', 'subdomainProgress'])

  await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open('awsprep')
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const db = request.result
          const tx = db.transaction('settings', 'readwrite')
          tx.objectStore('settings').put({ key: 'e2e-check', value: 42 })
          tx.oncomplete = () => {
            db.close()
            resolve(undefined)
          }
          tx.onerror = () => reject(tx.error)
        }
      }),
  )

  await page.reload()

  const value = await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open('awsprep')
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const db = request.result
          const get = db.transaction('settings').objectStore('settings').get('e2e-check')
          get.onsuccess = () => {
            db.close()
            resolve(get.result?.value)
          }
          get.onerror = () => reject(get.error)
        }
      }),
  )
  expect(value).toBe(42)
})
