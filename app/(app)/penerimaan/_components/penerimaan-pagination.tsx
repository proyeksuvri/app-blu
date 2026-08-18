"use client"

import { useRouter, useSearchParams } from "next/navigation"
import {
  Pagination, PaginationContent, PaginationItem,
  PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis,
} from "@/components/ui/pagination"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const PAGE_SIZE_OPTIONS = [25, 50, 100]

function buildPages(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | "…")[] = [1]
  if (current > 3) pages.push("…")
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i)
  if (current < total - 2) pages.push("…")
  pages.push(total)
  return pages
}

export function PenerimaanPagination({
  count, page, pageSize,
}: {
  count: number; page: number; pageSize: number
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const totalPages = Math.ceil(count / pageSize)

  function href(p: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(p))
    return `?${params.toString()}`
  }

  function handlePageSize(val: string | null) {
    if (!val) return
    const params = new URLSearchParams(searchParams.toString())
    params.set("limit", val)
    params.delete("page")
    router.push(`?${params.toString()}`)
  }

  if (totalPages <= 1 && count <= Math.min(...PAGE_SIZE_OPTIONS)) return null

  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline">Baris per halaman</span>
        <Select value={String(pageSize)} onValueChange={handlePageSize}>
          <SelectTrigger className="h-7 w-20 text-xs border-border bg-transparent">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((n) => (
              <SelectItem key={n} value={String(n)} className="text-xs">{n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, count)} dari {count}</span>
      </div>
      <Pagination className="w-auto mx-0">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href={href(page - 1)}
              aria-disabled={page === 1}
              className={page === 1 ? "pointer-events-none opacity-40" : ""}
              text="Sebelumnya"
            />
          </PaginationItem>
          {buildPages(page, totalPages).map((p, i) =>
            p === "…" ? (
              <PaginationItem key={`e${i}`}><PaginationEllipsis /></PaginationItem>
            ) : (
              <PaginationItem key={p}>
                <PaginationLink href={href(p)} isActive={p === page}>{p}</PaginationLink>
              </PaginationItem>
            )
          )}
          <PaginationItem>
            <PaginationNext
              href={href(page + 1)}
              aria-disabled={page === totalPages}
              className={page === totalPages ? "pointer-events-none opacity-40" : ""}
              text="Berikutnya"
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
