import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <>
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">That page doesn’t exist.</p>
      <Link
        to="/"
        className="mt-4 inline-block font-medium text-amber-700 underline dark:text-amber-400"
      >
        Back to certifications
      </Link>
    </>
  )
}
