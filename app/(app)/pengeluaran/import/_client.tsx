"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Upload, Download, CheckCircle2, XCircle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import {
  parseImportPengeluaranData,
  commitImportPengeluaran,
  type ImportPengeluaranRow,
  type ImportPengeluaranPreviewRow,
} from "@/app/actions/import-pengeluaran"

const TEMPLATE_HEADERS = [
  "tanggal", "kode_unit", "kode_rekening", "kode_jenis", "jumlah", "uraian"
]

const TEMPLATE_SAMPLE = [
  ["2026-05-01", "FSH", "BSI", "JPN-01", "5000000", "Pembelian ATK Fakultas"],
  ["2026-05-02", "FTI", "BNI", "JPN-02", "2500000", "Biaya perjalanan dinas"],
]

async function downloadTemplate() {
  const XLSX = await import("xlsx")
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...TEMPLATE_SAMPLE])
  ws["!cols"] = TEMPLATE_HEADERS.map(() => ({ wch: 20 }))
  XLSX.utils.book_append_sheet(wb, ws, "Template")
  XLSX.writeFile(wb, "template_import_pengeluaran.xlsx")
}

type Step = "upload" | "preview" | "done"

export function ImportPengeluaranClient() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("upload")
  const [preview, setPreview] = useState<ImportPengeluaranPreviewRow[]>([])
  const [pending, startTransition] = useTransition()
  const [dragOver, setDragOver] = useState(false)

  function processFile(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 10MB")
      return
    }
    const ext = file.name.split(".").pop()?.toLowerCase()
    if (!ext || !["xlsx", "xls", "csv"].includes(ext)) {
      toast.error("Format tidak didukung. Gunakan .xlsx, .xls, atau .csv")
      return
    }
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const XLSX = await import("xlsx")
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: "array", cellDates: true })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: "" })

        if (rows.length === 0) { toast.error("File kosong"); return }
        if (rows.length > 2000) { toast.error("Maksimal 2000 baris"); return }

        const importRows: ImportPengeluaranRow[] = rows.map((r, i) => ({
          baris: i + 2,
          tanggal:       formatDate(r["tanggal"] ?? r["tanggal_transaksi"]),
          kode_unit:     String(r["kode_unit"] ?? "").toUpperCase(),
          kode_rekening: String(r["kode_rekening"] ?? "").toUpperCase(),
          kode_jenis:    r["kode_jenis"] ? String(r["kode_jenis"]).toUpperCase() : undefined,
          jumlah:        Number(r["jumlah"]) || 0,
          uraian:        r["uraian"] ? String(r["uraian"]) : undefined,
        }))

        startTransition(async () => {
          const result = await parseImportPengeluaranData(importRows)
          setPreview(result)
          setStep("preview")
        })
      } catch {
        toast.error("Gagal membaca file. Pastikan format Excel/CSV benar.")
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  function handleCommit() {
    startTransition(async () => {
      const result = await commitImportPengeluaran(preview)
      if (!result.ok) { toast.error(result.pesan); return }
      toast.success(`${result.jumlah} transaksi berhasil diimpor sebagai draft`)
      setStep("done")
    })
  }

  const validCount   = preview.filter((r) => r.valid).length
  const invalidCount = preview.length - validCount

  if (step === "done") {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <CheckCircle2 className="h-12 w-12 text-primary" />
        <p className="text-lg font-medium text-foreground">Import berhasil</p>
        <p className="text-sm text-muted-foreground">Data tersimpan sebagai draft, siap untuk diverifikasi</p>
        <Button onClick={() => router.push("/pengeluaran")}>Lihat Daftar Pengeluaran</Button>
      </div>
    )
  }

  if (step === "preview") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Badge className="gap-1.5">
            <CheckCircle2 className="h-3 w-3" />{validCount} baris valid
          </Badge>
          {invalidCount > 0 && (
            <Badge variant="destructive" className="gap-1.5">
              <XCircle className="h-3 w-3" />{invalidCount} baris error (tidak akan diimpor)
            </Badge>
          )}
        </div>

        <div className="rounded-xl border border-border overflow-auto max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground text-xs w-12">Baris</TableHead>
                <TableHead className="text-muted-foreground text-xs">Tgl. Transaksi</TableHead>
                <TableHead className="text-muted-foreground text-xs">Unit Kerja</TableHead>
                <TableHead className="text-muted-foreground text-xs">Rekening</TableHead>
                <TableHead className="text-muted-foreground text-xs">Jenis</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Jumlah</TableHead>
                <TableHead className="text-muted-foreground text-xs">Uraian</TableHead>
                <TableHead className="text-muted-foreground text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.map((row) => (
                <TableRow key={row.baris}
                  className={`border-border/50 ${row.valid ? "hover:bg-muted/20" : "bg-destructive/5"}`}>
                  <TableCell className="text-xs text-foreground/70 py-2">{row.baris}</TableCell>
                  <TableCell className="text-xs text-foreground/70 py-2">{row.tanggal}</TableCell>
                  <TableCell className="text-xs text-foreground/70 py-2">{row.kode_unit}</TableCell>
                  <TableCell className="text-xs text-foreground/70 py-2">{row.kode_rekening}</TableCell>
                  <TableCell className="text-xs text-foreground/70 py-2">{row.kode_jenis || "—"}</TableCell>
                  <TableCell className="text-xs text-foreground/70 py-2 text-right">
                    {row.jumlah ? new Intl.NumberFormat("id-ID").format(row.jumlah) : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-foreground/70 py-2 max-w-[200px] truncate">{row.uraian || "—"}</TableCell>
                  <TableCell className="text-xs py-2">
                    {row.valid ? (
                      <Badge>Valid</Badge>
                    ) : (
                      <Badge variant="destructive" title={row.errors.join(", ")}>
                        {row.errors[0]}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => setStep("upload")}>
            Kembali
          </Button>
          <Button onClick={handleCommit} disabled={pending || validCount === 0} className="flex-1">
            {pending ? "Mengimpor..." : `Import ${validCount} Baris Valid`}
          </Button>
        </div>
      </div>
    )
  }

  // Upload step
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={downloadTemplate} className="gap-1.5">
          <Download className="h-4 w-4" />
          Download Template
        </Button>
      </div>

      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-16 cursor-pointer transition-colors
          ${dragOver ? "border-primary/50 bg-primary/5" : "border-border hover:border-border/80"}`}
      >
        <Upload className="h-8 w-8 text-muted-foreground/50" />
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Drag &amp; drop file di sini, atau klik untuk pilih</p>
          <p className="text-xs text-muted-foreground/50 mt-1">Format: .xlsx, .xls, .csv — Maks. 2000 baris</p>
        </div>
        <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
      </label>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Kolom yang diperlukan</AlertTitle>
        <AlertDescription>
          <code className="font-mono text-xs leading-relaxed">{TEMPLATE_HEADERS.join(" | ")}</code>
          <p className="mt-1">Kode menggunakan UPPERCASE. Download template untuk contoh pengisian.</p>
        </AlertDescription>
      </Alert>
    </div>
  )
}

function formatDate(val: unknown): string {
  if (!val) return ""
  if (val instanceof Date) return val.toISOString().split("T")[0]
  const s = String(val)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0]
  return s
}
