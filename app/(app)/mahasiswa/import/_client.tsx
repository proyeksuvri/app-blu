"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Upload, Download, CheckCircle2, XCircle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { toast } from "sonner"
import { importMahasiswa, type MahasiswaImportRow } from "@/app/actions/mahasiswa"
import { GDriveImportTab } from "@/components/gdrive-import-tab"

// ─── Template Excel ───────────────────────────────────────────────────────────

const TEMPLATE_HEADERS = [
  "NO VIRTUAL AKUN", "NIM", "NAMA MAHASISWA", "FAKULTAS", "PRODI", "PERIODE"
]

const TEMPLATE_SAMPLE = [
  ["7199822020400160", "2020040016", "YAHKILA IRSAN SIHOMBING", "Fakultas Tarbiyah dan Ilmu Keguruan", "S1-Pendidikan Matematika", "2025 Genap"],
  ["7199823020100950", "2302010095", "ZULFA AMIROTUL LATIFAH", "Fakultas Tarbiyah dan Ilmu Keguruan", "S1-Pendidikan Agama Islam", "2025 Genap"],
]

async function downloadTemplate() {
  const XLSX = await import("xlsx")
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...TEMPLATE_SAMPLE])
  ws["!cols"] = [20, 15, 30, 35, 30, 12].map((wch) => ({ wch }))
  XLSX.utils.book_append_sheet(wb, ws, "Template")
  XLSX.writeFile(wb, "template_import_mahasiswa.xlsx")
}

// ─── Smart Cell Value Extractor ───────────────────────────────────────────────

