import { Link, useParams } from 'react-router-dom'
import { useCert } from '../hooks/useCert.js'

export default function SubdomainPage() {
  const cert = useCert()
  const { taskCode } = useParams()
  const steps = [
    { label: 'Pre-Test', to: `/${cert.id}/test/new?kind=pre&scope=${taskCode}` },
    { label: 'Review', to: `/${cert.id}/s/${taskCode}/review` },
    { label: 'Post-Test', to: `/${cert.id}/test/new?kind=post&scope=${taskCode}` },
  ]
  return (
    <>
      <h1 className="text-3xl font-bold">Task {taskCode}</h1>
      <ol aria-label="Learning path" className="mt-6 space-y-3">
        {steps.map((step, index) => (
          <li key={step.label} className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-7 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold dark:bg-slate-800"
            >
              {index + 1}
            </span>
            <Link to={step.to} className="font-medium underline-offset-2 hover:underline">
              {step.label}
            </Link>
          </li>
        ))}
      </ol>
    </>
  )
}
