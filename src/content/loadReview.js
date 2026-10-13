/**
 * Builds a lesson loader from Markdown modules keyed "/content/<cert>/review/<task>.md".
 * @param {Record<string, () => Promise<unknown>>} loaders
 */
export function createReviewLoader(loaders) {
  /**
   * @param {string} certId
   * @param {string} taskCode
   * @returns {Promise<string>} the lesson's Markdown
   */
  return async function loadReview(certId, taskCode) {
    const load = loaders[`/content/${certId}/review/${taskCode}.md`]
    if (!load) throw new Error(`No review lesson for ${certId} ${taskCode}`)
    return /** @type {string} */ (await load())
  }
}

export const loadReview = createReviewLoader(
  import.meta.glob('/content/*/review/*.md', { query: '?raw', import: 'default' }),
)
