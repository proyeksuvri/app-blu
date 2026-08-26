import { useMemo, useState } from "react"
import { Download, Search, TrendingUp, TrendingDown, FileSpreadsheet, CheckCircle2, Printer, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"

// ─── Types ────────────────────────────────────────────────────────────────────

export type SheetRow = Record<string, unknown>

interface RealisasiTableProps {
  rows: SheetRow[]
  headers?: string[]
  /** Judul banner dari sheet (e.g. REALISASI PENGESAHAN 24 AGUSTUS 2026) */
  sheetTitle?: string
  /** Nama konfigurasi/sumber */
  title?: string
  hideExport?: boolean
  exportFileName?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cleanKey(k: string): string {
  return k.toLowerCase().replace(/[^a-z0-9%]/g, "")
}

function isNoHeader(h: string): boolean {
  const c = cleanKey(h)
  return ["no", "nomor", "num", "#", "kode"].includes(c)
}

function isUraianHeader(h: string): boolean {
  const c = cleanKey(h)
  return c.includes("uraian") || c.includes("nama") || c.includes("keterangan") || c.includes("deskripsi") || c.includes("akun")
}

function isPctHeader(h: string): boolean {
  const c = cleanKey(h)
  return c.includes("%") || c.includes("pct") || c.includes("persen") || c.includes("persentase")
}

function isDeviasiHeader(h: string): boolean {
  const c = cleanKey(h)
  return c.includes("deviasi") || c.includes("selisih") || c.includes("beda")
}

function isNumericHeader(h: string): boolean {
  const c = cleanKey(h)
  if (isNoHeader(h) || isUraianHeader(h)) return false
  return (
    c.includes("proyeksi") ||
    c.includes("realisasi") ||
    c.includes("deviasi") ||
    c.includes("jumlah") ||
    c.includes("nominal") ||
    c.includes("anggaran") ||
    c.includes("pagu") ||
    c.includes("target") ||
    c.includes("sisa") ||
    c.includes("saldo") ||
    c.includes("kredit") ||
    c.includes("debet") ||
    c.includes("nilai") ||
    c.includes("amount")
  )
}

function parseNumeric(val: unknown): { num: number; isDash: boolean } {
  if (val === null || val === undefined) return { num: 0, isDash: true }
  if (typeof val === "number") {
    if (isNaN(val)) return { num: 0, isDash: true }
    return { num: val, isDash: false }
  }

  const s = String(val).trim()
  if (!s || s === "-" || s === "—" || s === "–" || s === "0" || s === "0.00") {
    return { num: 0, isDash: true }
  }

  // Format Indonesia / International
  let cleaned = s.replace(/[^\d.,-]/g, "")
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".")
  } else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(cleaned)) {
    cleaned = cleaned.replace(/,/g, "")
  }

  const n = parseFloat(cleaned)
  return { num: isNaN(n) ? 0 : n, isDash: isNaN(n) }
}

