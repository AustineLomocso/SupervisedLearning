# Authoring guide

Rules for writing exam content. `npm run validate:content` enforces everything marked
**(checked)**. The rest are editorial rules every writer must follow.

## Files

```
content/<cert>/
├─ blueprint.json      # official domains, weights, task statements, objectives (do not edit)
├─ references.json     # curated, link-checked AWS pages: { url, title, tasks }
├─ items/<task>/001.json, 002.json, …   # shards of up to 25 questions
└─ review/<task>.md    # one lesson per task statement
```

## Workflow

1. Read the task's `objectives` in `blueprint.json` and the entries in `references.json`
   whose `tasks` include your task.
2. Write the lesson, then the questions.
3. Run `npm run format`, then `npm run validate:content`, then `npm run content:stats`.
4. Fix every error **and** every warning that names your files.
5. To see changes in the running app, run `npm run build:index` or restart `npm run dev`.

## Accuracy

- Use the service and feature names from the current exam guide (the blueprint objectives),
  for example "Amazon SageMaker AI", "Amazon Quick Sight", "AWS Business Support+".
- If you are not certain of a fact, open the relevant `references.json` page and confirm it
  before writing. This covers which service does what, plan features, and limits.
- Do not quote prices or other numbers that change often.
- Each question must have exactly one defensible answer set. Every distractor must be wrong
  for a reason the rationale can state.

## Questions

### Format (checked)

- `id`: `<cert>-<task>-NNNN`, using the next unused number. Never reuse or renumber an id.
  To withdraw a question, set `"retired": true` instead of deleting it. If you change a
  question's meaning, bump `version`.
- `type: "single"`: exactly 4 options, 1 correct, `selectCount: 1`.
- `type: "multiple"`: either 5 options with 2 correct (`selectCount: 2`), or 6 options with
  3 correct (`selectCount: 3`).
- Option ids run `a`, `b`, `c`… in order. Vary which positions hold the correct answers.
- Never use "all of the above", "none of the above", "both of the above" or "neither of the
  above".
- Never put "(Select TWO.)" or similar in the stem. The app shows it from `selectCount`.
- Minimum lengths: `stem` 20 characters, each `rationale` 20, `explanation` 100.
- `difficulty`: 1, 2 or 3.
- `references`: 1–3 entries, each copied exactly (`url` and `title`) from `references.json`.
- Shards hold 25 questions. Start `002.json` only once `001.json` is full.

### Style

