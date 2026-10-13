/**
 * Builders for small, valid content objects used by schema and tool tests.
 * Each call returns a fresh object; tests break one rule at a time.
 */
import { OPTION_IDS } from '../../src/content/schema.js'

export const REF_URL =
  'https://docs.aws.amazon.com/whitepapers/latest/aws-overview/introduction.html'
export const REF_URL_2 = 'https://aws.amazon.com/what-is-cloud-computing/'

/** Six clearly different stems, so baseline content never trips the near-duplicate check. */
export const STEMS = [
  'Which AWS service provides durable object storage for any amount of data?',
  'A startup wants to run containers without managing servers. Which option fits best?',
  'Which Well-Architected pillar focuses on recovering quickly from infrastructure failures?',
  'Under the shared responsibility model, who patches the guest operating system on Amazon EC2?',
  'Which tool estimates the monthly cost of a planned architecture before deployment?',
  'Which service records API calls made in an account so auditors can review them later?',
]

export const EXPLANATION =
  'Amazon S3 stores objects in buckets and scales automatically to any amount of data, which makes it the default choice for durable object storage on AWS.'

/** An item-level reference ({ url, title }). */
export function makeReference(overrides = {}) {
  return { url: REF_URL, title: 'Overview of Amazon Web Services', ...overrides }
}

/** A curated references.json entry ({ url, title, tasks }). */
export function makeCuratedReference(overrides = {}) {
  return { ...makeReference(), tasks: ['1.1'], ...overrides }
}

/**
 * @param {string[]} correctIds
 * @param {number} count
 */
export function makeOptions(correctIds = ['a'], count = 4) {
  return OPTION_IDS.slice(0, count).map((id) => ({
    id,
    text: `Answer option ${id.toUpperCase()}`,
    correct: correctIds.includes(id),
    rationale: `Option ${id.toUpperCase()} is ${correctIds.includes(id) ? 'correct' : 'incorrect'} for this scenario.`,
  }))
}

export function makeItem(overrides = {}) {
  return {
    id: 'tst-c01-1.1-0001',
    version: 1,
    type: 'single',
    selectCount: 1,
    difficulty: 2,
    stem: STEMS[0],
    options: makeOptions(['a']),
    explanation: EXPLANATION,
    references: [makeReference()],
    ...overrides,
  }
}

export function makeMultipleItem(overrides = {}) {
  return makeItem({
    type: 'multiple',
    selectCount: 2,
    options: makeOptions(['a', 'c'], 5),
    ...overrides,
  })
}

/**
 * @param {string} task
 * @param {object[]} items
 */
export function makeShard(task, items) {
  return { schemaVersion: 1, subdomain: task, items }
}

export function makeBlueprint(overrides = {}) {
  return {
    schemaVersion: 1,
    certId: 'tst-c01',
    code: 'TST-C01',
    title: 'Test Certification',
    displayOrder: 1,
    source: {
      url: 'https://docs.aws.amazon.com/aws-certification/latest/examples/test.html',
      retrievedOn: '2026-10-14',
    },
    exam: { questions: 65, scored: 50, minutes: 90, passScaled: 700 },
    itemTargets: { seed: 2, full: 4 },
    domains: [
      {
        no: 1,
        title: 'Domain One',
        weight: 0.6,
        subdomains: [
          { code: '1.1', title: 'Task one.', objectives: ['Objective 1.1 A', 'Objective 1.1 B'] },
          { code: '1.2', title: 'Task two.', objectives: ['Objective 1.2 A'] },
        ],
      },
      {
        no: 2,
        title: 'Domain Two',
        weight: 0.4,
        subdomains: [{ code: '2.1', title: 'Task three.', objectives: ['Objective 2.1 A'] }],
      },
    ],
    ...overrides,
  }
}

/**
 * A lesson long enough (about 420 words) to avoid the word-count warning.
 * @param {string} [title]
 * @param {string} [extra] Markdown appended after the body
 */
export function makeLesson(title = 'Lesson', extra = '') {
  return `# ${title}\n\n${'Cloud concepts matter. '.repeat(140)}\n\n${extra}\n`
}

/**
 * Fully valid content for one cert: 3 tasks × 2 items, a lesson per task, 2 curated refs.
 * `edit` receives the cert object and may mutate it before it is returned.
 * @param {(cert: any) => void} [edit]
 */
export function makeContent(edit) {
  const tasks = ['1.1', '1.2', '2.1']
  const cert = {
    certId: 'tst-c01',
    blueprint: makeBlueprint(),
    references: [
      makeCuratedReference({ tasks: ['1.1', '1.2', '2.1'] }),
      makeCuratedReference({ url: REF_URL_2, title: 'What is cloud computing?', tasks: ['2.1'] }),
    ],
    shards: tasks.map((task, t) => ({
      task,
      file: '001.json',
      data: makeShard(
        task,
        [0, 1].map((n) => makeItem({ id: `tst-c01-${task}-000${n + 1}`, stem: STEMS[t * 2 + n] })),
      ),
    })),
    lessons: tasks.map((task) => ({ task, text: makeLesson(`Task ${task}`) })),
  }
  edit?.(cert)
  return { certs: [cert] }
}