function cleanKey(k: string): string {
  return k.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function findValue(row: Record<string, unknown>, aliases: string[]): string {
  const normalizedAliases = aliases.map(cleanKey)
  for (const [key, val] of Object.entries(row)) {
    const ck = cleanKey(key)
    if (normalizedAliases.includes(ck) && val !== null && val !== undefined) {
      return String(val).trim()
    }
  }
  return ""
}

// ─── Preview Row Type ─────────────────────────────────────────────────────────

type PreviewRow = MahasiswaImportRow & {
  baris: number
  valid: boolean
  errors: string[]
}

function validateRows(rows: (MahasiswaImportRow & { baris: number })[]): PreviewRow[] {
  return rows.map((row) => {
    const errors: string[] = []
    if (!row.no_virtual_akun?.trim()) errors.push("No. Virtual Akun kosong")
    if (!row.nim?.trim()) errors.push("NIM kosong")
    if (!row.nama_mahasiswa?.trim()) errors.push("Nama Mahasiswa kosong")
    return { ...row, valid: errors.length === 0, errors }
  })
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Step = "upload" | "preview" | "done"
type PreviewFilter = "all" | "valid" | "error"

export function MahasiswaImportClient() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("upload")
  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [filterTab, setFilterTab] = useState<PreviewFilter>("all")
  const [pending, startTransition] = useTransition()
  const [dragOver, setDragOver] = useState(false)
  const [importedCount, setImportedCount] = useState(0)

  function processFile(file: File) {
    if (file.size > 25 * 1024 * 1024) { toast.error("Ukuran file maksimal 25MB"); return }
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
        const wb = XLSX.read(data, { type: "array" })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: "" })

        if (rows.length === 0) { toast.error("File kosong"); return }
        if (rows.length > 10000) { toast.error("Maksimal 10.000 baris per import"); return }

        const parsedRows: (MahasiswaImportRow & { baris: number })[] = []

        rows.forEach((r, idx) => {
          const va = findValue(r, ["no_virtual_akun", "novirtualakun", "virtual_akun", "virtualakun", "no_va", "nova", "va", "virtual_account", "virtualaccount", "no_akun", "noakun"])
          const nim = findValue(r, ["nim", "nomor_induk_mahasiswa", "nomorindukmahasiswa", "nomhs", "no_mhs", "npm"])
          const nama = findValue(r, ["nama_mahasiswa", "namamahasiswa", "nama", "nama_lengkap", "namalengkap", "nama_mhs"])
          const fakultas = findValue(r, ["fakultas", "nama_fakultas", "fak"])
          const prodi = findValue(r, ["prodi", "program_studi", "programstudi", "jurusan", "nama_prodi"])
          const periode = findValue(r, ["periode", "semester", "tahun_akademik", "tahunakademik", "ta", "angkatan"])

          // Lewati baris yang sepenuhnya kosong (misal baris formatting kosong di Excel)
          if (!va && !nim && !nama && !fakultas && !prodi && !periode) {
            return
          }

          parsedRows.push({
            baris: idx + 2,
            no_virtual_akun: va,
            nim: nim,
            nama_mahasiswa: nama,
            fakultas: fakultas || undefined,
            prodi: prodi || undefined,
            periode: periode || undefined,
          })
        })

        if (parsedRows.length === 0) {
          toast.error("Tidak ada baris data yang terbaca dari file.")
          return
        }

        const validated = validateRows(parsedRows)
        setPreview(validated)
        setFilterTab("all")
        setStep("preview")
      } catch {
        toast.error("Gagal membaca file. Pastikan format Excel valid.")
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function handleCommit() {
    const validRows = preview.filter((r) => r.valid)
    if (validRows.length === 0) { toast.error("Tidak ada data valid untuk diimpor"); return }

    startTransition(async () => {
      const result = await importMahasiswa(validRows)
      if (!result.ok) { toast.error(result.pesan); return }
      setImportedCount(result.data.dibuat)
      setStep("done")
    })
  }

  const validCount = preview.filter((r) => r.valid).length
  const invalidCount = preview.filter((r) => !r.valid).length

  const filteredPreview = preview.filter((r) => {
    if (filterTab === "valid") return r.valid
    if (filterTab === "error") return !r.valid
    return true
  })

  // ─── Step: Upload ───────────────────────────────────────────────────────────

  if (step === "upload") {
    return (
      <div className="flex flex-col gap-6">
        {/* Info */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Format File</AlertTitle>
          <AlertDescription className="mt-1 space-y-1 text-xs">
            <p>File Excel dapat menggunakan header standar seperti: <code className="font-mono bg-muted px-1 rounded">NO VIRTUAL AKUN</code>, <code className="font-mono bg-muted px-1 rounded">NIM</code>, <code className="font-mono bg-muted px-1 rounded">NAMA MAHASISWA</code></p>
            <p>Kolom opsional: <code className="font-mono bg-muted px-1 rounded">FAKULTAS</code>, <code className="font-mono bg-muted px-1 rounded">PRODI</code>, <code className="font-mono bg-muted px-1 rounded">PERIODE</code></p>
            <p>Data yang sudah ada akan diperbarui secara otomatis berdasarkan <code className="font-mono bg-muted px-1 rounded">No. Virtual Akun</code> (upsert).</p>
          </AlertDescription>
        </Alert>

        {/* Tabs: Upload File | Google Drive */}
        <Tabs defaultValue="upload">
          <TabsList className="mb-4">
            <TabsTrigger value="upload">Upload File</TabsTrigger>
            <TabsTrigger value="gdrive">Dari Google Drive</TabsTrigger>
          </TabsList>

          {/* ── Tab: Upload File (existing) ── */}
          <TabsContent value="upload" className="flex flex-col gap-4 mt-0">
            {/* Download Template */}
            <div className="flex">
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5">
                <Download className="h-3.5 w-3.5" />
                Download Template Excel
              </Button>
            </div>

            {/* Drop Zone */}
            <div
              className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors cursor-pointer
                ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/20"}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) processFile(f) }}
              onClick={() => document.getElementById("mhs-file-input")?.click()}
            >
              <Upload className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">Drag &amp; drop file Excel di sini</p>
              <p className="text-xs text-muted-foreground mt-1">atau klik untuk memilih file (.xlsx, .xls, .csv)</p>
              <input
                id="mhs-file-input"
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f) }}
              />
            </div>
          </TabsContent>

          {/* ── Tab: Google Drive (new) ── */}
          <TabsContent value="gdrive" className="mt-0">
            <GDriveImportTab
              onFile={processFile}
              hint="Setelah file berhasil diambil, pratinjau data akan muncul otomatis."
            />
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  // ─── Step: Preview ──────────────────────────────────────────────────────────

  if (step === "preview") {
    return (
      <div className="flex flex-col gap-4">
        {/* Action Header & Tabs */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Button
              variant={filterTab === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterTab("all")}
              className="text-xs"
            >
              Semua ({preview.length})
            </Button>
            <Button
              variant={filterTab === "valid" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterTab("valid")}
              className="text-xs gap-1"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Valid ({validCount})
            </Button>
            {invalidCount > 0 && (
              <Button
                variant={filterTab === "error" ? "destructive" : "outline"}
                size="sm"
                onClick={() => setFilterTab("error")}
                className="text-xs gap-1"
              >
                <XCircle className="h-3.5 w-3.5 text-destructive" />
                Error ({invalidCount})
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setStep("upload")}>Ulang</Button>
            <Button size="sm" onClick={handleCommit} disabled={pending || validCount === 0}>
              {pending ? "Mengimpor..." : `Import ${validCount} Data Valid`}
            </Button>
          </div>
        </div>

        {/* Table Preview */}
        <div className="rounded-xl border border-border overflow-x-auto max-h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent sticky top-0 bg-background z-10">
                <TableHead className="text-xs w-16">Baris</TableHead>
                <TableHead className="text-xs">No. Virtual Akun</TableHead>
                <TableHead className="text-xs">NIM</TableHead>
                <TableHead className="text-xs">Nama Mahasiswa</TableHead>
                <TableHead className="text-xs">Prodi</TableHead>
                <TableHead className="text-xs">Periode</TableHead>
                <TableHead className="text-xs min-w-36">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPreview.map((row, i) => (
                <TableRow key={i} className={`border-border/50 ${!row.valid ? "bg-destructive/10" : ""}`}>
                  <TableCell className="text-xs text-muted-foreground font-mono">{row.baris}</TableCell>
                  <TableCell className="text-xs font-mono">{row.no_virtual_akun || <span className="text-destructive font-sans italic">Kosong</span>}</TableCell>
                  <TableCell className="text-xs">{row.nim || <span className="text-destructive italic">Kosong</span>}</TableCell>
                  <TableCell className="text-xs font-medium">{row.nama_mahasiswa || <span className="text-destructive italic">Kosong</span>}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{row.prodi || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{row.periode || "—"}</TableCell>
                  <TableCell className="text-xs">
                    {row.valid ? (
                      <Badge variant="default" className="text-xs gap-1">
                        <CheckCircle2 className="h-3 w-3" /> OK
                      </Badge>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        {row.errors.map((err, ei) => (
                          <span key={ei} className="text-destructive text-xs font-medium">
                            • {err}
                          </span>
                        ))}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  // ─── Step: Done ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <CheckCircle2 className="h-16 w-16 text-emerald-500" />
      <div className="text-center">
        <p className="text-lg font-semibold text-foreground">{importedCount} data mahasiswa berhasil disimpan</p>
        <p className="text-sm text-muted-foreground mt-1">Data yang sudah ada diperbarui, data baru ditambahkan.</p>
      </div>
      <div className="flex gap-3 mt-4">
        <Button variant="outline" onClick={() => { setStep("upload"); setPreview([]) }}>Import Lagi</Button>
        <Button onClick={() => router.push("/mahasiswa")}>Lihat Data Mahasiswa</Button>
      </div>
    </div>
  )
}
