"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { X, CheckCheck, Trash2, ChevronUpIcon, ChevronDownIcon, ChevronsUpDownIcon, Download } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { PenerimaanStatusBadge } from "@/components/penerimaan-status-badge"
import { EmptyState } from "@/components/empty-state"
import { toast } from "sonner"
import { bulkVerifyPenerimaan, bulkDeletePenerimaan, verifyAllDraft, exportPenerimaan, deleteAllPenerimaan } from "@/app/actions/penerimaan"

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)

type Row = {
  id: string
  nomor_bukti: string
  tanggal_terima: string
  jumlah: number
  status: string
  jenis: unknown
  unit: unknown
}

type SortKey = "tanggal_terima" | "jumlah" | "nomor_bukti"

function SortHead({ label, col, sort, order }: { label: string; col: SortKey; sort: SortKey; order: "asc" | "desc" }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleSort() {
    const params = new URLSearchParams(searchParams.toString())
    params.set("sort", col)
    params.set("order", sort === col && order === "desc" ? "asc" : "desc")
    params.delete("page")
    router.push(`?${params.toString()}`)
  }

  const active = sort === col
  return (
    <button onClick={handleSort} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors select-none">
      {label}
      {active
        ? order === "desc"
          ? <ChevronDownIcon className="h-3 w-3 opacity-70" />
          : <ChevronUpIcon className="h-3 w-3 opacity-70" />
        : <ChevronsUpDownIcon className="h-3 w-3 opacity-40" />
      }
    </button>
  )
}

