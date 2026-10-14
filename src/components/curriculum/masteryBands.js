/** @typedef {import('../../engine/mastery.js').MasteryBand} MasteryBand */

/**
 * Status colors per band. Bands are always shown with an icon and a text label as well, so
 * color is never the only signal. Text inside cells uses ink colors, never the band color.
 * @type {Record<MasteryBand, { label: string, cell: string, icon: string }>}
 */
export const BAND_STYLES = {
  'not-started': {
    label: 'Not started',
    cell: 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900',
    icon: 'text-slate-500 dark:text-slate-400',
  },
  weak: {
    label: 'Weak',
    cell: 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/50',
    icon: 'text-red-700 dark:text-red-400',
  },
  developing: {
    label: 'Developing',
    cell: 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50',
    icon: 'text-amber-700 dark:text-amber-300',
  },
  strong: {
    label: 'Strong',
    cell: 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/50',
    icon: 'text-emerald-700 dark:text-emerald-400',
  },
}
