import { AlertCircleIcon, CheckCircleIcon, CircleIcon, HalfCircleIcon } from '../ui/icons.jsx'
import { BAND_STYLES } from './masteryBands.js'

/** @typedef {import('../../engine/mastery.js').Mastery} Mastery */
/** @typedef {import('../../engine/mastery.js').MasteryBand} MasteryBand */

/**
 * A distinct shape per band, so bands can be told apart without color.
 * @param {{ band: MasteryBand, className?: string }} props
 */
export function BandIcon({ band, className }) {
  switch (band) {
    case 'strong':
      return <CheckCircleIcon className={className} />
    case 'developing':
      return <HalfCircleIcon className={className} />
    case 'weak':
      return <AlertCircleIcon className={className} />
    default:
      return <CircleIcon className={className} />
  }
}

/**
 * Band icon + label + percentage (+ a low-confidence note).
 * @param {{ mastery: Mastery }} props
 */
export default function MasteryBadge({ mastery }) {
  const style = BAND_STYLES[mastery.band]
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 text-sm">
      <BandIcon band={mastery.band} className={`size-4 shrink-0 ${style.icon}`} />
      <span>{style.label}</span>
      {mastery.pct !== null && <span className="tabular-nums">{mastery.pct}%</span>}
      {mastery.lowConfidence && (
        <span className="text-slate-600 dark:text-slate-300">(few answers)</span>
      )}
    </span>
  )
}
