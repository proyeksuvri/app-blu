"use client"

import { useState, useTransition } from "react"
import { RefreshCw, Upload, Settings2, FolderOpen, Loader2, Trash2, Plus, Save, AlertCircle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { RealisasiTable, type SheetRow } from "@/components/realisasi-table"
import { useGDriveImport, extractGDriveFileId } from "@/hooks/use-gdrive-import"
import {
  createGDriveConfig,
  updateGDriveConfig,
  deleteGDriveConfig,
  type GDriveConfigRow,
  type GDriveConfigInput,
} from "@/app/actions/gdrive-config"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  configs: GDriveConfigRow[]
  isAdmin: boolean
}

// ─── XLSX parser helper ───────────────────────────────────────────────────────

export type ParsedSheetResult = {
  sheetTitle?: string
  headers: string[]
  rows: SheetRow[]
}

async function parseXlsxFile(file: File): Promise<ParsedSheetResult> {
  const XLSX = await import("xlsx")
  const buf  = await file.arrayBuffer()
  const wb   = XLSX.read(new Uint8Array(buf), { type: "array", cellDates: true })
  const ws   = wb.Sheets[wb.SheetNames[0]]

  // Ambil raw 2D grid: array of rows
  const grid = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" })
  if (!grid || grid.length === 0) {
    return { headers: [], rows: [] }
  }

  // 1. Cari baris header sebenarnya
  const headerKeywords = [
    "uraian", "proyeksi", "realisasi", "deviasi", "pagu", "anggaran",
    "jumlah", "nominal", "keterangan", "nama", "item", "deskripsi", "no", "kode"
  ]

  let headerRowIndex = -1
  let detectedTitle = ""

  for (let r = 0; r < Math.min(grid.length, 15); r++) {
    const row = grid[r] || []
    const filledCells = row.map((c) => String(c ?? "").trim()).filter(Boolean)

    // Jika baris awal hanya punya 1 teks panjang, kemungkinan itu judul tabel/banner
    if (filledCells.length === 1 && !detectedTitle && r < 5) {
      detectedTitle = filledCells[0]
    }

    if (filledCells.length >= 2) {
      // Cek apakah ada keyword header yang cocok
      const hasKeyword = filledCells.some((cell) =>
        headerKeywords.some((kw) => cell.toLowerCase().includes(kw))
      )
      if (hasKeyword || filledCells.length >= 3) {
        headerRowIndex = r
        break
      }
    }
  }

  // Fallback: baris pertama yang punya minimal 2 kolom terisi
  if (headerRowIndex === -1) {
    for (let r = 0; r < grid.length; r++) {
      const row = grid[r] || []
      const filled = row.filter((c) => String(c ?? "").trim() !== "")
      if (filled.length >= 2) {
        headerRowIndex = r
        break
      }
    }
  }

  if (headerRowIndex === -1) {
    headerRowIndex = 0
  }

  // 2. Ekstrak nama header
  const rawHeaderRow = (grid[headerRowIndex] || []).map((c) => String(c ?? "").trim())

  let lastCol = rawHeaderRow.length - 1
  while (lastCol >= 0 && !rawHeaderRow[lastCol]) {
    lastCol--
  }
  if (lastCol < 0) lastCol = rawHeaderRow.length - 1

  const seenHeaders = new Map<string, number>()
  const headers: string[] = []

  for (let c = 0; c <= Math.max(lastCol, 1); c++) {
    let name = rawHeaderRow[c] || `Kolom_${c + 1}`
    const count = seenHeaders.get(name) || 0
    seenHeaders.set(name, count + 1)
    if (count > 0) {
      name = `${name}_${count + 1}`
    }
    headers.push(name)
  }

  // 3. Ekstrak baris data
  const dataRows: SheetRow[] = []
  for (let r = headerRowIndex + 1; r < grid.length; r++) {
    const row = grid[r] || []
    const isAllEmpty = row.every((c) => c === null || c === undefined || String(c).trim() === "")
    if (isAllEmpty) continue

    const rowObj: SheetRow = {}
    let hasValue = false
    for (let c = 0; c < headers.length; c++) {
      const val = row[c] !== undefined ? row[c] : ""
      rowObj[headers[c]] = val
      if (val !== "" && val !== null && val !== undefined) {
        hasValue = true
      }
    }
    if (hasValue) {
      dataRows.push(rowObj)
    }
  }

  return {
    sheetTitle: detectedTitle || undefined,
    headers,
    rows: dataRows,
  }
}

