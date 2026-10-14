/** Option letters shown next to choices, in display order. */
export const OPTION_LETTERS = 'ABCDEF'

const WORDS = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX']

/**
 * "Choose TWO" wording, as on the real exam.
 * @param {number} count
 */
export function countWord(count) {
  return WORDS[count] ?? String(count)
}
