import { Link } from 'react-router-dom'
import { LOW_CONFIDENCE_BELOW, MASTERY_WINDOW, NO_MASTERY } from '../../engine/mastery.js'
import MasteryBadge, { BandIcon } from './MasteryBadge.jsx'
import { BAND_STYLES } from './masteryBands.js'

/** @typedef {import('../../content/certs.js').CertSummary} CertSummary */
/** @typedef {import('../../engine/mastery.js').Mastery} Mastery */
/** @typedef {import('../../engine/mastery.js').MasteryBand} MasteryBand */

/** @type {{ band: MasteryBand, range: string }[]} */
const LEGEND = [
  { band: 'not-started', range: 'no answers yet' },
  { band: 'weak', range: 'under 50%' },
  { band: 'developing', range: '50–74%' },
  { band: 'strong', range: '75% or more' },
]

/**
 * Domains × tasks grid. Each cell links to its task and shows the band as tint, icon and text.
 * @param {{ cert: CertSummary, mastery: Map<string, Mastery> }} props
 */
export default function MasteryHeatmap({ cert, mastery }) {
  return (
    <section aria-labelledby="mastery-heading">
      <h2 id="mastery-heading" className="text-xl font-semibold">
        Mastery by task
      </h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Accuracy over your last {MASTERY_WINDOW} answers in each task. A dashed border means fewer
        than {LOW_CONFIDENCE_BELOW} answers so far.
      </p>
      <ul aria-label="Legend" className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {LEGEND.map(({ band, range }) => (
          <li key={band} className="inline-flex items-center gap-1.5">
            <BandIcon band={band} className={`size-4 ${BAND_STYLES[band].icon}`} />
            {BAND_STYLES[band].label} ({range})
          </li>
        ))}
      </ul>
      <div className="mt-4 space-y-4">
        {cert.domains.map((domain) => {
          const headingId = `heatmap-domain-${domain.no}`
          return (
            <div key={domain.id}>
              <h3 id={headingId} className="text-sm font-semibold">
                Domain {domain.no}: {domain.title}
              </h3>
              <ul
                aria-labelledby={headingId}
                className="mt-1 grid grid-cols-2 gap-0.5 sm:grid-cols-4"
              >
                {domain.subdomains.map((sub) => {
                  const current = mastery.get(sub.id) ?? NO_MASTERY
                  return (
                    <li key={sub.id}>
                      <Link
                        to={`/${cert.id}/s/${sub.code}`}
                        title={sub.title}
                        className={`flex h-full flex-col gap-1 rounded-sm border-2 p-2 hover:ring-2 hover:ring-slate-400 ${BAND_STYLES[current.band].cell} ${current.lowConfidence ? 'border-dashed' : ''}`}
                      >
                        <span className="font-semibold tabular-nums">
                          {sub.code}
                          <span className="sr-only">: {sub.title}</span>
                        </span>
                        <MasteryBadge mastery={current} />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}
