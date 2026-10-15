/** @param {{ label?: string }} props */
export default function Loading({ label = 'Loading…' }) {
  return <output className="mt-6 block text-ink-muted">{label}</output>
}
