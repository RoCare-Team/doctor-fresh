/**
 * Shown while an admin page is being read from the database — the counts and
 * order lists are all live queries, so a slow connection would otherwise leave
 * the panel looking frozen. The shapes match what arrives: a row of cards over
 * a table.
 */
export default function AdminLoading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>

      <div className="h-6 w-40 rounded bg-line" />

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-line bg-white p-4">
            <span className="h-10 w-10 shrink-0 rounded-lg bg-line" />
            <span className="flex-1">
              <span className="block h-3 w-24 rounded bg-line" />
              <span className="mt-2 block h-4 w-16 rounded bg-line" />
            </span>
          </div>
        ))}
      </div>

      <div className="mt-8 h-5 w-32 rounded bg-line" />

      <div className="mt-3 overflow-hidden rounded-xl border border-line bg-white">
        <div className="h-11 border-b border-line bg-surface-muted" />
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-line px-4 py-4 last:border-0">
            <span className="h-3 w-24 rounded bg-line" />
            <span className="h-8 w-8 rounded-full bg-line" />
            <span className="h-3 w-32 rounded bg-line" />
            <span className="ml-auto h-3 w-16 rounded bg-line" />
            <span className="h-7 w-24 rounded-lg bg-line" />
          </div>
        ))}
      </div>
    </div>
  );
}