- **Stems** read like the AWS exam: usually a short scenario ("A company wants to…
  Which AWS service…?"). One question per stem, no trick wording, and avoid NOT/EXCEPT.
- **Options** use parallel grammar and similar length. Distractors are plausible: real AWS
  services or concepts from the same category. No joke answers. Don't let the correct option
  be the longest or most detailed.
- **Difficulty:**
  - 1 = recall (what a service or term is).
  - 2 = apply (pick the service or concept for a stated need).
  - 3 = compare or scenario (two plausible choices; the stated requirements decide).
- **Rationale** (every option): 1–3 sentences on why this option is right, or why it is
  wrong _for this scenario_.
- **Explanation:** 60–150 words that teach the underlying concept, not just restate the answer.

### Mix for each 20-question seed batch

- 16 `single` + 4 `multiple`: three "2 of 5" and one "3 of 6". The validator warns when
  multiple response is outside 15–30% of a task with 10+ questions.
- Difficulty: six at level 1, ten at level 2, four at level 3.
- Cover every objective bullet of the task at least once. If a task has more bullets than you
  can cover well, cover the most exam-relevant ones and list the uncovered bullets in your
  report.
- No two stems may test the same fact the same way. The validator warns at ≥ 0.8 trigram
  similarity.

### Example

```json
{
  "id": "clf-c02-3.6-0001",
  "version": 1,
  "type": "single",
  "selectCount": 1,
  "difficulty": 2,
  "stem": "A company must keep audit logs for 7 years and expects to read them less than once a year. Which Amazon S3 storage class is the most cost-effective choice?",
  "options": [
    {
      "id": "a",
      "text": "S3 Standard",
      "correct": false,
      "rationale": "S3 Standard is designed for frequently accessed data and costs more to store rarely read logs."
    },
    {
      "id": "b",
      "text": "S3 Glacier Deep Archive",
      "correct": true,
      "rationale": "Glacier Deep Archive has the lowest storage cost and suits data read once a year or less, with retrieval in hours."
    },
    {
      "id": "c",
      "text": "S3 One Zone-IA",
      "correct": false,
      "rationale": "One Zone-IA stores data in a single Availability Zone and costs more than archive classes for multi-year retention."
    },
    {
      "id": "d",
      "text": "S3 Express One Zone",
      "correct": false,
      "rationale": "S3 Express One Zone targets single-digit millisecond access for performance-critical workloads, not archives."
    }
  ],
  "explanation": "Amazon S3 storage classes trade storage price against access speed and cost. Data that must be retained for years but is almost never read belongs in an archive class. S3 Glacier Deep Archive offers the lowest storage price in S3, with retrievals that take hours, which is acceptable for compliance archives. Frequently accessed classes such as S3 Standard cost more per gigabyte stored.",
  "references": [
    { "url": "https://aws.amazon.com/s3/storage-classes/", "title": "Amazon S3 Storage Classes" }
  ]
}
```

## Lessons (`review/<task>.md`)

Concise study notes of about 600–900 words. The validator warns outside 400–1,200 words.

```markdown
# <Task statement title, without the trailing period>

<Two or three sentences: what this task covers and why it matters on the exam.>

## Key concepts

<Short sections, one per objective group. Plain language, concrete examples.>

## Key terms

| Term | Meaning |
| ---- | ------- |

## Comparisons

<A table or bullets contrasting easily confused services or concepts.>

## Exam tips

- <Patterns in how questions are asked; traps to avoid.>

## Learn more

- [<title>](<url from references.json>)
```

- Must start with `# ` **(checked)**.
- Every link must be a `references.json` URL **(checked)**.
- Optional Mermaid diagram, where it genuinely helps: a fenced ` ```mermaid ` block with
  `flowchart` or `graph` and no more than 12 nodes. Fences must be closed **(checked)**.

## References (`references.json`)

```json
[{ "url": "https://docs.aws.amazon.com/…", "title": "Page title", "tasks": ["3.6"] }]
```

- Hosts allowed: `docs.aws.amazon.com`, `aws.amazon.com` (and its subdomains),
  `d1.awsstatic.com`, `repost.aws` **(checked)**.
- No duplicate URLs; `tasks` must be blueprint task codes **(checked)**.
- Prefer AWS user guides, "What is…" pages and whitepapers on docs.aws.amazon.com. Product,
  pricing and support-plan pages on aws.amazon.com are fine.
- Run `npm run check:links` after adding URLs. Fix every ✗, and replace each ↪ redirect
  with its final URL.

## Bulk batches (Phase 6, Milestone 1: 50 questions per task)

Milestone 1 grows every task from about 20 questions to 50. A batch is one task: 30 new
questions, written by one generator and then checked by a separate blind reviewer.

### What a batch contains

- **Where:** 5 questions fill `001.json` up to 25 (4 for CLF-C02 task 1.2, which has 21), and
  25 go into a new `002.json`. Ids continue from the task's highest id.
- **Mix of the new 30:** 24 `single` and 6 `multiple` (five "2 of 5", one "3 of 6");
  difficulty 9 / 15 / 6 at levels 1 / 2 / 3. With the seed, the task ends at 50 questions:
  40 single and 10 multiple, difficulty 15 / 25 / 10.
- **Objective tags (checked as warnings):** every active question in the task carries
  `"objective": N`, the 0-based index of the blueprint objective it mainly tests. The
  generator tags the existing seed questions too (a metadata change: do not bump `version`).
  Spread rule: every objective has at least 2 questions and none has more than 40% of the
  task. Aim for the exam's emphasis, not a perfectly even split.
- **No repeats:** read every existing stem in the task first. A new question must test a new
  fact, or the same fact from a clearly different angle (different scenario and different
  correct answer). The validator warns at 0.8 trigram similarity, but that only catches
  near-copies.
- **Sources:** use only the task's `references.json` entries, and confirm facts there before
  writing them. Never write a question you cannot support from those pages.

### Blind-solve review

1. The generator runs `npm run blind:export -- <cert> <task> --from <first new id> --out
<file>`. The export has no answer key, rationales or explanations.
2. A separate reviewer who has not seen the shard files answers every question from the
   export, the lesson and `references.json` only, writing
   `{ "<id>": { "answer": ["a"], "note": "…" } }`. The note matters for any question that felt
   ambiguous or where two options looked defensible.
3. `npm run blind:compare -- <cert> <task> <answers.json> --from <first new id>` must exit 0.
   For each disagreement the generator decides:
   - the key is wrong → fix the key and its rationales;
   - the wording is ambiguous or a distractor is also defensible → reword the stem or replace
     the distractor, so exactly one answer set is defensible;
   - the reviewer was wrong → leave the question, and say why in the log.
     Questions that were changed are blind-solved again.
4. Record each batch in `docs/content-review/milestone-1.md`: how many questions disagreed,
   what was fixed, and anything left for later.
