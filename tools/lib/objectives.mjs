/** Below this many active items a task is still being written, so its spread is not judged. */
export const MIN_SPREAD_SIZE = 40

/** No objective may hold more than this share of a task's questions. */
export const MAX_OBJECTIVE_SHARE = 0.4

/** Every objective needs at least this many questions. */
export const MIN_PER_OBJECTIVE = 2

/**
 * Editorial checks on how a task's questions spread over its blueprint objectives. Only
 * applies once some items carry an `objective` tag, so untagged seed tasks stay quiet.
 * @param {{ objective?: number }[]} items a task's active items
 * @param {number} objectiveCount how many objectives the blueprint lists for the task
 * @returns {string[]} problems, as messages for the validator's warnings
 */
export function objectiveSpreadIssues(items, objectiveCount) {
  const tagged = items.filter((item) => typeof item.objective === 'number')
  if (tagged.length === 0) return []

  const issues = []
  const untagged = items.length - tagged.length
  if (untagged > 0) issues.push(`${untagged} active items have no objective tag`)
  if (items.length < MIN_SPREAD_SIZE) return issues

  const counts = Array.from({ length: objectiveCount }, () => 0)
  for (const item of tagged) {
    if (item.objective !== undefined && item.objective < objectiveCount) counts[item.objective] += 1
  }
  counts.forEach((count, objective) => {
    if (count < MIN_PER_OBJECTIVE) {
      issues.push(
        `objective ${objective} has ${count} question${count === 1 ? '' : 's'}; every objective needs at least ${MIN_PER_OBJECTIVE}`,
      )
    } else if (count / items.length > MAX_OBJECTIVE_SHARE) {
      const percent = Math.round((count / items.length) * 100)
      issues.push(
        `objective ${objective} has ${count} of ${items.length} questions (${percent}%); keep it to ${MAX_OBJECTIVE_SHARE * 100}% or less`,
      )
    }
  })
  return issues
}
