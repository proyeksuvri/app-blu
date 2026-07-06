"use client"

import { useState, useTransition, ReactNode } from "react"
import { Plus, Pencil, ToggleLeft, ToggleRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusBadge } from "@/components/status-badge"
import { EmptyState } from "@/components/empty-state"
import { toast } from "sonner"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination"

const PAGE_SIZE = 10

function buildPages(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | "…")[] = [1]
  if (current > 3) pages.push("…")
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i)
  if (current < total - 2) pages.push("…")
  pages.push(total)
  return pages
}

export type MasterRow = {
  id: string
  kode: string
  nama: string
  keterangan?: string | null
  is_active: boolean
  [key: string]: unknown
}

type Column<T extends MasterRow> = {
  key: keyof T | string
  label: string
  render?: (row: T) => ReactNode
}

type Props<T extends MasterRow> = {
  data: T[]
  columns: Column<T>[]
  dialogTitle: string
  form: (row: T | null, onDone: () => void) => ReactNode
  onToggleAktif: (id: string, is_active: boolean) => Promise<{ ok: boolean; pesan?: string }>
  extraActions?: (row: T) => ReactNode
}

export function MasterTable<T extends MasterRow>({
  data, columns, dialogTitle, form, onToggleAktif, extraActions
}: Props<T>) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<T | null>(null)
  const [pending, startTransition] = useTransition()
  const [page, setPage] = useState(1)

  const totalPages = Math.ceil(data.length / PAGE_SIZE)
  const paged = data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function openCreate() { setSelected(null); setOpen(true) }
  function openEdit(row: T) { setSelected(row); setOpen(true) }
  function onDone() { setOpen(false) }

  function handleToggle(row: T) {
    startTransition(async () => {
      const result = await onToggleAktif(row.id, !row.is_active)
      if (!result.ok) toast.error(result.pesan ?? "Gagal mengubah status")
      else toast.success(row.is_active ? "Dinonaktifkan" : "Diaktifkan")
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Tambah
        </Button>
      </div>

      {data.length === 0 ? (
        <EmptyState />
      ) : (
        <Card className="overflow-hidden p-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  {columns.map((col) => (
                    <TableHead key={String(col.key)} className="text-muted-foreground text-xs">
                      {col.label}
                    </TableHead>
                  ))}
                  <TableHead className="text-muted-foreground text-xs text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((row) => (
                  <TableRow key={row.id} className="border-border/50 hover:bg-muted/20">
                    {columns.map((col) => (
                      <TableCell key={String(col.key)} className="text-sm text-foreground/70 py-3">
                        {col.render
                          ? col.render(row)
                          : col.key === "is_active"
                          ? <StatusBadge aktif={row.is_active} />
                          : String(row[col.key as keyof T] ?? "—")}
                      </TableCell>
                    ))}
                    <TableCell className="py-3">
                      <div className="flex justify-end gap-1">
                        {extraActions && extraActions(row)}
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => openEdit(row)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => handleToggle(row)}
                          disabled={pending}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        >
                          {pending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : row.is_active ? (
                            <ToggleRight className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <ToggleLeft className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{data.length} data · halaman {page} dari {totalPages}</span>
          <Pagination className="w-auto mx-0">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)) }}
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
                    <PaginationLink
                      href="#"
                      isActive={p === page}
                      onClick={(e) => { e.preventDefault(); setPage(p) }}
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(totalPages, p + 1)) }}
                  aria-disabled={page === totalPages}
                  className={page === totalPages ? "pointer-events-none opacity-40" : ""}
                  text="Berikutnya"
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected ? `Edit ${dialogTitle}` : `Tambah ${dialogTitle}`}</DialogTitle>
          </DialogHeader>
          {form(selected, onDone)}
        </DialogContent>
      </Dialog>
    </div>
  )
}
