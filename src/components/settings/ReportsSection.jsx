import { useLiveQuery } from 'dexie-react-hooks'
import { buildReportsExport, deleteFlag, FLAG_REASON_LABELS, listFlags } from '../../db/flags.js'
import { downloadJson, fileDateStamp } from '../../lib/download.js'
import { formatDate } from '../../lib/format.js'
import Loading from '../ui/Loading.jsx'
import { buttonClass } from '../ui/styles.js'

export default function ReportsSection() {
  const flags = useLiveQuery(
    () =>
      listFlags().catch((error) => {
        console.error('Failed to read reports', error)
        return []
      }),
    [],
  )

  return (
    <section aria-labelledby="reports-heading" className="mt-8">
      <h2 id="reports-heading" className="text-xl font-semibold">
        My reports
      </h2>
      <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">
        Questions you flagged with “Report issue”. Reports stay in this browser. Export them to
        share with the app’s maintainer.
      </p>
      {flags === undefined ? (
        <Loading label="Loading reports…" />
      ) : flags.length === 0 ? (
        <p className="mt-3">You haven’t reported any questions yet.</p>
      ) : (
        <>
          <button
            type="button"
            onClick={() =>
              downloadJson(`awsprep-reports-${fileDateStamp()}.json`, buildReportsExport(flags))
            }
            className={`${buttonClass('primary')} mt-3`}
          >
            Export reports
          </button>
          <ul aria-label="Reports" className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
            {flags.map((flag) => (
              <li key={flag.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    <code className="text-sm">{flag.itemId}</code> ·{' '}
                    {FLAG_REASON_LABELS[flag.reason]}
                  </p>
                  {flag.note && <p className="mt-1 text-sm break-words">{flag.note}</p>}
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    Reported {formatDate(flag.createdAt)} · question version {flag.itemVersion}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteFlag(flag.id)}
                  aria-label={`Delete report on ${flag.itemId}`}
                  className={buttonClass('secondary')}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
