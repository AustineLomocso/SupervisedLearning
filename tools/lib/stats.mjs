/** @typedef {import('./readContent.mjs').Content} Content */

/**
 * @typedef {object} TaskStats
 * @property {string} task
 * @property {number} active non-retired items
 * @property {number} retired
 * @property {number} multiple active multiple-response items
 * @property {number[]} difficulty active items at difficulty 1, 2 and 3
 * @property {boolean} hasLesson
 */

/**
 * @typedef {object} CertStats
 * @property {string} certId
 * @property {number} seedTarget
 * @property {number} fullTarget
 * @property {TaskStats[]} tasks
 */

/**
 * Progress against the item targets. Works on unvalidated content: unreadable shards count
 * as empty.
 * @param {Content} content
 * @returns {CertStats[]}
 */
export function computeStats(content) {
  return content.certs
    .filter((cert) => Array.isArray(cert.blueprint?.domains))
    .map((cert) => {
      const lessons = new Set(cert.lessons.map((lesson) => lesson.task))
      const codes = cert.blueprint.domains.flatMap((domain) =>
        domain.subdomains.map((sub) => sub.code),
      )
      const tasks = codes.map((task) => {
        const items = cert.shards
          .filter((shard) => shard.task === task)
          .flatMap((shard) => (Array.isArray(shard.data?.items) ? shard.data.items : []))
        const active = items.filter((item) => !item.retired)
        return {
          task,
          active: active.length,
          retired: items.length - active.length,
          multiple: active.filter((item) => item.type === 'multiple').length,
          difficulty: [1, 2, 3].map(
            (level) => active.filter((item) => item.difficulty === level).length,
          ),
          hasLesson: lessons.has(task),
        }
      })
      return {
        certId: cert.certId,
        seedTarget: cert.blueprint.itemTargets?.seed ?? 0,
        fullTarget: cert.blueprint.itemTargets?.full ?? 0,
        tasks,
      }
    })
}

/**
 * @param {CertStats[]} stats
 * @returns {string}
 */
export function formatStats(stats) {
  const lines = []
  for (const cert of stats) {
    const total = cert.tasks.reduce((sum, task) => sum + task.active, 0)
    lines.push(
      `${cert.certId}: ${total} active items (targets per task: seed ${cert.seedTarget}, full ${cert.fullTarget})`,
    )
    lines.push('  task   items   MR  d1/d2/d3   lesson  seed  full')
    for (const t of cert.tasks) {
      lines.push(
        [
          `  ${t.task.padEnd(6)}`,
          String(t.active).padStart(5),
          String(t.multiple).padStart(4),
          `  ${t.difficulty.join('/').padEnd(9)}`,
          t.hasLesson ? 'yes   ' : 'no    ',
          t.active >= cert.seedTarget ? '  ✓ ' : '  · ',
          t.active >= cert.fullTarget ? '   ✓' : '   ·',
        ].join(' '),
      )
    }
  }
  return lines.join('\n')
}
