# AWS Practitioner Exam Prep

A free, browser-only study app for the **AWS Certified Cloud Practitioner (CLF-C02)** and
**AWS Certified AI Practitioner (AIF-C01)** exams. Built with React + Vite and deployed to
GitHub Pages. All progress is stored locally in the browser (IndexedDB).

Not affiliated with or endorsed by Amazon Web Services.

## Requirements

- Node 24 (see `.nvmrc`)

## Scripts

| Command                    | What it does                                                                     |
| -------------------------- | -------------------------------------------------------------------------------- |
| `npm run dev`              | Dev server at http://localhost:5173/SupervisedLearning/                          |
| `npm test`                 | Unit and component tests (Vitest)                                                |
| `npm run test:e2e`         | Builds, serves and runs Playwright tests                                         |
| `npm run lint`             | oxlint (warnings fail)                                                           |
| `npm run typecheck`        | JSDoc type-check with `tsc --checkJs`                                            |
| `npm run format`           | Prettier                                                                         |
| `npm run build`            | Production build to `dist/`                                                      |
| `npm run validate:content` | Validate `content/` (add `-- --strict` to fail on warnings)                      |
| `npm run content:stats`    | Item and lesson progress per task                                                |
| `npm run check:links`      | Check every curated reference URL (needs network)                                |
| `npm run build:index`      | Regenerate `src/generated/` (runs automatically before dev/build/test/typecheck) |

## Content

Exam content lives in `content/<cert>/` (blueprint, curated references, question shards,
lessons). See `content/AUTHORING.md` for the format and writing rules.

## Design

- Spec: `docs/superpowers/specs/2026-10-13-aws-cert-review-design.md`
- Plans: `docs/superpowers/plans/`