// ─── Tab: Dari Google Drive ───────────────────────────────────────────────────

function TabGDrive({ configs }: { configs: GDriveConfigRow[] }) {
  const [selectedId, setSelectedId] = useState<string>(configs[0]?.id ?? "")
  const [rows, setRows]             = useState<SheetRow[]>([])
  const [headers, setHeaders]       = useState<string[]>([])
  const [sheetTitle, setSheetTitle] = useState<string | undefined>()
  const [title, setTitle]           = useState<string>("")
  const [error, setError]           = useState<string | null>(null)
  const { fetchFromDrive, loading }  = useGDriveImport()

  const selectedConfig = configs.find((c) => c.id === selectedId)

  async function handleLoad() {
    if (!selectedConfig) return
    setError(null)
    setRows([])
    setHeaders([])
    setSheetTitle(undefined)

    const result = await fetchFromDrive(selectedConfig.url)
    if (result.error) { setError(result.error); return }
    if (!result.file) return

    try {
      const parsed = await parseXlsxFile(result.file)
      if (parsed.rows.length === 0) { setError("File tidak mengandung data yang dapat dibaca."); return }
      setRows(parsed.rows)
      setHeaders(parsed.headers)
      setSheetTitle(parsed.sheetTitle)
      setTitle(selectedConfig.nama)
      toast.success(`${parsed.rows.length} baris data berhasil dimuat`)
    } catch {
      setError("Gagal membaca file dari Google Drive. Pastikan format file adalah Excel (.xlsx / .xls).")
    }
  }

  if (configs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
        <FolderOpen className="h-10 w-10 opacity-30" />
        <p className="text-sm">Belum ada sumber Google Drive yang dikonfigurasi.</p>
        <p className="text-xs">Admin dapat menambahkan sumber di tab <strong>Kelola Sumber</strong>.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Selector + Tombol Muat */}
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex flex-col gap-1.5 flex-1 min-w-48">
          <Label className="text-xs">Pilih Sumber Data</Label>
          <Select value={selectedId} onValueChange={(v) => { if (v) setSelectedId(v) }} disabled={loading}>
            <SelectTrigger className="h-9 w-full text-sm bg-card" id="gdrive-config-select">
              <SelectValue>
                {selectedConfig ? selectedConfig.nama : "Pilih sumber data..."}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {configs.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nama}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleLoad}
          disabled={loading || !selectedId}
          className="gap-1.5 shrink-0"
          id="gdrive-load-button"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Memuat...</>
          ) : (
            <><RefreshCw className="h-4 w-4" />Muat Data</>
          )}
        </Button>
      </div>

      {/* Info konfigurasi terpilih */}
      {selectedConfig?.keterangan && (
        <p className="text-xs text-muted-foreground flex items-start gap-1.5">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          {selectedConfig.keterangan}
        </p>
      )}

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabel hasil */}
      {rows.length > 0 && (
        <RealisasiTable
          rows={rows}
          headers={headers}
          sheetTitle={sheetTitle}
          title={title}
          exportFileName={`${title.replace(/\s+/g, "_")}.xlsx`}
        />
      )}

      {rows.length === 0 && !loading && !error && (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <FolderOpen className="h-8 w-8 opacity-30" />
          <p className="text-sm">Pilih sumber data lalu klik <strong>Muat Data</strong></p>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Upload File ─────────────────────────────────────────────────────────

function TabUpload() {
  const [rows, setRows]             = useState<SheetRow[]>([])
  const [headers, setHeaders]       = useState<string[]>([])
  const [sheetTitle, setSheetTitle] = useState<string | undefined>()
  const [title, setTitle]           = useState<string>("")
  const [dragOver, setDragOver]     = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)

  async function processFile(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase()
    if (!ext || !["xlsx", "xls", "csv"].includes(ext)) {
      setError("Format tidak didukung. Gunakan .xlsx, .xls, atau .csv")
      return
    }
    if (file.size > 25 * 1024 * 1024) {
      setError("Ukuran file maksimal 25 MB")
      return
    }

    setError(null)
    setLoading(true)
    try {
      const parsed = await parseXlsxFile(file)
      if (parsed.rows.length === 0) { setError("File tidak mengandung data."); return }
      setRows(parsed.rows)
      setHeaders(parsed.headers)
      setSheetTitle(parsed.sheetTitle)
      setTitle(file.name.replace(/\.[^.]+$/, ""))
      toast.success(`${parsed.rows.length} baris data berhasil dimuat`)
    } catch {
      setError("Gagal membaca file. Pastikan format Excel valid.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Drop zone */}
      <div
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors cursor-pointer
          ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/20"}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault(); setDragOver(false)
          const f = e.dataTransfer.files[0]; if (f) processFile(f)
        }}
        onClick={() => document.getElementById("rp-file-input")?.click()}
      >
        {loading ? (
          <Loader2 className="h-8 w-8 text-muted-foreground animate-spin mb-2" />
        ) : (
          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
        )}
        <p className="text-sm font-medium text-foreground">
          {loading ? "Membaca file..." : "Drag & drop file Excel di sini"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">atau klik untuk memilih (.xlsx, .xls, .csv)</p>
        <input
          id="rp-file-input"
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f) }}
        />
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {/* Reset */}
      {rows.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setRows([]); setTitle(""); setError(null) }}
            className="text-xs"
          >
            Ganti File
          </Button>
        </div>
      )}

      {/* Tabel */}
      {rows.length > 0 && (
        <RealisasiTable
          rows={rows}
          title={title}
          exportFileName={`${title.replace(/\s+/g, "_")}.xlsx`}
        />
      )}
    </div>
  )
}

