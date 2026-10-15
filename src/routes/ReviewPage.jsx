import { useLiveQuery } from 'dexie-react-hooks'
import { useLayoutEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { readHeadings } from '../components/markdown/headings.js'
import Markdown from '../components/markdown/Markdown.jsx'
import TableOfContents from '../components/markdown/TableOfContents.jsx'
import Loading from '../components/ui/Loading.jsx'
import { buttonClass } from '../components/ui/styles.js'
import { getSubdomain } from '../content/certs.js'
import { getProgress, markReviewComplete } from '../db/progress.js'
import { useCert } from '../hooks/useCert.js'
import { useLesson } from '../hooks/useLesson.js'
import { formatDate } from '../lib/format.js'
import NotFoundPage from './NotFoundPage.jsx'

/** @typedef {import('../content/certs.js').CertSummary} CertSummary */
/** @typedef {import('../content/certs.js').SubdomainSummary} SubdomainSummary */
/** @typedef {import('../components/markdown/headings.js').TocEntry} TocEntry */

export default function ReviewPage() {
  const cert = useCert()
  const { taskCode = '' } = useParams()
  const subdomain = getSubdomain(cert.id, taskCode)
  const lesson = useLesson(cert.id, subdomain?.hasLesson ? subdomain.code : null)

  if (!subdomain?.hasLesson) return <NotFoundPage />
  if (lesson.status === 'loading') return <Loading label="Loading lesson…" />
  if (lesson.status === 'error') {
    return (
      <div role="alert">
        <h1 className="text-[28px] leading-tight font-bold">Lesson unavailable</h1>
        <p className="mt-2 text-ink-muted">
          The lesson failed to load. Check your connection and reload the page.
        </p>
      </div>
    )
  }
  return <Lesson cert={cert} subdomain={subdomain} markdown={lesson.markdown} />
}

/** @param {{ cert: CertSummary, subdomain: SubdomainSummary, markdown: string }} props */
function Lesson({ cert, subdomain, markdown }) {
  const articleRef = useRef(/** @type {HTMLElement | null} */ (null))
  const [toc, setToc] = useState(/** @type {TocEntry[]} */ ([]))
  const [saveFailed, setSaveFailed] = useState(false)
  const reviewedAt = useLiveQuery(
    () =>
      getProgress(subdomain.id)
        .then((row) => row?.reviewCompletedAt ?? null)
        .catch((error) => {
          console.error('Failed to read review progress', error)
          return null
        }),
    [subdomain.id],
  )

  // rehype-slug assigns heading ids during render, so read them back from the DOM.
  useLayoutEffect(() => {
    if (articleRef.current) setToc(readHeadings(articleRef.current))
  }, [markdown])

  async function markReviewed() {
    setSaveFailed(false)
    try {
      await markReviewComplete(cert.id, subdomain.id)
    } catch (error) {
      console.error('Failed to save review progress', error)
      setSaveFailed(true)
    }
  }

  const reviewed = typeof reviewedAt === 'number'
  return (
    <>
      <p className="text-sm font-semibold tracking-wide text-accent">
        Review · Task {subdomain.code}
      </p>
      <div className="mt-2 lg:grid lg:grid-cols-[minmax(0,1fr)_14rem] lg:gap-10">
        <article ref={articleRef} className="min-w-0">
          <Markdown>{markdown}</Markdown>
        </article>
        <aside className="hidden lg:block">
          <div className="sticky top-4">
            <TableOfContents entries={toc} />
          </div>
        </aside>
      </div>

      <section aria-labelledby="finish-heading" className="mt-10 border-t border-line pt-6">
        <h2 id="finish-heading" className="text-lg font-bold">
          Finished reading?
        </h2>
        <output className="mt-2 block">
          {reviewed ? `Marked as reviewed on ${formatDate(reviewedAt)}.` : ''}
        </output>
        {saveFailed && (
          <p role="alert" className="mt-2 text-error">
            Couldn’t save your progress. Your browser may be blocking storage.
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-3">
          {reviewedAt === null && (
            <button type="button" onClick={markReviewed} className={buttonClass('primary')}>
              Mark as reviewed
            </button>
          )}
          <Link
            to={`/${cert.id}/test/new?kind=post&scope=${subdomain.code}`}
            className={buttonClass(reviewed ? 'primary' : 'secondary')}
          >
            Take the Post-Test
          </Link>
        </div>
      </section>
    </>
  )
}
