import { Link, useParams } from 'react-router-dom'
import { useCert } from '../hooks/useCert.js'

export default function ReviewPage() {
  const cert = useCert()
  const { taskCode } = useParams()
  return (
    <>
      <h1 className="text-3xl font-bold">Review: Task {taskCode}</h1>
      <Link
        to={`/${cert.id}/test/new?kind=post&scope=${taskCode}`}
        className="mt-6 inline-block font-medium text-amber-700 underline dark:text-amber-400"
      >
        Take the Post-Test
      </Link>
    </>
  )
}
