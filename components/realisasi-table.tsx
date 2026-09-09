import { useMemo, useState } from "react"
import { Download, Search, FileSpreadsheet, Printer, Loader2 } from "lucide-react"
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
  /** Judul banner dari sheet (e.g. REALISASI PENGESAHAN SEPTEMBER 2026) */
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
  return ["no", "nomor", "num", "#", "kode", "akun"].includes(c)
}

function isUraianHeader(h: string): boolean {
  const c = cleanKey(h)
  return c.includes("uraian") || c.includes("nama") || c.includes("keterangan") || c.includes("deskripsi")
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
    c.includes("rpd") ||
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
  if (!s || s === "-" || s === "—" || s === "–" || s === "0" || s === "0%") return { text: "—", num: 0, isDash: true }

  if (typeof val === "string" && s.endsWith("%")) {
    const rawNum = parseNumeric(s.replace("%", "")).num
    return { text: s, num: rawNum, isDash: false }
  }

  const { num, isDash } = parseNumeric(val)
  if (isDash || num === 0) return { text: "—", num: 0, isDash: true }

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

  // Ringkasan Metrics (RM+BOPTN, BLU, TOTAL RPD, Status)
  const ringkasan = useMemo(() => {
    const findKey = (keywords: string[]) => {
      return headers.find((h) => {
        const c = cleanKey(h)
        return keywords.some((kw) => c.includes(kw))
      })
    }

    const sumberDanaKey = findKey(["sumberdana", "sumber", "dana"]) ?? headers[0]
    const akunKey       = findKey(["akun", "kode", "kd"]) ?? headers[1]
    const uraianKey     = findKey(["uraian", "nama", "keterangan", "deskripsi", "item"]) ?? headers[2]
    const rpdKey        = findKey(["rpd", "proyeksi", "anggaran", "pagu", "target"]) ?? headers[3]
    const realisasiKey  = findKey(["realisasi", "capaian", "terserap"]) ?? headers[4]

    let rmBoptnTotal = 0
    let bluTotal = 0
    let grandTotalRpd = 0
    let grandTotalRealisasi = 0
    let hasData = false

    for (const r of rows) {
      const sDana = String(r[sumberDanaKey] ?? "").toUpperCase().trim()
      const akun  = String(r[akunKey] ?? "").trim()
      const uraian = String(r[uraianKey] ?? "").toUpperCase().trim()
      const rpdVal = parseNumeric(r[rpdKey]).num
      const realVal = parseNumeric(r[realisasiKey]).num

      const isGroupHeader = uraian.includes("TOTAL") || !akun

      if (isGroupHeader) {
        if ((sDana.includes("RM") || sDana.includes("BOPTN")) && !sDana.includes("TOTAL")) {
          rmBoptnTotal = rpdVal
          hasData = true
        } else if (sDana.includes("BLU") && !sDana.includes("TOTAL") && !sDana.includes("RM")) {
          bluTotal = rpdVal
          hasData = true
        } else if (sDana.includes("TOTAL") || uraian.includes("RM + BOPTN + BLU")) {
          grandTotalRpd = rpdVal
          grandTotalRealisasi = realVal
          hasData = true
        }
      }
    }

    if (grandTotalRpd === 0 && (rmBoptnTotal > 0 || bluTotal > 0)) {
      grandTotalRpd = rmBoptnTotal + bluTotal
    }

    const statusText =
      grandTotalRealisasi > 0
        ? `Realisasi: Rp ${formatRupiah(grandTotalRealisasi)} (${((grandTotalRealisasi / (grandTotalRpd || 1)) * 100).toFixed(2)}%)`
        : "Belum ada realisasi"

    return {
      hasData: hasData || rmBoptnTotal > 0 || bluTotal > 0 || grandTotalRpd > 0,
      rmBoptnTotal,
      bluTotal,
      grandTotalRpd,
      statusText,
    }
  }, [rows, headers])

  const [pdfLoading, setPdfLoading] = useState(false)

  async function handleExport() {
    const XLSX = await import("xlsx")
    const wb = XLSX.utils.book_new()

    const periodStr = (sheetTitle || title || "SEPTEMBER 2026").toUpperCase()

    // Buat data 2D array (AOA) sesuai struktur layout referensi
    const aoa: unknown[][] = [
      ["REKAPITULASI RPD DAN REALISASI BELANJA"],
      [periodStr],
      [`Sumber: ${title || "RPD " + periodStr} | ${ringkasan.statusText}`],
      [], // Baris kosong
      ["RINGKASAN"],
      ["RM + BOPTN", "", "", ringkasan.rmBoptnTotal],
      ["BLU", "", "", ringkasan.bluTotal],
      ["TOTAL RPD", "", "", ringkasan.grandTotalRpd],
      ["STATUS", ringkasan.statusText],
      [], // Baris kosong
      headers, // ["Sumber Dana", "Akun", "Uraian", "RPD / Proyeksi", "Realisasi", "Deviasi", "% Deviasi"]
    ]

    for (const r of rows) {
      const rowArr: unknown[] = []
      for (const h of headers) {
        rowArr.push(r[h] ?? "")
      }
      aoa.push(rowArr)
    }

    aoa.push([])
    aoa.push([
      "Catatan: Tanda '—' menunjukkan data realisasi belum tersedia. Deviasi dan % deviasi akan otomatis terhitung setelah kolom Realisasi diisi.",
    ])

    const ws = XLSX.utils.aoa_to_sheet(aoa)
    ws["!cols"] = [
      { wch: 18 }, // Sumber Dana
      { wch: 10 }, // Akun
      { wch: 32 }, // Uraian
      { wch: 22 }, // RPD / Proyeksi
      { wch: 18 }, // Realisasi
      { wch: 18 }, // Deviasi
      { wch: 14 }, // % Deviasi
    ]

    XLSX.utils.book_append_sheet(wb, ws, "Rekapitulasi RPD")
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
              <h2 className="text-base font-bold text-foreground tracking-tight uppercase">
                REKAPITULASI RPD DAN REALISASI BELANJA
              </h2>
              <p className="text-xs font-semibold text-foreground/80">{sheetTitle}</p>
              {title && title !== sheetTitle && (
                <p className="text-[11px] text-muted-foreground italic">Sumber: {title}</p>
              )}
            </div>
          </div>
          <Badge variant="outline" className="text-xs bg-background">
            {rows.length} Baris Data
          </Badge>
        </div>
      )}

      {/* ── RINGKASAN Table Box matching reference ── */}
      {ringkasan.hasData && (
        <div className="w-full max-w-md rounded-lg border border-border/70 overflow-hidden shadow-sm bg-card">
          <div className="bg-[#10355c] px-3.5 py-1.5 text-white font-bold text-xs tracking-wider uppercase">
            RINGKASAN
          </div>
          <div className="divide-y divide-border/60 text-xs">
            <div className="grid grid-cols-3 items-center">
              <div className="bg-[#e8f1f8] dark:bg-slate-800/80 px-3 py-1.5 font-medium text-slate-800 dark:text-slate-200 border-r border-border/50">
                RM + BOPTN
              </div>
              <div className="col-span-2 px-3 py-1.5 text-right font-mono font-medium text-foreground">
                {ringkasan.rmBoptnTotal > 0 ? `Rp ${formatRupiah(ringkasan.rmBoptnTotal)}` : "Rp 0"}
              </div>
            </div>
            <div className="grid grid-cols-3 items-center">
              <div className="bg-[#e8f1f8] dark:bg-slate-800/80 px-3 py-1.5 font-medium text-slate-800 dark:text-slate-200 border-r border-border/50">
                BLU
              </div>
              <div className="col-span-2 px-3 py-1.5 text-right font-mono font-medium text-foreground">
                {ringkasan.bluTotal > 0 ? `Rp ${formatRupiah(ringkasan.bluTotal)}` : "Rp 0"}
              </div>
            </div>
            <div className="grid grid-cols-3 items-center">
              <div className="bg-[#e8f1f8] dark:bg-slate-800/80 px-3 py-1.5 font-bold text-slate-900 dark:text-slate-100 border-r border-border/50">
                TOTAL RPD
              </div>
              <div className="col-span-2 px-3 py-1.5 text-right font-mono font-bold text-foreground">
                {ringkasan.grandTotalRpd > 0 ? `Rp ${formatRupiah(ringkasan.grandTotalRpd)}` : "Rp 0"}
              </div>
            </div>
            <div className="grid grid-cols-3 items-center">
              <div className="bg-[#e8f1f8] dark:bg-slate-800/80 px-3 py-1.5 font-medium text-slate-800 dark:text-slate-200 border-r border-border/50">
                STATUS
              </div>
              <div className="col-span-2 px-3 py-1.5 text-left text-muted-foreground font-normal">
                {ringkasan.statusText}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar: Search + Export */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari uraian, akun, atau sumber dana..."
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
                className="gap-1.5 h-9 text-xs bg-[#10355c] hover:bg-[#0b2440] text-white border-transparent"
                id="btn-export-pdf"
              >
                {pdfLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Menyiapkan PDF...
                  </>
                ) : (
                  <>
                    <Printer className="h-3.5 w-3.5" />
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
      <div className="rounded-lg border border-slate-700/80 bg-slate-950 shadow-sm overflow-x-auto max-h-[75vh] overflow-y-auto">
        <Table className="border-collapse">
          <TableHeader>
            <TableRow className="border-b border-slate-700 bg-[#10355c] hover:bg-[#10355c] sticky top-0 z-10">
              {colMeta.map((col) => (
                <TableHead
                  key={col.key}
                  className={`text-xs font-bold uppercase tracking-wider text-white py-3 px-3 border-r border-slate-700/80 last:border-r-0 ${
                    col.isNo ? "w-20 text-center" : ""
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
                uraianVal.toUpperCase().includes("RM + BOPTN + BLU")

              const isGroupHeader =
                !isTotal && (uraianVal.toUpperCase().includes("TOTAL") || (noVal !== "" && isNaN(Number(noVal))))

              // Row background style
              const rowClass = isTotal
                ? "bg-[#dbeafe] dark:bg-[#0e2a4a] text-slate-950 dark:text-white font-bold border-b border-slate-300 dark:border-slate-800"
                : isGroupHeader
                ? "bg-[#f1f5f9] dark:bg-[#1e293b] font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800"
                : "bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-200/70 dark:border-slate-800/70"

              return (
                <TableRow key={ri} className={`transition-colors ${rowClass}`}>
                  {colMeta.map((col) => {
                    const raw = row[col.key]

                    // Format kolom NO / AKUN
                    if (col.isNo) {
                      const noStr = String(raw ?? "").trim()
                      return (
                        <TableCell key={col.key} className="py-2.5 px-3 text-center text-xs border-r border-border/40 font-mono">
                          {noStr && noStr !== "0" ? noStr : ""}
                        </TableCell>
                      )
                    }

                    // Format kolom URAIAN
                    if (col.isUraian) {
                      const uText = String(raw ?? "").trim()
                      return (
                        <TableCell
                          key={col.key}
                          className={`text-xs py-2.5 px-3 border-r border-border/40 ${
                            isTotal || isGroupHeader
                              ? "font-bold text-slate-900 dark:text-slate-100"
                              : "font-normal text-slate-700 dark:text-slate-300 pl-4"
                          }`}
                        >
                          {uText || "-"}
                        </TableCell>
                      )
                    }

                    // Format kolom Deviasi & Persentase (% Deviasi) - soft green tint
                    if (col.isDeviasi || col.isPct) {
                      if (col.isPct) {
                        const { text, num, isDash } = formatPercentage(raw)
                        return (
                          <TableCell
                            key={col.key}
                            className={`text-xs text-right py-2.5 px-3 font-mono border-r border-border/40 last:border-r-0 ${
                              isTotal || isGroupHeader
                                ? ""
                                : "bg-[#e8f5e9]/60 dark:bg-emerald-950/20 text-slate-800 dark:text-slate-200"
                            } ${!isDash && num < 0 ? "text-rose-600 font-semibold" : ""}`}
                          >
                            {text || "—"}
                          </TableCell>
                        )
                      } else {
                        const { num, isDash } = parseNumeric(raw)
                        const valText = isDash || num === 0 ? "—" : `Rp ${formatRupiah(num)}`
                        return (
                          <TableCell
                            key={col.key}
                            className={`text-xs text-right py-2.5 px-3 font-mono border-r border-border/40 ${
                              isTotal || isGroupHeader
                                ? ""
                                : "bg-[#e8f5e9]/60 dark:bg-emerald-950/20 text-slate-800 dark:text-slate-200"
                            } ${!isDash && num < 0 ? "text-rose-600 font-semibold" : ""}`}
                          >
                            {valText}
                          </TableCell>
                        )
                      }
                    }

                    // Format kolom Angka Numerik (RPD / Proyeksi, Realisasi, dll)
                    if (col.isNumeric) {
                      const { num, isDash } = parseNumeric(raw)
                      const valText = isDash && num === 0 ? "Rp 0" : `Rp ${formatRupiah(num)}`
                      return (
                        <TableCell
                          key={col.key}
                          className={`text-xs text-right py-2.5 px-3 font-mono border-r border-border/40 ${
                            isTotal || isGroupHeader
                              ? "font-bold"
                              : "text-slate-800 dark:text-slate-200"
                          }`}
                        >
                          {isDash && num === 0 && !col.key.toLowerCase().includes("proyeksi") && !col.key.toLowerCase().includes("rpd")
                            ? "—"
                            : valText}
                        </TableCell>
                      )
                    }

                    // Kolom Teks Biasa (Sumber Dana, dll)
                    const sVal = String(raw ?? "").trim()
                    return (
                      <TableCell
                        key={col.key}
                        className={`text-xs py-2.5 px-3 border-r border-border/40 ${
                          isTotal || isGroupHeader
                            ? "font-bold text-slate-900 dark:text-slate-100"
                            : "text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {sVal || ""}
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
