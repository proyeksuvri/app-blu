"use client"

import { useState, useTransition } from "react"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import {
  BookOpen, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  FileText, RotateCcw, Search, TrendingDown, TrendingUp, Wallet, ArrowUpDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getBukuKasUmum, getBukuKasUmumAll, type BukuKasUmumResult } from "@/app/actions/laporan"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n)

function buildPages(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | "…")[] = [1]
  if (current > 3) pages.push("…")
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++)
    pages.push(i)
  if (current < total - 2) pages.push("…")
  pages.push(total)
  return pages
}

// ─── Types ────────────────────────────────────────────────────────────────────

type RekeningOption = {
  id: string
  kode: string
  nama_bank: string
  nama_rekening: string
  nomor_rekening: string
}

type UnitOption = {
  id: string
  kode: string
  nama: string
}

type FilterState = {
  tglAwal: string
  tglAkhir: string
  rekeningId: string
  unitId: string
  limit: number
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: number
  icon: React.ElementType
  color: "blue" | "green" | "red" | "purple"
}) {
  const colorMap = {
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    red: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    purple: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  }
  const iconBg = {
    blue: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    green: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    red: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    purple: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  }
  return (
    <div className={`rounded-xl border border-border bg-card p-4 flex items-start gap-3 shadow-sm`}>
      <div className={`rounded-lg p-2.5 ${iconBg[color]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className={`text-sm font-semibold tabular-nums ${colorMap[color]}`}>
          {rupiah(value)}
        </p>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function BukuKasUmumClient({
  rekeningList,
  unitList,
  initialData,
  initialFilter,
}: {
  rekeningList: RekeningOption[]
  unitList: UnitOption[]
  initialData: BukuKasUmumResult
  initialFilter: { tglAwal: string; tglAkhir: string }
  isAdmin: boolean
}) {
  const [data, setData] = useState<BukuKasUmumResult>(initialData)
  const [isPending, startTransition] = useTransition()
  const [pdfLoading, setPdfLoading] = useState(false)

  const [filter, setFilter] = useState<FilterState>({
    tglAwal: initialFilter.tglAwal,
    tglAkhir: initialFilter.tglAkhir,
    rekeningId: "__all__",
    unitId: "__all__",
    limit: 50,
  })

  // Draft filter — user mengedit tapi belum submit
  const [draft, setDraft] = useState<FilterState>(filter)

  function fetchData(f: FilterState, page: number) {
    startTransition(async () => {
      const result = await getBukuKasUmum({
        tglAwal: f.tglAwal,
        tglAkhir: f.tglAkhir,
        rekeningId: f.rekeningId !== "__all__" ? f.rekeningId : undefined,
        unitId: f.unitId !== "__all__" ? f.unitId : undefined,
        page,
        limit: f.limit,
      })
      setData(result)
    })
  }

  function handleApply() {
    setFilter(draft)
    fetchData(draft, 1)
  }

  function handleReset() {
    const now = new Date()
    const tahun = now.getFullYear()
    const bulan = now.getMonth() + 1
    const tglAwal = `${tahun}-${String(bulan).padStart(2, "0")}-01`
    const tglAkhir = now.toISOString().split("T")[0]
    const reset: FilterState = { tglAwal, tglAkhir, rekeningId: "__all__", unitId: "__all__", limit: 50 }
    setDraft(reset)
    setFilter(reset)
    fetchData(reset, 1)
  }

  function handlePage(page: number) {
    fetchData(filter, page)
  }

  async function exportPDF() {
    setPdfLoading(true)
    try {
      const namaRekening = filter.rekeningId !== "__all__"
        ? rekeningList.find((r) => r.id === filter.rekeningId)?.nama_bank +
          " – " +
          rekeningList.find((r) => r.id === filter.rekeningId)?.nama_rekening
        : undefined
      const namaUnit = filter.unitId !== "__all__"
        ? unitList.find((u) => u.id === filter.unitId)?.nama
        : undefined

      const allData = await getBukuKasUmumAll({
        tglAwal: filter.tglAwal,
        tglAkhir: filter.tglAkhir,
        rekeningId: filter.rekeningId !== "__all__" ? filter.rekeningId : undefined,
        unitId: filter.unitId !== "__all__" ? filter.unitId : undefined,
      })

      const { pdf } = await import("@react-pdf/renderer")
      const { BukuKasUmumPDF } = await import("@/components/pdf/buku-kas-umum-pdf")

      const logoSrc = `${window.location.origin}/logo-uin-palopo.png`

      const blob = await pdf(
        <BukuKasUmumPDF
          data={allData}
          filter={{ tglAwal: filter.tglAwal, tglAkhir: filter.tglAkhir, namaRekening, namaUnit }}
          logoSrc={logoSrc}
        />
      ).toBlob()

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `buku-kas-umum-${filter.tglAwal}-sd-${filter.tglAkhir}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setPdfLoading(false)
    }
  }

  const totalPages = Math.ceil(data.totalRows / data.limit)
  const pages = buildPages(data.page, totalPages)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-lg bg-primary/10 p-2">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Buku Kas Umum</h1>
            <p className="text-xs text-muted-foreground">
              Rekap seluruh transaksi kas (penerimaan &amp; pengeluaran) dengan saldo berjalan
            </p>
          </div>
        </div>
        <Button
          id="bku-btn-pdf"
          variant="outline"
          size="sm"
          onClick={exportPDF}
          disabled={pdfLoading || isPending || data.totalRows === 0}
          className="h-8 text-xs gap-1.5"
        >
          <FileText className="h-3.5 w-3.5" />
          {pdfLoading ? "Menyiapkan PDF..." : "Cetak PDF"}
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          {/* Tanggal Awal */}
          <div className="space-y-1.5">
            <Label htmlFor="bku-tgl-awal" className="text-xs">Tanggal Awal</Label>
            <Input
              id="bku-tgl-awal"
              type="date"
              value={draft.tglAwal}
              onChange={(e) => setDraft((d) => ({ ...d, tglAwal: e.target.value }))}
              className="h-8 text-xs"
            />
          </div>

          {/* Tanggal Akhir */}
          <div className="space-y-1.5">
            <Label htmlFor="bku-tgl-akhir" className="text-xs">Tanggal Akhir</Label>
            <Input
              id="bku-tgl-akhir"
              type="date"
              value={draft.tglAkhir}
              onChange={(e) => setDraft((d) => ({ ...d, tglAkhir: e.target.value }))}
              className="h-8 text-xs"
            />
          </div>

          {/* Rekening Bank */}
          <div className="space-y-1.5">
            <Label htmlFor="bku-rekening" className="text-xs">Rekening Bank</Label>
            <Select
              value={draft.rekeningId}
              onValueChange={(v) => setDraft((d) => ({ ...d, rekeningId: v ?? "__all__" }))}
            >
              <SelectTrigger id="bku-rekening" className="h-8 text-xs w-full">
                {draft.rekeningId === "__all__" || !rekeningList.find((r) => r.id === draft.rekeningId) ? (
                  <span className="text-muted-foreground">Semua Rekening</span>
                ) : (
                  <span className="truncate">
                    {(() => {
                      const r = rekeningList.find((r) => r.id === draft.rekeningId)!
                      return `${r.nama_bank} – ${r.nama_rekening}`
                    })()}
                  </span>
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__" className="text-xs">Semua Rekening</SelectItem>
                {rekeningList.map((r) => (
                  <SelectItem key={r.id} value={r.id} className="text-xs">
                    {r.nama_bank} – {r.nama_rekening}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Unit Kerja */}
          <div className="space-y-1.5">
            <Label htmlFor="bku-unit" className="text-xs">Unit Kerja</Label>
            <Select
              value={draft.unitId}
              onValueChange={(v) => setDraft((d) => ({ ...d, unitId: v ?? "__all__" }))}
            >
              <SelectTrigger id="bku-unit" className="h-8 text-xs w-full">
                {draft.unitId === "__all__" || !unitList.find((u) => u.id === draft.unitId) ? (
                  <span className="text-muted-foreground">Semua Unit</span>
                ) : (
                  <span className="truncate">
                    {(() => {
                      const u = unitList.find((u) => u.id === draft.unitId)!
                      return `${u.kode} – ${u.nama}`
                    })()}
                  </span>
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__" className="text-xs">Semua Unit</SelectItem>
                {unitList.map((u) => (
                  <SelectItem key={u.id} value={u.id} className="text-xs">
                    {u.kode} – {u.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tombol Aksi */}
          <div className="flex gap-2">
            <Button
              id="bku-btn-apply"
              size="sm"
              onClick={handleApply}
              disabled={isPending}
              className="h-8 text-xs flex-1"
            >
              <Search className="h-3.5 w-3.5 mr-1.5" />
              {isPending ? "Memuat..." : "Tampilkan"}
            </Button>
            <Button
              id="bku-btn-reset"
              size="sm"
              variant="outline"
              onClick={handleReset}
              disabled={isPending}
              className="h-8 text-xs px-2.5"
              title="Reset filter"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          label="Saldo Awal"
          value={data.saldoAwal}
          icon={Wallet}
          color="blue"
        />
        <SummaryCard
          label="Total Penerimaan"
          value={data.totalPenerimaan}
          icon={TrendingUp}
          color="green"
        />
        <SummaryCard
          label="Total Pengeluaran"
          value={data.totalPengeluaran}
          icon={TrendingDown}
          color="red"
        />
        <SummaryCard
          label="Saldo Akhir"
          value={data.saldoAkhir}
          icon={ArrowUpDown}
          color="purple"
        />
      </div>

      {/* Tabel */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Table Header Info */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <p className="text-xs text-muted-foreground">
            {data.totalRows === 0
              ? "Tidak ada transaksi"
              : `Menampilkan ${(data.page - 1) * data.limit + 1}–${Math.min(data.page * data.limit, data.totalRows)} dari ${data.totalRows.toLocaleString("id-ID")} transaksi`}
          </p>
          {/* Limit selector */}
          <Select
            value={String(filter.limit)}
            onValueChange={(v) => {
              const newLimit = Number(v) as 25 | 50 | 100
              const newFilter = { ...filter, limit: newLimit }
              setFilter(newFilter)
              setDraft((d) => ({ ...d, limit: newLimit }))
              fetchData(newFilter, 1)
            }}
          >
            <SelectTrigger className="h-7 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25" className="text-xs">25 baris</SelectItem>
              <SelectItem value="50" className="text-xs">50 baris</SelectItem>
              <SelectItem value="100" className="text-xs">100 baris</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className={`overflow-x-auto transition-opacity ${isPending ? "opacity-50" : ""}`}>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                <TableHead className="w-10 text-center text-xs font-semibold">No</TableHead>
                <TableHead className="min-w-[90px] text-xs font-semibold">Tanggal</TableHead>
                <TableHead className="min-w-[110px] text-xs font-semibold">No. Bukti</TableHead>
                <TableHead className="min-w-[160px] text-xs font-semibold">Uraian</TableHead>
                <TableHead className="min-w-[120px] text-xs font-semibold">Rekening</TableHead>
                <TableHead className="min-w-[80px] text-xs font-semibold">Unit</TableHead>
                <TableHead className="min-w-[110px] text-right text-xs font-semibold text-emerald-600">Penerimaan</TableHead>
                <TableHead className="min-w-[110px] text-right text-xs font-semibold text-rose-600">Pengeluaran</TableHead>
                <TableHead className="min-w-[120px] text-right text-xs font-semibold">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Baris Saldo Awal */}
              {data.page === 1 && (
                <TableRow className="bg-blue-500/5 border-b border-blue-500/10">
                  <TableCell className="text-center text-xs text-muted-foreground">—</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {filter.tglAwal
                      ? format(new Date(filter.tglAwal + "T00:00:00"), "d MMM yyyy", { locale: idLocale })
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">—</TableCell>
                  <TableCell className="text-xs font-medium text-blue-600 dark:text-blue-400">
                    Saldo Awal
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">—</TableCell>
                  <TableCell className="text-xs text-muted-foreground">—</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">—</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">—</TableCell>
                  <TableCell className="text-right text-xs font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                    {rupiah(data.saldoAwal)}
                  </TableCell>
                </TableRow>
              )}

              {data.rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                    Tidak ada transaksi pada periode yang dipilih.
                  </TableCell>
                </TableRow>
              )}

              {data.rows.map((row) => (
                <TableRow
                  key={`${row.tipe}-${row.id}`}
                  className={`text-xs transition-colors hover:bg-muted/30 ${
                    row.tipe === "penerimaan"
                      ? "hover:bg-emerald-500/5"
                      : "hover:bg-rose-500/5"
                  }`}
                >
                  <TableCell className="text-center text-muted-foreground tabular-nums">
                    {row.no}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {format(new Date(row.tanggal + "T00:00:00"), "d MMM yyyy", { locale: idLocale })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[11px]">{row.nomor_bukti}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] h-4 px-1.5 border-0 font-medium ${
                          row.tipe === "penerimaan"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {row.tipe === "penerimaan" ? "Penerimaan" : "Pengeluaran"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-foreground/80"
                    title={row.jenis_nama ?? row.uraian}
                  >
                    {row.jenis_nama ?? row.uraian}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {row.rekening ? `${row.rekening.nama_bank}` : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {row.unit ? `${row.unit.nama}` : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {row.penerimaan > 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {rupiah(row.penerimaan)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {row.pengeluaran > 0 ? (
                      <span className="text-rose-600 dark:text-rose-400">
                        {rupiah(row.pengeluaran)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </TableCell>
                  <TableCell className={`text-right tabular-nums font-semibold ${
                    row.saldo >= 0 ? "text-foreground" : "text-rose-600 dark:text-rose-400"
                  }`}>
                    {rupiah(row.saldo)}
                  </TableCell>
                </TableRow>
              ))}

              {/* Baris Total */}
              {data.rows.length > 0 && (
                <TableRow className="bg-muted/40 border-t-2 border-border font-semibold text-xs">
                  <TableCell colSpan={6} className="text-right text-muted-foreground">
                    Total Periode
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                    {rupiah(data.totalPenerimaan)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-rose-600 dark:text-rose-400">
                    {rupiah(data.totalPengeluaran)}
                  </TableCell>
                  <TableCell className={`text-right tabular-nums ${
                    data.saldoAkhir >= 0 ? "text-violet-600 dark:text-violet-400" : "text-rose-600"
                  }`}>
                    {rupiah(data.saldoAkhir)}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginasi */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/10">
            <p className="text-xs text-muted-foreground">
              Halaman {data.page} dari {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <Button
                id="bku-page-first"
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => handlePage(1)}
                disabled={data.page <= 1 || isPending}
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                id="bku-page-prev"
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => handlePage(data.page - 1)}
                disabled={data.page <= 1 || isPending}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>

              {pages.map((p, i) =>
                p === "…" ? (
                  <span key={`ellipsis-${i}`} className="px-1.5 text-xs text-muted-foreground">
                    …
                  </span>
                ) : (
                  <Button
                    key={p}
                    id={`bku-page-${p}`}
                    variant={p === data.page ? "default" : "outline"}
                    size="icon"
                    className="h-7 w-7 text-xs"
                    onClick={() => handlePage(p as number)}
                    disabled={isPending}
                  >
                    {p}
                  </Button>
                )
              )}

              <Button
                id="bku-page-next"
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => handlePage(data.page + 1)}
                disabled={data.page >= totalPages || isPending}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button
                id="bku-page-last"
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => handlePage(totalPages)}
                disabled={data.page >= totalPages || isPending}
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
