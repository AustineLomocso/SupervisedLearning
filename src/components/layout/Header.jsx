import { Link, NavLink } from 'react-router-dom'

/** @param {{ isActive: boolean }} state */
function navLinkClass({ isActive }) {
  const base = 'rounded px-3 py-2 text-sm font-medium'
  return isActive
    ? `${base} bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white`
    : `${base} text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white`
}

export default function Header() {
  return (
    <header className="border-b border-slate-200 dark:border-slate-800">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="text-lg font-bold">
          AWS Practitioner Prep
        </Link>
        <nav aria-label="Main">
          <ul className="flex gap-1">
            <li>
              <NavLink to="/" end className={navLinkClass}>
                Certifications
              </NavLink>
            </li>
            <li>
              <NavLink to="/settings" className={navLinkClass}>
                Settings
              </NavLink>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}
