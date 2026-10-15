import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <>
      <h1 className="text-[28px] leading-tight font-bold">Page not found</h1>
      <p className="mt-2 text-ink-muted">That page doesn’t exist.</p>
      <Link to="/" className="mt-4 inline-block font-bold text-accent underline">
        Back to certifications
      </Link>
    </>
  )
}
