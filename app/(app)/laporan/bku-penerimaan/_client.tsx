"use client"

import { useState, useTransition, useEffect, useRef } from "react"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import { FileText, Search, RotateCcw, Wallet, TrendingUp, ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Printer, CheckCircle2, Loader2 } from "lucide-react"
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
import { getBkuPenerimaan, getBkuPenerimaanAll, type BkuPenerimaanRow } from "@/app/actions/laporan"

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

type JenisOption = {
  id: string
  kode: string
  nama: string
  akun_pendapatan: string | null
}

// ─── PDF Progress Overlay ────────────────────────────────────────────────────

const PDF_STEPS = [
  { key: "fetch",   label: "Mengambil data transaksi",    pct: 30 },
  { key: "render",  label: "Merender dokumen PDF",         pct: 65 },
  { key: "compile", label: "Mengompilasi file PDF",        pct: 90 },
  { key: "done",    label: "Dokumen siap diunduh",         pct: 100 },
] as const

type PdfStepKey = (typeof PDF_STEPS)[number]["key"]

function PdfProgressOverlay({ step }: { step: PdfStepKey | null }) {
  const [displayed, setDisplayed] = useState(0)
  const target = PDF_STEPS.find((s) => s.key === step)?.pct ?? 0
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (target === 0) { setDisplayed(0); return }
    const animate = () => {
      setDisplayed((prev) => {
        if (prev >= target) return target
        const delta = Math.max(0.4, (target - prev) * 0.06)
        const next = Math.min(prev + delta, target)
        if (next < target) rafRef.current = requestAnimationFrame(animate)
        return next
      })
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target])

  if (!step) return null

  const isDone = step === "done"
  const currentStepIdx = PDF_STEPS.findIndex((s) => s.key === step)

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backdropFilter: "blur(6px)", backgroundColor: "rgba(0,0,0,0.55)" }}
    >
      <div
        className="relative w-[420px] max-w-[90vw] rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: "linear-gradient(145deg, #0f172a 0%, #1e293b 60%, #0f2027 100%)",
          border: "1px solid rgba(99,102,241,0.25)",
        }}
      >
        {/* Shimmer top border */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.8), rgba(168,85,247,0.8), transparent)",
          }}
        />

        <div className="px-7 pt-8 pb-7 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div
              className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
            >
              {isDone ? (
                <CheckCircle2 className="h-5 w-5 text-white" />
              ) : (
                <Printer className="h-5 w-5 text-white animate-pulse" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-tight">
                {isDone ? "PDF Berhasil Dibuat" : "Menyiapkan Dokumen PDF"}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                BKU Penerimaan
              </p>
            </div>
          </div>

          {/* Progress bar track */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-300 font-medium">
                {PDF_STEPS.find((s) => s.key === step)?.label}
              </span>
              <span
                className="text-xs font-bold tabular-nums"
                style={{ color: isDone ? "#34d399" : "#a5b4fc" }}
              >
                {Math.round(displayed)}%
              </span>
            </div>

            {/* Track */}
            <div
              className="relative h-2.5 w-full rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.07)" }}
            >
              {/* Glowing fill */}
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-none"
                style={{
                  width: `${displayed}%`,
                  background: isDone
                    ? "linear-gradient(90deg, #10b981, #34d399)"
                    : "linear-gradient(90deg, #6366f1, #8b5cf6, #a855f7)",
                  boxShadow: isDone
                    ? "0 0 12px rgba(52,211,153,0.7)"
                    : "0 0 14px rgba(139,92,246,0.75)",
                  transition: "width 0.05s linear",
                }}
              />
              {/* Animated shimmer */}
              {!isDone && (
                <div
                  className="absolute inset-y-0 rounded-full"
                  style={{
                    width: "40%",
                    left: `${Math.max(0, displayed - 20)}%`,
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)",
                    transition: "left 0.05s linear",
                  }}
                />
              )}
            </div>
          </div>

          {/* Step indicators */}
          <div className="flex items-center justify-between gap-1">
            {PDF_STEPS.map((s, i) => {
              const done = i <= currentStepIdx
              const active = i === currentStepIdx
              return (
                <div key={s.key} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300"
                    style={{
                      background: done
                        ? isDone
                          ? "linear-gradient(135deg, #10b981, #34d399)"
                          : "linear-gradient(135deg, #6366f1, #8b5cf6)"
                        : "rgba(255,255,255,0.08)",
                      border: active && !isDone ? "1.5px solid rgba(139,92,246,0.8)" : "none",
                      boxShadow: active && !isDone ? "0 0 8px rgba(139,92,246,0.6)" : "none",
                      color: done ? "white" : "rgba(255,255,255,0.35)",
                    }}
                  >
                    {done && !active ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : active && !isDone ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className="text-[9px] text-center leading-tight"
                    style={{ color: done ? "#94a3b8" : "rgba(255,255,255,0.2)" }}
                  >
                    {i === 0 ? "Fetch" : i === 1 ? "Render" : i === 2 ? "Compile" : "Selesai"}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
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
  unitList,
  jenisList
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
  jenisList: JenisOption[]
}) {
  const [isPending, startTransition] = useTransition()
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfStep, setPdfStep] = useState<PdfStepKey | null>(null)
  
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
    jenisId: "__all__",
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
        jenisId: filterState.jenisId !== "__all__" ? filterState.jenisId : undefined,
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
    const resetDraft = { tglAwal: defaultAwal, tglAkhir: defaultAkhir, rekeningId: "__all__", unitId: "__all__", jenisId: "__all__", limit: 25 }
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

  async function exportPDF() {
    setPdfLoading(true)
    setPdfStep("fetch")
    try {
      const namaRekening =
        draft.rekeningId !== "__all__"
          ? rekeningList.find((r) => r.id === draft.rekeningId)?.nama_bank +
            " – " +
            rekeningList.find((r) => r.id === draft.rekeningId)?.nama_rekening
          : "Konsolidasi Seluruh Rekening"
      const namaUnit =
        draft.unitId !== "__all__"
          ? unitList.find((u) => u.id === draft.unitId)?.nama
          : undefined

      // Step 1: Fetch data
      const allData = await getBkuPenerimaanAll({
        tglAwal: draft.tglAwal,
        tglAkhir: draft.tglAkhir,
        rekeningId: draft.rekeningId !== "__all__" ? draft.rekeningId : undefined,
        unitId: draft.unitId !== "__all__" ? draft.unitId : undefined,
        jenisId: draft.jenisId !== "__all__" ? draft.jenisId : undefined,
      })

      // Step 2: Load renderer + template
      setPdfStep("render")
      const { pdf } = await import("@react-pdf/renderer")
      const { BkuPenerimaanPDF } = await import("@/components/pdf/bku-penerimaan-pdf")
      const logoSrc = `${window.location.origin}/logo-uin-palopo.png`

      // Step 3: Compile PDF blob
      setPdfStep("compile")
      const blob = await pdf(
        <BkuPenerimaanPDF
          rows={allData.rows}
          saldoAwal={allData.saldoAwal}
          saldoAkhir={allData.saldoAkhir}
          totalPenerimaan={allData.totalPenerimaan}
          filter={{
            tglAwal: draft.tglAwal,
            tglAkhir: draft.tglAkhir,
            namaRekening,
            namaUnit,
          }}
          logoSrc={logoSrc}
        />
      ).toBlob()

      // Step 4: Done
      setPdfStep("done")
      await new Promise((r) => setTimeout(r, 900)) // brief "done" flash

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `bku-penerimaan-${draft.tglAwal}-sd-${draft.tglAkhir}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setPdfLoading(false)
      setPdfStep(null)
    }
  }

  return (
    <>
    <PdfProgressOverlay step={pdfStep} />
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-lg bg-primary/10 p-2">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">BKU Penerimaan</h1>
            <p className="text-xs text-muted-foreground">
              {draft.rekeningId === "__all__"
                ? "Buku Kas Umum Konsolidasi Seluruh Rekening"
                : "Buku Kas Umum Khusus Penerimaan"}
            </p>
          </div>
        </div>
        <Button
          id="bku-penerimaan-btn-pdf"
          variant="outline"
          size="sm"
          onClick={exportPDF}
          disabled={pdfLoading || isPending || data.totalRows === 0}
          className="h-8 text-xs gap-1.5"
        >
          <Printer className="h-3.5 w-3.5" />
          {pdfLoading ? "Menyiapkan PDF..." : "Cetak PDF"}
        </Button>
      </div>

      {/* ─── Filter Bar ─── */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
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

          {/* Akun Pendapatan */}
          <div className="space-y-1.5 lg:col-span-1">
            <Label htmlFor="jenis" className="text-xs">Akun Pendapatan</Label>
            <Select
              value={draft.jenisId}
              onValueChange={(v) => setDraft((d) => ({ ...d, jenisId: v ?? "__all__" }))}
            >
              <SelectTrigger id="jenis" className="h-8 text-xs w-full">
                {draft.jenisId === "__all__" || !jenisList.find((j) => j.id === draft.jenisId) ? (
                  <span className="text-muted-foreground">Semua Akun</span>
                ) : (
                  <span className="truncate">
                    {(() => {
                      const j = jenisList.find((j) => j.id === draft.jenisId)!
                      return j.akun_pendapatan ? `${j.akun_pendapatan} – ${j.nama}` : j.nama
                    })()}
                  </span>
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__" className="text-xs">Semua Akun</SelectItem>
                {jenisList.map((j) => (
                  <SelectItem key={j.id} value={j.id} className="text-xs">
                    {j.akun_pendapatan ? `${j.akun_pendapatan} – ${j.nama}` : j.nama}
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
                <TableHead className="w-[60px] text-center font-semibold">Nomor</TableHead>
                <TableHead className="min-w-[110px] font-semibold">Tanggal</TableHead>
                <TableHead className="min-w-[140px] font-semibold">No. Bukti</TableHead>
                <TableHead className="min-w-[90px] font-semibold">Kode Akun</TableHead>
                <TableHead className="min-w-[90px] font-semibold">Akun Pendapatan</TableHead>
                <TableHead className="min-w-[180px] font-semibold">Jenis Pendapatan</TableHead>
                <TableHead className="min-w-[160px] font-semibold">Kategori Pendapatan</TableHead>
                <TableHead className="text-right font-semibold">Penerimaan (Rp)</TableHead>
                <TableHead className="text-right font-semibold">Saldo (Rp)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Baris Saldo Awal */}
              <TableRow className="bg-muted/30">
                <TableCell colSpan={7} className="text-right text-muted-foreground font-medium">
                  SALDO AWAL {tglAwal ? format(new Date(tglAwal), "dd MMMM yyyy", { locale: idLocale }) : ""}
                </TableCell>
                <TableCell className="text-right font-semibold text-primary">
                  {rupiah(data.saldoAwal)}
                </TableCell>
              </TableRow>

              {data.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
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
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {row.kategori_kode ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {row.jenis_nama ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm max-w-[180px] truncate" title={row.kategori_nama ?? undefined}>
                      {row.kategori_nama ?? "—"}
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
                  <TableCell colSpan={6} className="text-right text-muted-foreground">
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
    </>
  )
}
