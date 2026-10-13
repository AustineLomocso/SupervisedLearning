import AppShell from './components/layout/AppShell.jsx'
import { getCert } from './content/certs.js'
import CertGuard from './routes/CertGuard.jsx'
import NotFoundPage from './routes/NotFoundPage.jsx'
import RouteError from './routes/RouteError.jsx'

/**
 * Turns a dynamic page import into React Router's `lazy` option, so each page is its own chunk.
 * @param {() => Promise<{ default: import('react').ComponentType }>} load
 */
function page(load) {
  return async () => ({ Component: (await load()).default })
}

/**
 * Breadcrumb label for a route (read by components/layout/Breadcrumbs.jsx).
 * @param {(params: import('react-router-dom').Params<string>) => string | null} label
 */
function crumb(label) {
  return { crumb: label }
}

/** @type {import('react-router-dom').RouteObject[]} */
export const routes = [
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, lazy: page(() => import('./routes/HomePage.jsx')) },
      {
        path: 'settings',
        handle: crumb(() => 'Settings'),
        lazy: page(() => import('./routes/SettingsPage.jsx')),
      },
      {
        path: 'attempt/:attemptId',
        handle: crumb(() => 'Test'),
        lazy: page(() => import('./routes/AttemptPage.jsx')),
      },
      {
        path: 'attempt/:attemptId/results',
        handle: crumb(() => 'Results'),
        lazy: page(() => import('./routes/ResultsPage.jsx')),
      },
      {
        path: ':certId',
        element: <CertGuard />,
        handle: crumb((params) => getCert(params.certId ?? '')?.code ?? null),
        children: [
          { index: true, lazy: page(() => import('./routes/CertDashboardPage.jsx')) },
          {
            path: 'd/:domainNo',
            handle: crumb((params) => `Domain ${params.domainNo}`),
            lazy: page(() => import('./routes/DomainPage.jsx')),
          },
          {
            path: 's/:taskCode',
            handle: crumb((params) => `Task ${params.taskCode}`),
            children: [
              { index: true, lazy: page(() => import('./routes/SubdomainPage.jsx')) },
              {
                path: 'review',
                handle: crumb(() => 'Review'),
                lazy: page(() => import('./routes/ReviewPage.jsx')),
              },
            ],
          },
          {
            path: 'test/new',
            handle: crumb(() => 'New test'),
            lazy: page(() => import('./routes/TestSetupPage.jsx')),
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
