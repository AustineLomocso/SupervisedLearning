export default function Footer() {
  return (
    <footer className="border-t border-slate-200 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
      <div className="mx-auto w-full max-w-5xl space-y-2 px-4 py-6">
        <p>
          This is an independent study aid. It is not affiliated with, endorsed by, or sponsored by
          Amazon Web Services, Inc. AWS and related marks are trademarks of Amazon.com, Inc. or its
          affiliates.
        </p>
        <p>
          Questions and lessons are AI-generated and may contain errors. Use “Report issue” on any
          question to flag a problem.
        </p>
        <p>
          Your progress is stored only in this browser. Export a backup from Settings to keep it
          safe.
        </p>
      </div>
    </footer>
  )
}
