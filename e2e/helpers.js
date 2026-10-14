import { expect } from '@playwright/test'

const COUNT_WORDS = { TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 }

/** Chooses a complete (not necessarily correct) answer for the question on screen. */
export async function chooseAnswer(page) {
  const badge = page.getByText(/^Choose [A-Z]+$/)
  if (await badge.count()) {
    const word = (await badge.first().textContent()).replace('Choose ', '')
    const boxes = page.getByRole('checkbox')
    for (let i = 0; i < COUNT_WORDS[word]; i += 1) {
      // Exam mode saves to IndexedDB before the box shows as checked, so don't use check().
      await boxes.nth(i).click()
      await expect(boxes.nth(i)).toBeChecked()
    }
  } else {
    const radio = page.getByRole('radio').first()
    await radio.click()
    await expect(radio).toBeChecked()
  }
}

/** All attempts stored in IndexedDB. */
export function readAttempts(page) {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('awsprep')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const db = open.result
          const all = db.transaction('attempts').objectStore('attempts').getAll()
          all.onsuccess = () => {
            db.close()
            resolve(all.result)
          }
          all.onerror = () => reject(all.error)
        }
      }),
  )
}
