# AWS Practitioner Exam Prep

A free, browser-only study app for the **AWS Certified Cloud Practitioner (CLF-C02)** and
**AWS Certified AI Practitioner (AIF-C01)** exams. Built with React + Vite and deployed to
GitHub Pages. All progress is stored locally in the browser (IndexedDB).

Not affiliated with or endorsed by Amazon Web Services.

## Requirements

- Node 24 (see `.nvmrc`)

## Scripts

| Command             | What it does                                            |
| ------------------- | ------------------------------------------------------- |
| `npm run dev`       | Dev server at http://localhost:5173/SupervisedLearning/ |
| `npm test`          | Unit and component tests (Vitest)                       |
| `npm run test:e2e`  | Builds, serves and runs Playwright tests                |
| `npm run lint`      | oxlint (warnings fail)                                  |
| `npm run typecheck` | JSDoc type-check with `tsc --checkJs`                   |
| `npm run format`    | Prettier                                                |
| `npm run build`     | Production build to `dist/`                             |

## Design

- Spec: `docs/superpowers/specs/2026-10-13-aws-cert-review-design.md`
- Plans: `docs/superpowers/plans/`
