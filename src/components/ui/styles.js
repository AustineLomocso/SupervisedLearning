/** @typedef {'primary' | 'secondary' | 'danger'} ButtonVariant */

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-full px-5 py-1.5 font-bold disabled:cursor-not-allowed disabled:opacity-50'

/** @type {Record<ButtonVariant, string>} */
const VARIANTS = {
  primary:
    'border-2 border-accent bg-accent text-on-accent hover:border-accent-hover hover:bg-accent-hover',
  secondary:
    'border-2 border-accent text-accent hover:border-accent-hover hover:bg-surface-alt hover:text-accent-hover',
  danger: 'border-2 border-error text-error hover:bg-error-bg',
}

/**
 * Classes for a <button> or a button-styled <Link>.
 * @param {ButtonVariant} [variant]
 */
export function buttonClass(variant = 'secondary') {
  return `${BASE} ${VARIANTS[variant]}`
}

/** A white, rounded console container (card). */
export function containerClass() {
  return 'rounded-2xl bg-surface shadow-container'
}

/** Header strip of a container: pair with an <h2> styled by `containerTitleClass`. */
export function containerHeaderClass() {
  return 'border-b border-line px-5 pt-4 pb-3'
}

export function containerTitleClass() {
  return 'text-lg font-bold text-ink-heading'
}

/** In-text link, console blue. */
export function linkClass() {
  return 'font-bold text-accent hover:text-accent-hover hover:underline underline-offset-2'
}

/** Text inputs, selects and textareas. */
export function inputClass() {
  return 'rounded-lg border-2 border-line-strong bg-surface px-2 py-1 text-ink focus:border-accent'
}
