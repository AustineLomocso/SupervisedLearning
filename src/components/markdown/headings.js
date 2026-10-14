/**
 * @typedef {object} TocEntry
 * @property {string} id
 * @property {string} text
 * @property {2 | 3} level
 */

/**
 * Reads the rendered lesson's section headings (ids come from rehype-slug).
 * @param {ParentNode} container
 * @returns {TocEntry[]}
 */
export function readHeadings(container) {
  return [...container.querySelectorAll('h2[id], h3[id]')].map((heading) => ({
    id: heading.id,
    text: heading.textContent ?? '',
    level: heading.tagName === 'H3' ? 3 : 2,
  }))
}