function formatRupiah(num: number): string {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

function formatPercentage(val: unknown): { text: string; num: number; isDash: boolean } {
  if (val === null || val === undefined) return { text: "—", num: 0, isDash: true }
  const s = String(val).trim()
  if (!s || s === "-" || s === "—" || s === "–") return { text: "—", num: 0, isDash: true }

  // Jika string sudah ada format persen (e.g. "-20.89%")
  if (typeof val === "string" && s.endsWith("%")) {
    const rawNum = parseNumeric(s.replace("%", "")).num
    return { text: s, num: rawNum, isDash: false }
  }

  const { num, isDash } = parseNumeric(val)
  if (isDash || num === 0) return { text: "—", num: 0, isDash: true }

  // Excel stores 20.89% as 0.2089 or -100% as -1.0
  let pctVal = num
  if (Math.abs(num) <= 1.0 && num !== 0) {
    pctVal = num * 100
  }

  const formatted = `${pctVal.toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`

  return { text: formatted, num: pctVal, isDash: false }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RealisasiTable({
  rows,
  headers: customHeaders,
  sheetTitle,
  title,
  hideExport = false,
  exportFileName = "realisasi-pengesahan.xlsx",
}: RealisasiTableProps) {
  const [search, setSearch] = useState("")

  // Kumpulkan header
  const headers = useMemo<string[]>(() => {
    if (customHeaders && customHeaders.length > 0) return customHeaders
    const seen = new Set<string>()
    const result: string[] = []
    for (const row of rows) {
      for (const key of Object.keys(row)) {
        if (!seen.has(key)) {
          seen.add(key)
          result.push(key)
        }
      }
    }
    return result
  }, [rows, customHeaders])

  // Metadata kolom
  const colMeta = useMemo(() => {
    return headers.map((h) => {
      const isNo      = isNoHeader(h)
      const isUraian  = isUraianHeader(h)
      const isPct     = isPctHeader(h)
      const isDeviasi = isDeviasiHeader(h)
      const isNumeric = !isNo && !isUraian && (isNumericHeader(h) || !isPct)

      return {
        key: h,
        label: h,
        isNo,
        isUraian,
        isPct,
        isDeviasi,
        isNumeric: !isNo && !isUraian && isNumeric,
        isRight: isPct || isNumeric,
      }
    })
  }, [headers])

  // Filter baris
  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows
    const term = search.toLowerCase()
    return rows.filter((row) =>
      headers.some((h) => String(row[h] ?? "").toLowerCase().includes(term))
    )
  }, [rows, headers, search])

  // Summary Metrics (Total Pendapatan / Belanja jika ada)
  const summaryMetrics = useMemo(() => {
    let pendapatanProyeksi = 0
    let pendapatanRealisasi = 0
    let belanjaProyeksi = 0
    let belanjaRealisasi = 0
    let belanjaDeviasi = 0
    let hasData = false

    const uraianCol = headers.find(isUraianHeader)
    const proyeksiCol = headers.find((h) => cleanKey(h).includes("proyeksi"))
    const realisasiCol = headers.find((h) => cleanKey(h).includes("realisasi"))
    const deviasiCol = headers.find((h) => cleanKey(h).includes("deviasi") && !cleanKey(h).includes("%"))

    if (uraianCol && proyeksiCol && realisasiCol) {
      for (const r of rows) {
        const u = String(r[uraianCol] ?? "").toUpperCase()
        if (u.includes("TOTAL") && u.includes("PENDAPATAN")) {
          pendapatanProyeksi = parseNumeric(r[proyeksiCol]).num
          pendapatanRealisasi = parseNumeric(r[realisasiCol]).num
          hasData = true
        } else if (u.includes("TOTAL") && u.includes("BELANJA")) {
          belanjaProyeksi = parseNumeric(r[proyeksiCol]).num
          belanjaRealisasi = parseNumeric(r[realisasiCol]).num
          if (deviasiCol) {
            belanjaDeviasi = parseNumeric(r[deviasiCol]).num
          }
          hasData = true
        }
      }
    }

    if (!hasData) return null

    return {
      pendapatanProyeksi,
      pendapatanRealisasi,
      belanjaProyeksi,
      belanjaRealisasi,
      belanjaDeviasi,
    }
  }, [rows, headers])

  const [pdfLoading, setPdfLoading] = useState(false)

  async function handleExport() {
    const XLSX = await import("xlsx")
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows, { header: headers })
    ws["!cols"] = headers.map(() => ({ wch: 22 }))
    XLSX.utils.book_append_sheet(wb, ws, "Realisasi")
    XLSX.writeFile(wb, exportFileName)
  }

  async function handleExportPDF() {
    if (rows.length === 0) return
    setPdfLoading(true)
    try {
      const { pdf } = await import("@react-pdf/renderer")
      const { RealisasiPengesahanPDF } = await import("@/components/pdf/realisasi-pengesahan-pdf")

      const generatedAt = new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })

      const blob = await pdf(
        <RealisasiPengesahanPDF
          rows={rows}
          headers={headers}
          sheetTitle={sheetTitle}
          title={title}
          generatedAt={generatedAt}
        />
      ).toBlob()

      const safeName = (sheetTitle || title || "realisasi-pengesahan")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${safeName}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success("Dokumen PDF berhasil diunduh")
    } catch (err) {
      console.error("[handleExportPDF]", err)
      toast.error("Gagal membuat dokumen PDF")
    } finally {
      setPdfLoading(false)
    }
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
        <p className="text-sm">Tidak ada data untuk ditampilkan</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Banner Title jika ada dari sheet */}
      {sheetTitle && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-base font-semibold text-foreground tracking-tight">{sheetTitle}</h2>
              {title && title !== sheetTitle && (
                <p className="text-xs text-muted-foreground">Sumber: {title}</p>
              )}
            </div>
          </div>
          <Badge variant="outline" className="text-xs bg-background">
            {rows.length} Baris Data
          </Badge>
        </div>
      )}

      {/* Summary KPI Cards jika terdeteksi */}
      {summaryMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Total Pendapatan</span>
              <Badge variant="default" className="text-[10px] bg-emerald-500/15 text-emerald-500 border-emerald-500/20">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Realisasi
              </Badge>
            </div>
            <p className="text-lg font-bold text-foreground font-mono">
              Rp {formatRupiah(summaryMetrics.pendapatanRealisasi)}
            </p>
            <p className="text-xs text-muted-foreground">
              Proyeksi: Rp {formatRupiah(summaryMetrics.pendapatanProyeksi)}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Total Belanja Realisasi</span>
              <TrendingDown className="h-4 w-4 text-primary" />
            </div>
            <p className="text-lg font-bold text-foreground font-mono">
              Rp {formatRupiah(summaryMetrics.belanjaRealisasi)}
            </p>
            <p className="text-xs text-muted-foreground">
              Proyeksi: Rp {formatRupiah(summaryMetrics.belanjaProyeksi)}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Deviasi Belanja</span>
              <span className={`text-xs font-semibold ${summaryMetrics.belanjaDeviasi < 0 ? "text-rose-500" : "text-emerald-500"}`}>
                {summaryMetrics.belanjaDeviasi < 0 ? "Kurang dari Proyeksi" : "Melebihi Proyeksi"}
              </span>
            </div>
            <p className={`text-lg font-bold font-mono ${summaryMetrics.belanjaDeviasi < 0 ? "text-rose-500" : "text-emerald-500"}`}>
              Rp {formatRupiah(summaryMetrics.belanjaDeviasi)}
            </p>
            <p className="text-xs text-muted-foreground">
              Selisih terhadap target proyeksi
            </p>
          </div>
        </div>
      )}

      {/* Toolbar: Search + Export */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari uraian atau nomor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-muted-foreground">
            {filteredRows.length} dari {rows.length} baris
          </span>
          {!hideExport && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                disabled={pdfLoading}
                className="gap-1.5 h-9 text-xs border-primary/30 hover:bg-primary/10"
                id="btn-export-pdf"
              >
                {pdfLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Menyiapkan PDF...
                  </>
                ) : (
                  <>
                    <Printer className="h-3.5 w-3.5 text-primary" />
                    Cetak PDF
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="gap-1.5 h-9 text-xs"
                id="btn-export-excel"
              >
                <Download className="h-3.5 w-3.5" />
                Export Excel
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-700/80 bg-slate-950 shadow-md overflow-x-auto max-h-[75vh] overflow-y-auto">
        <Table className="border-collapse">
          <TableHeader>
            <TableRow className="border-b border-slate-700 bg-[#0b1e36] hover:bg-[#0b1e36] sticky top-0 z-10">
              {colMeta.map((col) => (
                <TableHead
                  key={col.key}
                  className={`text-xs font-bold uppercase tracking-wider text-white py-3.5 px-3 border-r border-slate-800/80 last:border-r-0 ${
                    col.isNo ? "w-16 text-center" : ""
                  } ${col.isRight ? "text-right" : "text-left"}`}
                >
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.map((row, ri) => {
              const noVal = String(row[colMeta.find((c) => c.isNo)?.key ?? ""] ?? "").trim()
              const uraianVal = String(row[colMeta.find((c) => c.isUraian)?.key ?? ""] ?? "").trim()

              const isTotal =
                /^(I|II|III|IV|V|TOTAL|JUMLAH)$/i.test(noVal) ||
                uraianVal.toUpperCase().startsWith("TOTAL") ||
                uraianVal.toUpperCase().startsWith("JUMLAH")

              const isCat1 = !isTotal && noVal === "1"
              const isCat2 = !isTotal && noVal === "2"
              const isCat3 = !isTotal && noVal === "3"
              const isMainCategory = isCat1 || isCat2 || isCat3 || (!isTotal && /^\d+$/.test(noVal))
              const isSubItem = !isTotal && !isMainCategory

              // Row background style
              const rowClass = isTotal
                ? "bg-[#0d2342] text-white border-b border-slate-800"
                : isCat1
                ? "bg-[#f4f8fb] dark:bg-[#0e2238] border-b border-slate-200 dark:border-slate-800"
                : isCat2
                ? "bg-[#fdfbf2] dark:bg-[#251f10] border-b border-amber-200/50 dark:border-amber-900/40"
                : isCat3
                ? "bg-[#f4f9ed] dark:bg-[#162410] border-b border-lime-200/50 dark:border-lime-900/40"
                : isMainCategory
                ? "bg-muted/40 border-b border-border"
                : "bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-200/70 dark:border-slate-800/70"

              // Badge styling for NO
              const noBadgeClass = isTotal
                ? "bg-[#0d2342] text-white font-bold"
                : isCat1
                ? "bg-[#163252] text-white font-bold"
                : isCat2
                ? "bg-[#e5a93c] text-slate-900 font-bold"
                : isCat3
                ? "bg-[#65a30d] text-white font-bold"
                : isMainCategory
                ? "bg-slate-800 text-white font-bold"
                : "bg-[#e8f1f8] dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"

              return (
                <TableRow key={ri} className={`transition-colors ${rowClass}`}>
                  {colMeta.map((col) => {
                    const raw = row[col.key]

                    // Format kolom NO
                    if (col.isNo) {
                      const noStr = String(raw ?? "").trim()
                      return (
                        <TableCell key={col.key} className="p-0 text-center w-16 align-middle">
                          <div className={`w-full h-full min-h-[38px] flex items-center justify-center text-xs ${noBadgeClass}`}>
                            {noStr && noStr !== "0" ? noStr : "-"}
                          </div>
                        </TableCell>
                      )
                    }

                    // Format kolom URAIAN
                    if (col.isUraian) {
                      const uText = String(raw ?? "").trim()
                      const borderAccent = (isMainCategory || isTotal)
                        ? "border-l-4 border-l-amber-500"
                        : "border-l border-l-transparent"

                      return (
                        <TableCell
                          key={col.key}
                          className={`text-xs py-2.5 px-3.5 ${borderAccent} ${
                            isTotal
                              ? "font-bold text-white tracking-wide"
                              : isMainCategory
                              ? "font-bold text-slate-900 dark:text-slate-100"
                              : "font-normal text-slate-700 dark:text-slate-300 pl-6"
                          }`}
                        >
                          {uText || "-"}
                        </TableCell>
                      )
                    }

                    // Format kolom Persentase (% Deviasi)
                    if (col.isPct) {
                      const { text, num, isDash } = formatPercentage(raw)
                      if (isDash) {
                        return (
                          <TableCell
                            key={col.key}
                            className={`text-xs text-right py-2.5 px-3 font-mono ${
                              isTotal ? "text-white/70" : "text-muted-foreground/60"
                            }`}
                          >
                            -
                          </TableCell>
                        )
                      }
                      const isNegative = num < 0
                      return (
                        <TableCell
                          key={col.key}
                          className={`text-xs text-right py-2.5 px-3 font-mono font-bold tabular-nums ${
                            isNegative
                              ? isTotal
                                ? "text-[#ff4d4f]"
                                : "text-rose-600 dark:text-rose-400"
                              : isTotal
                              ? "text-white"
                              : "text-slate-900 dark:text-slate-100"
                          }`}
                        >
                          {text}
                        </TableCell>
                      )
                    }

                    // Format kolom Numeric (Rupiah/Angka)
                    if (col.isNumeric) {
                      const { num, isDash } = parseNumeric(raw)
                      if (isDash || (num === 0 && col.isDeviasi)) {
                        return (
                          <TableCell
                            key={col.key}
                            className={`text-xs text-right py-2.5 px-3 font-mono ${
                              isTotal ? "text-white/70" : "text-muted-foreground/60"
                            }`}
                          >
                            -
                          </TableCell>
                        )
                      }
                      const isNegative = num < 0
                      return (
                        <TableCell
                          key={col.key}
                          className={`text-xs text-right py-2.5 px-3 font-mono tabular-nums ${
                            col.isDeviasi && isNegative
                              ? isTotal
                                ? "text-[#ff4d4f] font-bold"
                                : "text-rose-600 dark:text-rose-400 font-bold"
                              : isTotal
                              ? "text-white font-bold"
                              : isMainCategory
                              ? "font-bold text-slate-900 dark:text-slate-100"
                              : "text-slate-800 dark:text-slate-200"
                          }`}
                        >
                          {formatRupiah(num)}
                        </TableCell>
                      )
                    }

                    // Default string cell
                    const s = String(raw ?? "").trim()
                    return (
                      <TableCell
                        key={col.key}
                        className={`text-xs py-2.5 px-3 whitespace-nowrap ${
                          isTotal ? "text-white" : "text-slate-900 dark:text-slate-100"
                        }`}
                      >
                        {s || "-"}
                      </TableCell>
                    )
                  })}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
