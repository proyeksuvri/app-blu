"use client"

import { useState, useTransition, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Download, Printer, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { EmptyState } from "@/components/empty-state"
import {
  rekapPosisiRekening,
  rekapPosisiKasBulanan,
  type PosisiRekeningRow,
  type PosisiKasBulananResult,
} from "@/app/actions/laporan"

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)

const BULAN_NAMA = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]

// ─── PDF Progress Overlay ────────────────────────────────────────────────────

const PDF_STEPS = [
  { key: "render",  label: "Merender dokumen PDF",   pct: 60 },
  { key: "compile", label: "Mengompilasi file PDF",   pct: 90 },
  { key: "done",    label: "Dokumen siap diunduh",    pct: 100 },
] as const

type PdfStepKey = (typeof PDF_STEPS)[number]["key"]

function PdfProgressOverlay({ step, title }: { step: PdfStepKey | null; title: string }) {
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
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.8), rgba(168,85,247,0.8), transparent)" }}
        />
        <div className="px-7 pt-8 pb-7 space-y-6">
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
              <p className="text-xs text-slate-400 mt-0.5">{title}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-300 font-medium">
                {PDF_STEPS.find((s) => s.key === step)?.label}
              </span>
              <span className="text-xs font-bold tabular-nums" style={{ color: isDone ? "#34d399" : "#a5b4fc" }}>
                {Math.round(displayed)}%
              </span>
            </div>
            <div className="relative h-2.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${displayed}%`,
                  background: isDone ? "linear-gradient(90deg, #10b981, #34d399)" : "linear-gradient(90deg, #6366f1, #8b5cf6, #a855f7)",
                  boxShadow: isDone ? "0 0 12px rgba(52,211,153,0.7)" : "0 0 14px rgba(139,92,246,0.75)",
                  transition: "width 0.05s linear",
                }}
              />
            </div>
          </div>

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
                        ? isDone ? "linear-gradient(135deg, #10b981, #34d399)" : "linear-gradient(135deg, #6366f1, #8b5cf6)"
                        : "rgba(255,255,255,0.08)",
                      border: active && !isDone ? "1.5px solid rgba(139,92,246,0.8)" : "none",
                      boxShadow: active && !isDone ? "0 0 8px rgba(139,92,246,0.6)" : "none",
                      color: done ? "white" : "rgba(255,255,255,0.35)",
                    }}
                  >
                    {done && !active ? <CheckCircle2 className="h-3 w-3" /> : active && !isDone ? <Loader2 className="h-3 w-3 animate-spin" /> : i + 1}
                  </div>
                  <span className="text-[9px] text-center" style={{ color: done ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)" }}>
                    {s.label.split(" ")[0]}
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

// ─── Main Client Component ───────────────────────────────────────────────────

type RekeningOption = {
  id: string
  nama_bank: string
  nama_rekening: string
  nomor_rekening: string
}

export function PosisiRekeningClient({
  defaultTab = "per-rekening",
  initialDataPerRekening,
  initialDataBulanan,
  rekeningList,
  initialTahun,
  initialBulan,
  initialRekeningId = "__ALL__",
}: {
  defaultTab?: "per-rekening" | "bulanan"
  initialDataPerRekening: PosisiRekeningRow[]
  initialDataBulanan: PosisiKasBulananResult | null
  rekeningList: RekeningOption[]
  initialTahun: number
  initialBulan: number | null
  initialRekeningId?: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<string>(defaultTab)

  // State Tab 1: Per Rekening
  const [dataPerRekening, setDataPerRekening] = useState<PosisiRekeningRow[]>(initialDataPerRekening)
  const [tahunPerRekening, setTahunPerRekening] = useState<number>(initialTahun)
  const [bulanPerRekening, setBulanPerRekening] = useState<number | null>(initialBulan)

  // State Tab 2: Bulanan
  const [dataBulanan, setDataBulanan] = useState<PosisiKasBulananResult | null>(initialDataBulanan)
  const [tahunBulanan, setTahunBulanan] = useState<number>(initialTahun)
  const [rekeningIdBulanan, setRekeningIdBulanan] = useState<string>(initialRekeningId)

  // State PDF
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfStep, setPdfStep] = useState<PdfStepKey | null>(null)
  const [pdfTitle, setPdfTitle] = useState<string>("Posisi Rekening")

  const tahunList = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i)

  // ─── Handlers Tab 1 (Per Rekening) ──────────────────────────────────────────

  function handleTahunPerRekening(thn: number) {
    setTahunPerRekening(thn)
    startTransition(async () => {
      const result = await rekapPosisiRekening(thn, bulanPerRekening)
      setDataPerRekening(result)
    })
    const params = new URLSearchParams({ tab: "per-rekening", tahun: String(thn) })
    if (bulanPerRekening !== null) params.set("bulan", String(bulanPerRekening))
    router.push(`/laporan/posisi-rekening?${params.toString()}`)
  }

  function handleBulanPerRekening(val: string) {
    const bln = val === "all" ? null : parseInt(val)
    setBulanPerRekening(bln)
    startTransition(async () => {
      const result = await rekapPosisiRekening(tahunPerRekening, bln)
      setDataPerRekening(result)
    })
    const params = new URLSearchParams({ tab: "per-rekening", tahun: String(tahunPerRekening) })
    if (bln !== null) params.set("bulan", String(bln))
    router.push(`/laporan/posisi-rekening?${params.toString()}`)
  }

  async function exportExcelPerRekening() {
    if (dataPerRekening.length === 0) return
    const XLSX = await import("xlsx")

    const labelPeriode = bulanPerRekening !== null
      ? `${BULAN_NAMA[bulanPerRekening - 1]} ${tahunPerRekening}`
      : `Tahun ${tahunPerRekening}`

    const rows = dataPerRekening.map((r) => ({
      "Nama Bank": r.namaBank,
      "No. Rekening": r.nomorRekening,
      "Nama Rekening": r.namaRekening,
      "Saldo Awal": r.saldoAwal,
      "Pemasukan (Kredit)": r.totalPenerimaan,
      "Pengeluaran (Debit)": r.totalPengeluaran,
      "Saldo Akhir": r.saldoAkhir,
    }))

    rows.push({
      "Nama Bank": "TOTAL",
      "No. Rekening": "",
      "Nama Rekening": "",
      "Saldo Awal": dataPerRekening.reduce((s, r) => s + r.saldoAwal, 0),
      "Pemasukan (Kredit)": dataPerRekening.reduce((s, r) => s + r.totalPenerimaan, 0),
      "Pengeluaran (Debit)": dataPerRekening.reduce((s, r) => s + r.totalPengeluaran, 0),
      "Saldo Akhir": dataPerRekening.reduce((s, r) => s + r.saldoAkhir, 0),
    })

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Posisi Rekening")
    XLSX.writeFile(wb, `posisi-rekening-${labelPeriode.replace(/\s+/g, "-")}.xlsx`)
  }

  async function exportPDFPerRekening() {
    if (dataPerRekening.length === 0) return
    setPdfTitle("Posisi Rekening")
    setPdfLoading(true)
    setPdfStep("render")
    try {
      const { pdf } = await import("@react-pdf/renderer")
      const { PosisiRekeningPDF } = await import("@/components/pdf/posisi-rekening-pdf")

      setPdfStep("compile")
      const blob = await pdf(
        <PosisiRekeningPDF rows={dataPerRekening} tahun={tahunPerRekening} bulan={bulanPerRekening} />
      ).toBlob()

      setPdfStep("done")
      await new Promise((r) => setTimeout(r, 900))

      const labelPeriode = bulanPerRekening !== null ? `${BULAN_NAMA[bulanPerRekening - 1]}-${tahunPerRekening}` : `tahun-${tahunPerRekening}`
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `posisi-rekening-${labelPeriode}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setPdfLoading(false)
      setPdfStep(null)
    }
  }

  // ─── Handlers Tab 2 (Bulanan) ───────────────────────────────────────────────

  function handleTahunBulanan(thn: number) {
    setTahunBulanan(thn)
    startTransition(async () => {
      const result = await rekapPosisiKasBulanan(thn, rekeningIdBulanan)
      setDataBulanan(result)
    })
    const params = new URLSearchParams({ tab: "bulanan", tahun: String(thn) })
    if (rekeningIdBulanan !== "__ALL__") params.set("rekening_id", rekeningIdBulanan)
    router.push(`/laporan/posisi-rekening?${params.toString()}`)
  }

  function handleRekeningBulanan(rid: string) {
    setRekeningIdBulanan(rid)
    startTransition(async () => {
      const result = await rekapPosisiKasBulanan(tahunBulanan, rid)
      setDataBulanan(result)
    })
    const params = new URLSearchParams({ tab: "bulanan", tahun: String(tahunBulanan) })
    if (rid !== "__ALL__") params.set("rekening_id", rid)
    router.push(`/laporan/posisi-rekening?${params.toString()}`)
  }

  async function exportExcelBulanan() {
    if (!dataBulanan || dataBulanan.rows.length === 0) return
    const XLSX = await import("xlsx")

    const rows = dataBulanan.rows.map((r) => ({
      "Bulan": r.namaBulan,
      "Saldo Awal": r.saldoAwal,
      "Pemasukan (Kredit)": r.pemasukan,
      "Pengeluaran (Debit)": r.pengeluaran,
      "Saldo Akhir": r.saldoAkhir,
    }))

    rows.push({
      "Bulan": "TOTAL",
      "Saldo Awal": dataBulanan.saldoAwalTahun,
      "Pemasukan (Kredit)": dataBulanan.totalPemasukan,
      "Pengeluaran (Debit)": dataBulanan.totalPengeluaran,
      "Saldo Akhir": dataBulanan.saldoAkhirTahun,
    })

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Posisi Kas Bulanan")
    const cleanBank = dataBulanan.namaBank.replace(/[^a-zA-Z0-9]/g, "-")
    XLSX.writeFile(wb, `posisi-kas-bulanan-${cleanBank}-${dataBulanan.tahun}.xlsx`)
  }

  async function exportPDFBulanan() {
    if (!dataBulanan || dataBulanan.rows.length === 0) return
    setPdfTitle("Posisi Kas Bulanan")
    setPdfLoading(true)
    setPdfStep("render")
    try {
      const { pdf } = await import("@react-pdf/renderer")
      const { PosisiRekeningBulananPDF } = await import("@/components/pdf/posisi-rekening-bulanan-pdf")

      setPdfStep("compile")
      const blob = await pdf(
        <PosisiRekeningBulananPDF data={dataBulanan} />
      ).toBlob()

      setPdfStep("done")
      await new Promise((r) => setTimeout(r, 900))

      const cleanBank = dataBulanan.namaBank.replace(/[^a-zA-Z0-9]/g, "-")
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `posisi-kas-bulanan-${cleanBank}-${dataBulanan.tahun}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setPdfLoading(false)
      setPdfStep(null)
    }
  }

  function handleTabChange(tab: string) {
    setActiveTab(tab)
    if (tab === "bulanan" && !dataBulanan) {
      startTransition(async () => {
        const result = await rekapPosisiKasBulanan(tahunBulanan, rekeningIdBulanan)
        setDataBulanan(result)
      })
    } else if (tab === "per-rekening" && dataPerRekening.length === 0) {
      startTransition(async () => {
        const result = await rekapPosisiRekening(tahunPerRekening, bulanPerRekening)
        setDataPerRekening(result)
      })
    }
  }

  // ─── Computed Totals Tab 1 ──────────────────────────────────────────────────

  const totalSaldoAwal1 = dataPerRekening.reduce((s, r) => s + r.saldoAwal, 0)
  const totalPenerimaan1 = dataPerRekening.reduce((s, r) => s + r.totalPenerimaan, 0)
  const totalPengeluaran1 = dataPerRekening.reduce((s, r) => s + r.totalPengeluaran, 0)
  const totalSaldoAkhir1 = dataPerRekening.reduce((s, r) => s + r.saldoAkhir, 0)

  const labelPeriode1 = bulanPerRekening !== null
    ? `${BULAN_NAMA[bulanPerRekening - 1]} ${tahunPerRekening}`
    : `Tahun ${tahunPerRekening}`

  return (
    <>
      <PdfProgressOverlay step={pdfStep} title={pdfTitle} />

      <div className="flex flex-col gap-5">
        {/* Sub Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => v && handleTabChange(v)}>
          <TabsList variant="line" className="border-b border-border w-full justify-start gap-4">
            <TabsTrigger value="per-rekening" className="text-sm font-medium py-2">
              Posisi Per Rekening
            </TabsTrigger>
            <TabsTrigger value="bulanan" className="text-sm font-medium py-2">
              Posisi Kas Bulanan
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════════════════════════════════════════════════════════════
              TAB 1: POSISI PER REKENING
             ═══════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="per-rekening" className="flex flex-col gap-4 mt-4">
            {/* Controls */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                {/* Filter Tahun */}
                <Select value={String(tahunPerRekening)} onValueChange={(v) => v && handleTahunPerRekening(parseInt(v))} disabled={pending}>
                  <SelectTrigger className="w-28 bg-muted/50 border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tahunList.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Filter Bulan */}
                <Select value={bulanPerRekening !== null ? String(bulanPerRekening) : "all"} onValueChange={(v) => v && handleBulanPerRekening(v)} disabled={pending}>
                  <SelectTrigger className="w-40 bg-muted/50 border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Bulan</SelectItem>
                    {BULAN_NAMA.map((nama, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{nama}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportPDFPerRekening}
                  disabled={dataPerRekening.length === 0 || pdfLoading || pending}
                  className="h-8 text-xs gap-1.5"
                >
                  <Printer className="h-3.5 w-3.5" />
                  {pdfLoading && pdfTitle === "Posisi Rekening" ? "Menyiapkan PDF..." : "Cetak PDF"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={exportExcelPerRekening}
                  disabled={dataPerRekening.length === 0 || pending}
                  className="gap-1.5 text-foreground/50 hover:text-foreground"
                >
                  <Download className="h-4 w-4" />Excel
                </Button>
              </div>
            </div>

            {/* Label periode */}
            <p className="text-xs text-muted-foreground">
              Posisi rekening per <span className="font-medium text-foreground">{labelPeriode1}</span>
              {" · "}Saldo Awal mengacu pada 1 Januari {tahunPerRekening}
            </p>

            {/* Tabel Per Rekening */}
            {dataPerRekening.length === 0 ? (
              <EmptyState message="Tidak ada data rekening aktif untuk periode ini" />
            ) : (
              <div className="rounded-xl border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground text-xs">Nama Bank</TableHead>
                      <TableHead className="text-muted-foreground text-xs">No. Rekening</TableHead>
                      <TableHead className="text-muted-foreground text-xs">Nama Rekening</TableHead>
                      <TableHead className="text-muted-foreground text-xs text-right">Saldo Awal</TableHead>
                      <TableHead className="text-muted-foreground text-xs text-right">Pemasukan (Kredit)</TableHead>
                      <TableHead className="text-muted-foreground text-xs text-right">Pengeluaran (Debit)</TableHead>
                      <TableHead className="text-muted-foreground text-xs text-right">Saldo Akhir</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dataPerRekening.map((row) => (
                      <TableRow key={row.rekeningId} className="border-border/50">
                        <TableCell className="text-sm font-medium text-foreground py-2.5">{row.namaBank}</TableCell>
                        <TableCell className="text-sm text-foreground/70 py-2.5 font-mono text-xs">{row.nomorRekening}</TableCell>
                        <TableCell className="text-sm text-foreground/70 py-2.5">{row.namaRekening}</TableCell>
                        <TableCell className="text-sm text-foreground/70 py-2.5 text-right">{rupiah(row.saldoAwal)}</TableCell>
                        <TableCell className={`text-sm py-2.5 text-right ${row.totalPenerimaan > 0 ? "text-emerald-500" : "text-foreground/30"}`}>
                          {row.totalPenerimaan > 0 ? rupiah(row.totalPenerimaan) : "—"}
                        </TableCell>
                        <TableCell className={`text-sm py-2.5 text-right ${row.totalPengeluaran > 0 ? "text-rose-500" : "text-foreground/30"}`}>
                          {row.totalPengeluaran > 0 ? rupiah(row.totalPengeluaran) : "—"}
                        </TableCell>
                        <TableCell className="text-sm font-semibold text-foreground py-2.5 text-right">{rupiah(row.saldoAkhir)}</TableCell>
                      </TableRow>
                    ))}

                    {/* Baris Total */}
                    <TableRow className="border-t-2 border-border bg-muted/30">
                      <TableCell colSpan={3} className="text-xs font-semibold text-foreground/70 py-3">TOTAL</TableCell>
                      <TableCell className="text-sm font-bold text-foreground/80 py-3 text-right">{rupiah(totalSaldoAwal1)}</TableCell>
                      <TableCell className="text-sm font-bold text-emerald-500 py-3 text-right">{rupiah(totalPenerimaan1)}</TableCell>
                      <TableCell className="text-sm font-bold text-rose-500 py-3 text-right">{rupiah(totalPengeluaran1)}</TableCell>
                      <TableCell className="text-base font-bold text-foreground py-3 text-right">{rupiah(totalSaldoAkhir1)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════════════
              TAB 2: POSISI KAS BULANAN (MUTASI 12 BULAN)
             ═══════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="bulanan" className="flex flex-col gap-4 mt-4">
            {/* Controls */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                {/* Filter Rekening */}
                <Select value={rekeningIdBulanan} onValueChange={(v) => v && handleRekeningBulanan(v)} disabled={pending}>
                  <SelectTrigger className="w-64 bg-muted/50 border-border text-foreground">
                    <SelectValue placeholder="Pilih Rekening..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ALL__">Semua Bank (Konsolidasi)</SelectItem>
                    {rekeningList.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.nama_bank} — {r.nomor_rekening}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Filter Tahun */}
                <Select value={String(tahunBulanan)} onValueChange={(v) => v && handleTahunBulanan(parseInt(v))} disabled={pending}>
                  <SelectTrigger className="w-28 bg-muted/50 border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tahunList.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportPDFBulanan}
                  disabled={!dataBulanan || dataBulanan.rows.length === 0 || pdfLoading || pending}
                  className="h-8 text-xs gap-1.5"
                >
                  <Printer className="h-3.5 w-3.5" />
                  {pdfLoading && pdfTitle === "Posisi Kas Bulanan" ? "Menyiapkan PDF..." : "Cetak PDF"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={exportExcelBulanan}
                  disabled={!dataBulanan || dataBulanan.rows.length === 0 || pending}
                  className="gap-1.5 text-foreground/50 hover:text-foreground"
                >
                  <Download className="h-4 w-4" />Excel
                </Button>
              </div>
            </div>

            {/* Info Rekening & Periode */}
            {dataBulanan && (
              <div className="flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
                <p>
                  Mutasi kas 12 bulan <span className="font-medium text-foreground">Tahun {dataBulanan.tahun}</span>
                  {" · "}<span className="font-medium text-foreground">{dataBulanan.namaBank}</span>
                  {dataBulanan.nomorRekening !== "—" && ` (${dataBulanan.nomorRekening})`}
                </p>
                <p className="text-muted-foreground/80">Saldo awal mengacu pada 1 Januari {dataBulanan.tahun}</p>
              </div>
            )}

            {/* Kartu Ringkasan Tab Bulanan */}
            {dataBulanan && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Saldo Awal", value: dataBulanan.saldoAwalTahun, note: `Per 1 Jan ${dataBulanan.tahun}` },
                  { label: "Total Pemasukan", value: dataBulanan.totalPemasukan, note: "Kredit 1 tahun", positive: true },
                  { label: "Total Pengeluaran", value: dataBulanan.totalPengeluaran, note: "Debit 1 tahun", negative: true },
                  { label: "Saldo Akhir", value: dataBulanan.saldoAkhirTahun, note: `Per 31 Des ${dataBulanan.tahun}`, bold: true },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-border p-4 flex flex-col gap-1">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className={`text-sm font-semibold ${item.bold ? "text-foreground" : item.positive ? "text-emerald-500" : item.negative ? "text-rose-500" : "text-foreground/80"}`}>
                      {rupiah(item.value)}
                    </p>
                    <p className="text-xs text-muted-foreground/60">{item.note}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Tabel 12 Bulan Sesuai Referensi */}
            {!dataBulanan || dataBulanan.rows.length === 0 ? (
              <EmptyState message="Tidak ada data mutasi kas untuk periode ini" />
            ) : (
              <div className="rounded-xl border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground text-xs w-36">Bulan</TableHead>
                      <TableHead className="text-muted-foreground text-xs text-right">Saldo Awal</TableHead>
                      <TableHead className="text-muted-foreground text-xs text-right">Pemasukan (Kredit)</TableHead>
                      <TableHead className="text-muted-foreground text-xs text-right">Pengeluaran (Debit)</TableHead>
                      <TableHead className="text-muted-foreground text-xs text-right">Saldo Akhir</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dataBulanan.rows.map((row) => (
                      <TableRow key={row.bulan} className="border-border/50">
                        <TableCell className="text-sm font-medium text-foreground py-2.5">{row.namaBulan}</TableCell>
                        <TableCell className="text-sm text-foreground/70 py-2.5 text-right">{rupiah(row.saldoAwal)}</TableCell>
                        <TableCell className={`text-sm py-2.5 text-right ${row.pemasukan > 0 ? "text-emerald-500 font-medium" : "text-foreground/30"}`}>
                          {row.pemasukan > 0 ? rupiah(row.pemasukan) : "—"}
                        </TableCell>
                        <TableCell className={`text-sm py-2.5 text-right ${row.pengeluaran > 0 ? "text-rose-500 font-medium" : "text-foreground/30"}`}>
                          {row.pengeluaran > 0 ? rupiah(row.pengeluaran) : "—"}
                        </TableCell>
                        <TableCell className="text-sm font-semibold text-foreground py-2.5 text-right">{rupiah(row.saldoAkhir)}</TableCell>
                      </TableRow>
                    ))}

                    {/* Baris Total (Sesuai Referensi Gambar) */}
                    <TableRow className="border-t-2 border-border bg-muted/30">
                      <TableCell className="text-xs font-semibold text-foreground/70 py-3">TOTAL</TableCell>
                      <TableCell className="text-sm font-bold text-foreground/80 py-3 text-right">{rupiah(dataBulanan.saldoAwalTahun)}</TableCell>
                      <TableCell className="text-sm font-bold text-emerald-500 py-3 text-right">{rupiah(dataBulanan.totalPemasukan)}</TableCell>
                      <TableCell className="text-sm font-bold text-rose-500 py-3 text-right">{rupiah(dataBulanan.totalPengeluaran)}</TableCell>
                      <TableCell className="text-base font-bold text-foreground py-3 text-right">{rupiah(dataBulanan.saldoAkhirTahun)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
