import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Breadcrumbs from './Breadcrumbs.jsx'
import Footer from './Footer.jsx'
import Header from './Header.jsx'
import SkipLink from './SkipLink.jsx'
import StorageWarning from './StorageWarning.jsx'

export default function AppShell() {
  const mainRef = useRef(/** @type {HTMLElement | null} */ (null))
  const { pathname } = useLocation()
  const previousPathname = useRef(pathname)

  // After client-side navigation, move focus to the new page so keyboard and screen-reader
  // users start at its content. Comparing paths (not a first-render flag) is StrictMode-safe.
  useEffect(() => {
    if (previousPathname.current === pathname) return
    previousPathname.current = pathname
    mainRef.current?.focus()
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink targetRef={mainRef} />
      <StorageWarning />
      <Header />
      <Breadcrumbs />
      <main
        id="main"
        ref={mainRef}
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 outline-none"
      >
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
