export default function Loading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* Page header skeleton */}
      <div className="flex flex-col gap-2">
        <div className="h-5 w-48 rounded-md bg-muted" />
        <div className="h-3.5 w-32 rounded-md bg-muted/60" />
      </div>

      {/* Cards row skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <div className="h-8 w-8 rounded-lg bg-muted mb-4" />
            <div className="h-3 w-24 rounded bg-muted/60 mb-2" />
            <div className="h-6 w-32 rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-5 py-3.5">
          <div className="h-4 w-36 rounded bg-muted" />
        </div>
        <div className="divide-y divide-border/50">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5">
              <div className="h-3.5 w-28 rounded bg-muted/60" />
              <div className="h-3.5 w-20 rounded bg-muted/50" />
              <div className="h-3.5 w-32 rounded bg-muted/40" />
              <div className="h-3.5 w-16 rounded bg-muted/30 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