export function PenerimaanTable({ data, isAdmin, sort, order, totalDraft, totalDeletable, filter }: {
  data: Row[]
  isAdmin: boolean
  sort: SortKey
  order: "asc" | "desc"
  totalDraft?: number
  totalDeletable?: number
  filter?: Record<string, string>
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pending, startTransition] = useTransition()

  const allIds = data.map((r) => r.id)
  const draftIds = data.filter((r) => r.status === "draft").map((r) => r.id)
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id))
  const selectedArray = Array.from(selected)
  const allSelectedAreDraft = selectedArray.length > 0 && selectedArray.every((id) => {
    const row = data.find((r) => r.id === id)
    return row?.status === "draft"
  })

  function toggleSelectAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(allIds))
    }
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function handleBulkVerify() {
    startTransition(async () => {
      const result = await bulkVerifyPenerimaan(draftIds.filter((id) => selected.has(id)))
      if (!result.ok) { toast.error(result.pesan); return }
      const { berhasil, gagal } = result.data
      if (gagal > 0) {
        toast.warning(`${berhasil} terverifikasi, ${gagal} gagal`)
      } else {
        toast.success(`${berhasil} transaksi berhasil diverifikasi`)
      }
      setSelected(new Set())
      router.refresh()
    })
  }

  async function handleDownload() {
    const statuses = (filter?.status ?? "").split(",").filter(Boolean)
    const jenisIds = (filter?.jenis_id ?? "").split(",").filter(Boolean)
    const result = await exportPenerimaan({
      statuses: statuses.length ? statuses : undefined,
      jenis_ids: jenisIds.length ? jenisIds : undefined,
      tgl_awal: filter?.tgl_awal,
      tgl_akhir: filter?.tgl_akhir,
      q: filter?.q,
      sort: sort,
      order: order,
    })
    if (!result.ok) { toast.error(result.pesan); return }
    const XLSX = await import("xlsx")
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(result.rows)
    ws["!cols"] = [14, 12, 20, 20, 20, 20, 18, 16, 16, 18, 24, 12, 12, 20].map((wch) => ({ wch }))
    XLSX.utils.book_append_sheet(wb, ws, "Penerimaan")
    const label = statuses.length === 1 ? `-${statuses[0]}` : ""
    XLSX.writeFile(wb, `penerimaan${label}-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  function handleVerifyAll() {
    if (!confirm(`Verifikasi semua ${totalDraft ?? "?"} draft sekaligus? Tindakan tidak bisa dibatalkan.`)) return
    startTransition(async () => {
      const result = await verifyAllDraft()
      if (!result.ok) { toast.error(result.pesan); return }
      toast.success(`${result.data.berhasil} transaksi berhasil diverifikasi`)
      setSelected(new Set())
      router.refresh()
    })
  }

  function handleDeleteAll() {
    const total = totalDeletable ?? 0
    if (total <= 0) {
      toast.info("Tidak ada transaksi draft atau terverifikasi untuk dihapus")
      return
    }

    const confirmation = window.prompt(
      `Tindakan ini akan menghapus permanen ${total} transaksi draft dan terverifikasi. Ketik HAPUS untuk melanjutkan.`
    )
    if (confirmation !== "HAPUS") return

    startTransition(async () => {
      const result = await deleteAllPenerimaan()
      if (!result.ok) { toast.error(result.pesan); return }
      toast.success(`${result.data.berhasil} transaksi berhasil dihapus`)
      setSelected(new Set())
      router.refresh()
    })
  }

  function handleBulkDelete() {
    if (!confirm(`Hapus ${selected.size} transaksi secara permanen? Tindakan tidak bisa dibatalkan.`)) return
    startTransition(async () => {
      const result = await bulkDeletePenerimaan(selectedArray)
      if (!result.ok) { toast.error(result.pesan); return }
      toast.success(`${result.data.berhasil} transaksi dihapus`)
      setSelected(new Set())
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownload}
          disabled={pending}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Download className="h-3.5 w-3.5" />
          Download Excel
        </Button>
        {isAdmin && totalDraft != null && totalDraft > 0 && (
          <Button
            variant="default"
            size="sm"
            onClick={handleVerifyAll}
            disabled={pending}
            className="gap-1.5"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            {pending ? "Memverifikasi..." : `Verifikasi Semua Draft (${totalDraft})`}
          </Button>
        )}
        {isAdmin && totalDeletable != null && totalDeletable > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteAll}
            disabled={pending}
            className="gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {pending ? "Menghapus..." : `Hapus Semua (${totalDeletable})`}
          </Button>
        )}
      </div>
      {data.length === 0 ? (
        <EmptyState message="Belum ada transaksi penerimaan" />
      ) : (
      <Card className="overflow-hidden p-0">
        <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              {isAdmin && (
                <TableHead className="w-10 pl-4">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleSelectAll}
                    className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                  />
                </TableHead>
              )}
              <TableHead className="text-xs"><SortHead label="Nomor Bukti" col="nomor_bukti" sort={sort} order={order} /></TableHead>
              <TableHead className="text-xs"><SortHead label="Tanggal" col="tanggal_terima" sort={sort} order={order} /></TableHead>
              <TableHead className="text-muted-foreground text-xs">Jenis</TableHead>
              <TableHead className="text-muted-foreground text-xs">Unit</TableHead>
              <TableHead className="text-xs text-right"><SortHead label="Jumlah" col="jumlah" sort={sort} order={order} /></TableHead>
              <TableHead className="text-muted-foreground text-xs">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => {
              const isChecked = selected.has(row.id)
              return (
                <TableRow
                  key={row.id}
                  className={`border-border/50 hover:bg-muted/20 cursor-pointer ${isChecked ? "bg-muted/40" : ""}`}
                >
                  {isAdmin && (
                    <TableCell className="pl-4 py-3 w-10">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleRow(row.id)}
                        className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                      />
                    </TableCell>
                  )}
                  <TableCell className="py-3">
                    <Link href={`/penerimaan/${row.id}`} className="text-sm font-mono text-primary hover:underline">
                      {row.nomor_bukti}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-foreground/60 py-3">
                    {format(new Date(row.tanggal_terima), "dd MMM yyyy", { locale: id })}
                  </TableCell>
                  <TableCell className="text-sm text-foreground/70 py-3">
                    {(row.jenis as { nama?: string } | null)?.nama ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-foreground/50 py-3">
                    {(row.unit as { kode?: string } | null)?.kode ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-foreground/80 py-3 text-right font-medium">
                    {rupiah(row.jumlah)}
                  </TableCell>
                  <TableCell className="py-3">
                    <PenerimaanStatusBadge status={row.status as "draft" | "verified" | "void"} />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        </CardContent>
      </Card>
      )}

      {/* Floating bulk action bar */}
      {selected.size > 0 && (
        <div className="sticky bottom-4 flex items-center gap-3 rounded-xl border border-border bg-background/95 backdrop-blur px-4 py-3 shadow-xl">
          <span className="text-sm text-foreground/60 flex-1">
            {selected.size} transaksi dipilih
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelected(new Set())}
            className="text-muted-foreground hover:text-foreground gap-1.5"
          >
            <X className="h-3.5 w-3.5" />
            Batalkan
          </Button>
          {allSelectedAreDraft && (
            <Button
              size="sm"
              onClick={handleBulkVerify}
              disabled={pending}
              className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {pending ? "Memverifikasi..." : `Verifikasi (${selected.size})`}
            </Button>
          )}
          <Button
            size="sm"
            variant="destructive"
            onClick={handleBulkDelete}
            disabled={pending}
            className="gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {pending ? "Menghapus..." : `Hapus (${selected.size})`}
          </Button>
        </div>
      )}
    </div>
  )
}
