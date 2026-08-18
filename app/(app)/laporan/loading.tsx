import { Skeleton } from "@/components/ui/skeleton"

export default function LaporanLoading() {
  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      {/* Tab Navigation Skeleton */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-32 rounded-lg" />
        <Skeleton className="h-8 w-28 rounded-lg" />
        <Skeleton className="h-8 w-36 rounded-lg" />
      </div>

      {/* Filter Toolbar Skeleton */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-36 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>

      {/* Summary Cards Skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-border p-4 flex flex-col gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="rounded-xl border border-border overflow-hidden p-4 space-y-3">
        <div className="flex justify-between items-center pb-2 border-b border-border">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-border/40">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>
    </div>
  )
}