// ─── Tab: Kelola Sumber (ADMIN only) ─────────────────────────────────────────

function TabKelola({ configs: initialConfigs }: { configs: GDriveConfigRow[] }) {
  const [configs, setConfigs]     = useState<GDriveConfigRow[]>(initialConfigs)
  const [showForm, setShowForm]   = useState(false)
  const [editId, setEditId]       = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const emptyForm: GDriveConfigInput = { nama: "", url: "", sheet_name: "", keterangan: "", urutan: 0 }
  const [form, setForm] = useState<GDriveConfigInput>(emptyForm)

  const parsed = extractGDriveFileId(form.url ?? "")
  const urlValid = !form.url || parsed !== null

  function openAddForm() {
    setForm(emptyForm)
    setEditId(null)
    setShowForm(true)
  }

  function openEditForm(c: GDriveConfigRow) {
    setForm({ nama: c.nama, url: c.url, sheet_name: c.sheet_name ?? "", keterangan: c.keterangan ?? "", urutan: c.urutan })
    setEditId(c.id)
    setShowForm(true)
  }

  function handleSubmit() {
    if (!form.nama?.trim()) { toast.error("Nama tidak boleh kosong"); return }
    if (!form.url?.trim())  { toast.error("URL tidak boleh kosong"); return }
    if (!urlValid)          { toast.error("URL Google Drive tidak dikenali"); return }

    startTransition(async () => {
      if (editId) {
        const result = await updateGDriveConfig(editId, form)
        if (!result.ok) { toast.error(result.pesan); return }
        setConfigs((prev) => prev.map((c) => (c.id === editId ? result.data : c)))
        toast.success("Konfigurasi berhasil diperbarui")
      } else {
        const result = await createGDriveConfig(form)
        if (!result.ok) { toast.error(result.pesan); return }
        setConfigs((prev) => [...prev, result.data])
        toast.success("Konfigurasi berhasil disimpan")
      }
      setShowForm(false)
      setEditId(null)
      setForm(emptyForm)
    })
  }

  function handleDelete(id: string, nama: string) {
    if (!confirm(`Hapus konfigurasi "${nama}"?`)) return
    startTransition(async () => {
      const result = await deleteGDriveConfig(id)
      if (!result.ok) { toast.error(result.pesan); return }
      setConfigs((prev) => prev.filter((c) => c.id !== id))
      toast.success("Konfigurasi dihapus")
    })
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Sumber Data Google Drive</p>
          <p className="text-xs text-muted-foreground mt-0.5">Simpan URL Google Sheets agar mudah dipilih di tab &quot;Dari Google Drive&quot;</p>
        </div>
        <Button size="sm" onClick={openAddForm} className="gap-1.5" disabled={pending}>
          <Plus className="h-3.5 w-3.5" />
          Tambah Sumber
        </Button>
      </div>

      {/* Form tambah/edit */}
      {showForm && (
        <div className="rounded-xl border border-border bg-muted/20 p-4 flex flex-col gap-3">
          <p className="text-sm font-medium">{editId ? "Edit Sumber" : "Tambah Sumber Baru"}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Nama / Label <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. Realisasi Pengesahan 24 Agt"
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                className="h-8 text-sm"
                id="form-nama"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Urutan Tampil</Label>
              <Input
                type="number"
                placeholder="0"
                value={form.urutan ?? 0}
                onChange={(e) => setForm({ ...form, urutan: parseInt(e.target.value) || 0 })}
                className="h-8 text-sm"
                id="form-urutan"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">URL Google Drive / Google Sheets <span className="text-destructive">*</span></Label>
            <Input
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className={`h-8 text-sm font-mono ${form.url && !urlValid ? "border-destructive" : ""}`}
              id="form-url"
            />
            {form.url && parsed && (
              <p className="text-xs text-muted-foreground">
                {parsed.type === "sheet" ? "Google Sheets" : "Google Drive"} terdeteksi — ID: <code className="font-mono bg-muted px-1 rounded">{parsed.id}</code>
              </p>
            )}
            {form.url && !urlValid && (
              <p className="text-xs text-destructive">URL tidak dikenali. Gunakan link Google Drive / Sheets yang valid.</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Nama Tab/Sheet (opsional)</Label>
              <Input
                placeholder="Sheet1"
                value={form.sheet_name ?? ""}
                onChange={(e) => setForm({ ...form, sheet_name: e.target.value })}
                className="h-8 text-sm"
                id="form-sheet-name"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Keterangan (opsional)</Label>
              <Textarea
                placeholder="Deskripsi singkat sumber data ini..."
                value={form.keterangan ?? ""}
                onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                rows={2}
                className="text-sm resize-none"
                id="form-keterangan"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm) }}
              disabled={pending}
            >
              Batal
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={pending} className="gap-1.5">
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {editId ? "Simpan Perubahan" : "Simpan"}
            </Button>
          </div>
        </div>
      )}

      {/* Info cara share */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs space-y-1">
          <p className="font-medium text-foreground">Cara membagikan Google Sheets</p>
          <ol className="list-decimal list-inside space-y-0.5 text-muted-foreground">
            <li>Buka file di Google Sheets / Google Drive</li>
            <li>Klik tombol <strong>Bagikan</strong> (Share) → Ubah akses ke <strong>&quot;Siapa saja yang memiliki link&quot;</strong></li>
            <li>Salin link dan tempel di kolom URL di atas</li>
          </ol>
        </AlertDescription>
      </Alert>

      {/* Daftar konfigurasi */}
      {configs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground text-center">
          <Settings2 className="h-8 w-8 opacity-30" />
          <p className="text-sm">Belum ada sumber yang dikonfigurasi.</p>
          <p className="text-xs">Klik <strong>Tambah Sumber</strong> untuk mulai.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {configs
            .slice()
            .sort((a, b) => a.urutan - b.urutan || a.nama.localeCompare(b.nama))
            .map((c) => (
              <div
                key={c.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">{c.nama}</span>
                    {c.sheet_name && (
                      <Badge variant="outline" className="text-[10px] shrink-0">{c.sheet_name}</Badge>
                    )}
                  </div>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground truncate transition-colors font-mono"
                  >
                    {c.url.length > 60 ? c.url.slice(0, 60) + "…" : c.url}
                  </a>
                  {c.keterangan && (
                    <p className="text-xs text-muted-foreground mt-0.5">{c.keterangan}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => openEditForm(c)}
                    disabled={pending}
                    title="Edit"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(c.id, c.nama)}
                    disabled={pending}
                    title="Hapus"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RealisasiPengesahanClient({ configs, isAdmin }: Props) {
  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Realisasi Pengesahan</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tampilkan data realisasi pengesahan dari Google Drive / Google Sheets atau upload file Excel secara langsung.
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="gdrive">
        <TabsList>
          <TabsTrigger value="gdrive" className="gap-1.5">
            <FolderOpen className="h-3.5 w-3.5" />
            Dari Google Drive
          </TabsTrigger>
          <TabsTrigger value="upload" className="gap-1.5">
            <Upload className="h-3.5 w-3.5" />
            Upload File
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="kelola" className="gap-1.5">
              <Settings2 className="h-3.5 w-3.5" />
              Kelola Sumber
            </TabsTrigger>
          )}
        </TabsList>

        <div className="mt-5">
          <TabsContent value="gdrive" className="mt-0">
            <TabGDrive configs={configs} />
          </TabsContent>

          <TabsContent value="upload" className="mt-0">
            <TabUpload />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="kelola" className="mt-0">
              <TabKelola configs={configs} />
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  )
}
