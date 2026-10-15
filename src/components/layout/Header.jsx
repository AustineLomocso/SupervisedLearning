import { Link, NavLink } from 'react-router-dom'

/** @param {{ isActive: boolean }} state */
function navLinkClass({ isActive }) {
  const base = 'block border-b-2 px-3 py-3 text-sm font-bold'
  return isActive
    ? `${base} border-[#ff9900] text-white`
    : `${base} border-transparent text-[#d1d5db] hover:text-white`
}

export default function Header() {
  return (
    <header className="bg-topnav text-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-2 py-3 text-lg font-bold">
          <span aria-hidden="true" className="size-4 rounded-sm bg-[#ff9900]" />
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
