/** @param {{ label?: string }} props */
export default function Loading({ label = 'Loading…' }) {
  return <output className="mt-6 block text-slate-600 dark:text-slate-300">{label}</output>
}
