/** @typedef {import('../../engine/mastery.js').MasteryBand} MasteryBand */

/**
 * Status colors per band. Bands are always shown with an icon and a text label as well, so
 * color is never the only signal. Text inside cells uses ink colors, never the band color.
 * @type {Record<MasteryBand, { label: string, cell: string, icon: string }>}
 */
export const BAND_STYLES = {
  'not-started': {
    label: 'Not started',
    cell: 'border-line-strong bg-surface',
    icon: 'text-ink-muted',
  },
  weak: {
    label: 'Weak',
    cell: 'border-error bg-error-bg',
    icon: 'text-error',
  },
  developing: {
    label: 'Developing',
    cell: 'border-warning bg-warning-bg',
    icon: 'text-warning',
  },
  strong: {
    label: 'Strong',
    cell: 'border-success bg-success-bg',
    icon: 'text-success',
  },
}
