/** @typedef {import('../content/types.js').LoadedItem} LoadedItem */

/**
 * A single-answer item (correct option: "a"), tagged as the loader would.
 * @param {Partial<LoadedItem>} [overrides]
 * @returns {LoadedItem}
 */
export function makeItem(overrides = {}) {
  return {
    id: 'clf-c02-1.1-0001',
    version: 1,
    type: 'single',
    selectCount: 1,
    difficulty: 2,
    stem: 'Which AWS service provides object storage with 11 nines of durability?',
    options: [
      { id: 'a', text: 'Amazon S3', correct: true, rationale: 'S3 is AWS object storage.' },
      { id: 'b', text: 'Amazon EBS', correct: false, rationale: 'EBS is block storage for EC2.' },
      { id: 'c', text: 'Amazon EC2', correct: false, rationale: 'EC2 provides compute capacity.' },
      { id: 'd', text: 'Amazon RDS', correct: false, rationale: 'RDS is a managed database.' },
    ],
    explanation: 'Amazon S3 stores objects in buckets and is designed for 11 nines of durability.',
    references: [{ title: 'What is Amazon S3?', url: 'https://docs.aws.amazon.com/s3/' }],
    certId: 'clf-c02',
    taskCode: '1.1',
    ...overrides,
  }
}

/**
 * A "choose two" item (correct options: "a" and "c").
 * @param {Partial<LoadedItem>} [overrides]
 * @returns {LoadedItem}
 */
export function makeMultiItem(overrides = {}) {
  return makeItem({
    id: 'clf-c02-1.1-0002',
    type: 'multiple',
    selectCount: 2,
    stem: 'Which TWO are benefits of cloud computing? (Choose TWO.)',
    options: [
      { id: 'a', text: 'Pay-as-you-go pricing', correct: true, rationale: 'You pay only for use.' },
      {
        id: 'b',
        text: 'Buying servers up front',
        correct: false,
        rationale: 'That is on-premises.',
      },
      {
        id: 'c',
        text: 'Elastic capacity',
        correct: true,
        rationale: 'Scale up and down on demand.',
      },
      { id: 'd', text: 'Fixed capacity', correct: false, rationale: 'The cloud is not fixed.' },
      {
        id: 'e',
        text: 'Manual patching of hardware',
        correct: false,
        rationale: 'AWS runs hardware.',
      },
    ],
    ...overrides,
  })
}
