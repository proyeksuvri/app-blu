"use client"

import { useSearchParams } from "next/navigation"
import {
  Pagination, PaginationContent, PaginationItem,
  PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis,
} from "@/components/ui/pagination"

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
  const searchParams = useSearchParams()
  const totalPages = Math.ceil(count / pageSize)

  if (totalPages <= 1) return null

  function href(p: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(p))
    return `?${params.toString()}`
  }

  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground">
      <span>
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, count)} dari {count} transaksi
      </span>
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
