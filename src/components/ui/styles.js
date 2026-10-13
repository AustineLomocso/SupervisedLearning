/** @typedef {'primary' | 'secondary' | 'danger'} ButtonVariant */

const BASE =
  'inline-flex items-center justify-center gap-2 rounded px-4 py-2 font-medium disabled:cursor-not-allowed disabled:opacity-50'

/** @type {Record<ButtonVariant, string>} */
const VARIANTS = {
  primary:
    'bg-slate-900 text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300',
  secondary:
    'border border-slate-300 hover:border-slate-500 dark:border-slate-700 dark:hover:border-slate-500',
  danger:
    'border border-red-300 text-red-700 hover:border-red-500 dark:border-red-800 dark:text-red-400 dark:hover:border-red-600',
}

/**
 * Classes for a <button> or a button-styled <Link>.
 * @param {ButtonVariant} [variant]
 */
export function buttonClass(variant = 'secondary') {
  return `${BASE} ${VARIANTS[variant]}`
}
