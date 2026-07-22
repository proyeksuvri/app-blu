"use client"

import { useState, useTransition } from "react"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import { FileText, Search, RotateCcw, Wallet, TrendingUp, ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { getBkuPenerimaan, type BkuPenerimaanRow } from "@/app/actions/laporan"

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

// ─── Client Component ─────────────────────────────────────────────────────────

export function BkuPenerimaanClient({
  initialData,
  rekeningList,
  unitList
}: {
  initialData: {
    rows: BkuPenerimaanRow[]
    saldoAwal: number
    saldoAkhir: number
    totalPenerimaan: number
    totalRows: number
    page: number
    limit: number
  }
  rekeningList: RekeningOption[]
  unitList: UnitOption[]
}) {
  const [isPending, startTransition] = useTransition()
  
  const today = new Date()
  const defaultAwal = format(new Date(today.getFullYear(), today.getMonth(), 1), "yyyy-MM-dd")
  const defaultAkhir = format(new Date(today.getFullYear(), today.getMonth() + 1, 0), "yyyy-MM-dd")

  const [tglAwal, setTglAwal] = useState(defaultAwal)
  const [tglAkhir, setTglAkhir] = useState(defaultAkhir)
  
  // Draft filter
  const [draft, setDraft] = useState({ 
    tglAwal: defaultAwal, 
    tglAkhir: defaultAkhir,
    rekeningId: "__all__",
    unitId: "__all__",
    limit: initialData.limit
  })

  const [data, setData] = useState<{
    rows: BkuPenerimaanRow[]
    saldoAwal: number
    saldoAkhir: number
    totalPenerimaan: number
    totalRows: number
    page: number
    limit: number
  }>(initialData)

  const fetchData = (filterState: typeof draft, pageToFetch: number) => {
    startTransition(async () => {
      const res = await getBkuPenerimaan({
        tglAwal: filterState.tglAwal,
        tglAkhir: filterState.tglAkhir,
        rekeningId: filterState.rekeningId !== "__all__" ? filterState.rekeningId : undefined,
        unitId: filterState.unitId !== "__all__" ? filterState.unitId : undefined,
        page: pageToFetch,
        limit: filterState.limit
      })
      setData({
        rows: res.rows,
        saldoAwal: res.saldoAwal,
        saldoAkhir: res.saldoAkhir,
        totalPenerimaan: res.totalPenerimaan,
        totalRows: res.totalRows,
        page: res.page,
        limit: res.limit
      })
    })
  }

  const handleApply = () => {
    setTglAwal(draft.tglAwal)
    setTglAkhir(draft.tglAkhir)
    fetchData(draft, 1)
  }

  const handleReset = () => {
    const resetDraft = { tglAwal: defaultAwal, tglAkhir: defaultAkhir, rekeningId: "__all__", unitId: "__all__", limit: 50 }
    setDraft(resetDraft)
    setTglAwal(defaultAwal)
    setTglAkhir(defaultAkhir)
    fetchData(resetDraft, 1)
  }

  const handlePage = (p: number) => {
    fetchData(draft, p)
  }

  const totalPages = Math.ceil(data.totalRows / data.limit)
  const pages = buildPages(data.page, totalPages)

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-lg bg-primary/10 p-2">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">BKU Penerimaan</h1>
            <p className="text-xs text-muted-foreground">
              Buku Kas Umum Khusus Penerimaan
            </p>
          </div>
        </div>
      </div>

      {/* ─── Filter Bar ─── */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          {/* Tanggal Awal */}
          <div className="space-y-1.5 lg:col-span-1">
            <Label htmlFor="tglAwal" className="text-xs">Tanggal Awal</Label>
            <Input
              id="tglAwal"
              type="date"
              value={draft.tglAwal}
              onChange={(e) => setDraft((d) => ({ ...d, tglAwal: e.target.value }))}
              className="h-8 text-xs"
            />
          </div>
          
          {/* Tanggal Akhir */}
          <div className="space-y-1.5 lg:col-span-1">
            <Label htmlFor="tglAkhir" className="text-xs">Tanggal Akhir</Label>
            <Input
              id="tglAkhir"
              type="date"
              value={draft.tglAkhir}
              onChange={(e) => setDraft((d) => ({ ...d, tglAkhir: e.target.value }))}
              className="h-8 text-xs"
            />
          </div>

          {/* Rekening Bank */}
          <div className="space-y-1.5 lg:col-span-1">
            <Label htmlFor="rekening" className="text-xs">Rekening Bank</Label>
            <Select
              value={draft.rekeningId}
              onValueChange={(v) => setDraft((d) => ({ ...d, rekeningId: v ?? "__all__" }))}
            >
              <SelectTrigger id="rekening" className="h-8 text-xs w-full">
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
          <div className="space-y-1.5 lg:col-span-1">
            <Label htmlFor="unit" className="text-xs">Unit Kerja</Label>
            <Select
              value={draft.unitId}
              onValueChange={(v) => setDraft((d) => ({ ...d, unitId: v ?? "__all__" }))}
            >
              <SelectTrigger id="unit" className="h-8 text-xs w-full">
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
          <div className="flex gap-2 lg:col-span-1">
            <Button
              size="sm"
              onClick={handleApply}
              disabled={isPending}
              className="h-8 text-xs flex-1 text-black bg-white hover:bg-zinc-200"
            >
              <Search className="h-3.5 w-3.5 mr-1.5" />
              {isPending ? "Memuat..." : "Tampilkan"}
            </Button>
            <Button
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

      {/* ─── Summary Cards ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
          label="Saldo Akhir"
          value={data.saldoAkhir}
          icon={ArrowUpDown}
          color="purple"
        />
      </div>

      {/* ─── Table Data ─── */}
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[60px] text-center font-semibold">No</TableHead>
                <TableHead className="min-w-[120px] font-semibold">Tanggal</TableHead>
                <TableHead className="min-w-[150px] font-semibold">No. Bukti</TableHead>
                <TableHead className="min-w-[200px] font-semibold">Uraian</TableHead>
                <TableHead className="min-w-[200px] font-semibold">Akun Pendapatan</TableHead>
                <TableHead className="text-right font-semibold">Penerimaan (Rp)</TableHead>
                <TableHead className="text-right font-semibold">Saldo (Rp)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Baris Saldo Awal */}
              <TableRow className="bg-muted/30">
                <TableCell colSpan={6} className="text-right text-muted-foreground font-medium">
                  SALDO AWAL {tglAwal ? format(new Date(tglAwal), "dd MMMM yyyy", { locale: idLocale }) : ""}
                </TableCell>
                <TableCell className="text-right font-semibold text-primary">
                  {rupiah(data.saldoAwal)}
                </TableCell>
              </TableRow>

              {data.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    Tidak ada data penerimaan
                  </TableCell>
                </TableRow>
              ) : (
                data.rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-center">{row.no}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(row.tanggal), "dd MMM yyyy", { locale: idLocale })}
                    </TableCell>
                    <TableCell className="font-medium text-xs">{row.nomor_bukti}</TableCell>
                    <TableCell className="text-sm max-w-[300px] truncate" title={row.uraian}>
                      {row.uraian}
                    </TableCell>
                    <TableCell>
                      {row.jenis_kode ? `${row.jenis_kode} - ${row.jenis_nama}` : "-"}
                    </TableCell>
                    <TableCell className="text-right text-emerald-600 font-medium">
                      {rupiah(row.penerimaan)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {rupiah(row.saldo)}
                    </TableCell>
                  </TableRow>
                ))
              )}

              {/* Baris Total */}
              {data.rows.length > 0 && (
                <TableRow className="bg-muted/40 border-t-2 border-border font-semibold text-xs">
                  <TableCell colSpan={5} className="text-right text-muted-foreground">
                    Total Periode
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                    {rupiah(data.totalPenerimaan)}
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
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => handlePage(1)}
                disabled={data.page <= 1 || isPending}
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
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
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => handlePage(data.page + 1)}
                disabled={data.page >= totalPages || isPending}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button
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
