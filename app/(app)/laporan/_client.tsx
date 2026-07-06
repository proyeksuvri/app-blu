"use client"

import { useState, useTransition, useRef, useEffect, useCallback } from "react"
import { Download, FileText, Upload, Trash2, FileDown, Eye, X, ChevronDown, ChevronUp } from "lucide-react"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { PenerimaanStatusBadge } from "@/components/penerimaan-status-badge"
import { EmptyState } from "@/components/empty-state"
import { rekapHarian, rekapBulanan, rekapPerRekening, rekapBulananFull, rekapRekeningKoran, type RekeningKoranResult } from "@/app/actions/laporan"
import { listDokumenRekeningKoran, uploadDokumenRekeningKoran, getDokumenDownloadUrl, deleteDokumenRekeningKoran, type DokumenRekeningKoran } from "@/app/actions/dokumen-rekening-koran"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination"

const HARIAN_PAGE_SIZE = 20

function buildPages(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | "…")[] = [1]
  if (current > 3) pages.push("…")
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i)
  if (current < total - 2) pages.push("…")
  pages.push(total)
  return pages
}

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)

const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"]

type HarianRow = {
  nomor_bukti: string; jumlah: number; status: string; nomor_referensi: string | null
  jenis: { nama?: string } | null; unit: { kode?: string } | null
  rekening: { nama_bank?: string } | null; metode: { nama?: string } | null
}
type KategoriGroup = { kodeKategori: string; namaKategori: string; total: number; jenis: Record<string, { kode: string; nama: string; total: number }> }
type Rekening = { kode: string; nama_bank: string; nama_rekening: string; nomor_rekening: string; total: number }

type RekeningKoran = { id: string; nama_bank: string; nama_rekening: string; nomor_rekening: string }

const BULAN_OPT = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"]

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function DokumenUploadSection({ rekeningId, tahun, isAdmin }: { rekeningId: string; tahun: number; isAdmin?: boolean }) {
  const [panelOpen, setPanelOpen] = useState(false)
  const [docs, setDocs] = useState<DokumenRekeningKoran[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [bulan, setBulan] = useState(new Date().getMonth() + 1)
  const [nama, setNama] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Viewer state
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerUrl, setViewerUrl] = useState("")
  const [viewerNama, setViewerNama] = useState("")
  const [viewerType, setViewerType] = useState<"pdf" | "image">("pdf")
  const [viewerLoading, setViewerLoading] = useState(false)

  const reload = useCallback(async () => {
    if (!rekeningId) return
    setLoading(true)
    const data = await listDokumenRekeningKoran(rekeningId, tahun)
    setDocs(data)
    setLoading(false)
  }, [rekeningId, tahun])

  useEffect(() => { reload() }, [reload])

  function handleFile(f: File | null) {
    setFile(f)
    if (f && !nama) setNama(f.name.replace(/\.[^.]+$/, ""))
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !rekeningId) return
    setUploading(true)
    const fd = new FormData()
    fd.append("file", file)
    fd.append("rekening_bank_id", rekeningId)
    fd.append("tahun", String(tahun))
    fd.append("bulan", String(bulan))
    fd.append("nama", nama || file.name)
    const result = await uploadDokumenRekeningKoran(fd)
    setUploading(false)
    if (!result.ok) { alert(result.pesan); return }
    setFile(null); setNama("")
    if (fileRef.current) fileRef.current.value = ""
    reload()
  }

  async function handleDownload(id: string) {
    const result = await getDokumenDownloadUrl(id)
    if (!result.ok) { alert(result.pesan); return }
    window.open(result.data.url, "_blank")
  }

  async function handleView(doc: DokumenRekeningKoran) {
    setViewerLoading(true)
    const result = await getDokumenDownloadUrl(doc.id)
    setViewerLoading(false)
    if (!result.ok) { alert(result.pesan); return }
    const isPdf = doc.file_path.endsWith(".pdf")
    setViewerType(isPdf ? "pdf" : "image")
    setViewerUrl(result.data.url)
    setViewerNama(doc.nama)
    setViewerOpen(true)
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus dokumen ini?")) return
    setDeletingId(id)
    const result = await deleteDokumenRekeningKoran(id)
    setDeletingId(null)
    if (!result.ok) { alert(result.pesan); return }
    reload()
  }

  return (
    <>
      {/* Viewer Dialog */}
      {viewerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <p className="text-sm font-medium text-foreground truncate max-w-[70%]">{viewerNama}</p>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => window.open(viewerUrl, "_blank")} className="gap-1.5 text-muted-foreground hover:text-foreground">
                <FileDown className="h-4 w-4" />Unduh
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => setViewerOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {/* Content */}
          <div className="flex-1 overflow-auto p-4">
            {viewerType === "pdf" ? (
              <iframe
                src={viewerUrl}
                className="w-full h-full min-h-[80vh] rounded-lg border border-border"
                title={viewerNama}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={viewerUrl} alt={viewerNama} className="max-w-full max-h-[85vh] rounded-lg object-contain" />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => setPanelOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Dokumen Rekening Koran</span>
            {docs.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {docs.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {loading && <span className="text-xs text-muted-foreground">Memuat...</span>}
            {panelOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </button>


        {panelOpen && (
        <div className="border-t border-border p-4 flex flex-col gap-3">

        {/* Form Upload */}

        {isAdmin && (
          <form onSubmit={handleUpload} className="rounded-xl border border-dashed border-border p-4 flex flex-col gap-3">
            <div
              className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-colors cursor-pointer py-6 ${
                dragOver ? "border-primary bg-primary/5" : "border-border/50 hover:border-border"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0] ?? null) }}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-6 w-6 text-muted-foreground" />
              {file ? (
                <>
                  <p className="text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">Klik atau drag & drop file</p>
                  <p className="text-xs text-muted-foreground/60">PDF, JPG, PNG — maks 30 MB</p>
                </>
              )}
              <input
                ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Bulan</label>
                <select
                  value={bulan}
                  onChange={(e) => setBulan(parseInt(e.target.value))}
                  className="h-9 rounded-md border border-border bg-muted/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {BULAN_OPT.map((b, i) => <option key={i + 1} value={i + 1}>{b}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Nama Dokumen</label>
                <Input
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Nama file/dokumen"
                  className="bg-muted/50 border-border text-foreground text-sm"
                />
              </div>
            </div>

            <Button type="submit" size="sm" disabled={!file || uploading} className="self-end gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              {uploading ? "Mengunggah..." : "Upload"}
            </Button>
          </form>
        )}

        {/* Daftar dokumen */}
        {docs.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">
            Belum ada dokumen rekening koran yang diunggah untuk tahun {tahun}
          </p>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs text-muted-foreground">Bulan</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Nama Dokumen</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Ukuran</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Diunggah</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((doc) => (
                  <TableRow key={doc.id} className="border-border/50">
                    <TableCell className="text-sm font-medium text-foreground/80 py-2.5">{doc.nama_bulan}</TableCell>
                    <TableCell className="text-sm text-foreground/70 py-2.5">{doc.nama}</TableCell>
                    <TableCell className="text-xs text-muted-foreground py-2.5">{formatBytes(doc.file_size)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground py-2.5">{doc.uploader_nama ?? "—"}</TableCell>
                    <TableCell className="py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost" size="icon-sm"
                          onClick={() => handleView(doc)}
                          title="Lihat"
                          className="text-muted-foreground hover:text-foreground"
                          disabled={viewerLoading}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon-sm"
                          onClick={() => handleDownload(doc.id)}
                          title="Unduh"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <FileDown className="h-3.5 w-3.5" />
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost" size="icon-sm"
                            onClick={() => handleDelete(doc.id)}
                            disabled={deletingId === doc.id}
                            title="Hapus"
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        </div>)}
      </div>
    </>
  )
}

type Props = {
  initialHarian: { tanggal: string; rows: HarianRow[]; total: number }
  initialBulanan: { tahun: number; bulan: number; byKategori: KategoriGroup[]; total: number }
  initialRekening: { tglAwal: string; tglAkhir: string; byRekening: Rekening[]; total: number }
  rekeningList: RekeningKoran[]
  initialRekeningKoran: RekeningKoranResult | null
  initialRekeningKoranId: string
  initialRekeningKoranTahun: number
  isAdmin?: boolean
}

export function LaporanClient({ initialHarian, initialBulanan, initialRekening, rekeningList, initialRekeningKoran, initialRekeningKoranId, initialRekeningKoranTahun, isAdmin }: Props) {
  const [pending, startTransition] = useTransition()
  const [pdfLoadingBulanan, setPdfLoadingBulanan] = useState(false)
  const [pdfLoadingHarian, setPdfLoadingHarian] = useState(false)
  const [pdfLoadingRekening, setPdfLoadingRekening] = useState(false)

  // Harian state
  const [tanggal, setTanggal] = useState(initialHarian.tanggal)
  const [harianRows, setHarianRows] = useState(initialHarian.rows)
  const [harianTotal, setHarianTotal] = useState(initialHarian.total)
  const [harianPage, setHarianPage] = useState(1)

  // Bulanan state
  const [tahun, setTahun] = useState(initialBulanan.tahun)
  const [bulan, setBulan] = useState(initialBulanan.bulan)
  const [byKategori, setByKategori] = useState(initialBulanan.byKategori)
  const [bulananTotal, setBulananTotal] = useState(initialBulanan.total)

  // Per-rekening state
  const [tglAwal, setTglAwal] = useState(initialRekening.tglAwal)
  const [tglAkhir, setTglAkhir] = useState(initialRekening.tglAkhir)
  const [byRekening, setByRekening] = useState(initialRekening.byRekening)
  const [rekeningTotal, setRekeningTotal] = useState(initialRekening.total)

  const tahunList = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  function fetchHarian(tgl: string) {
    setTanggal(tgl)
    setHarianPage(1)
    startTransition(async () => {
      const data = await rekapHarian(tgl)
      setHarianRows(data.rows)
      setHarianTotal(data.total)
    })
  }

  function fetchBulanan(t: number, b: number) {
    setTahun(t); setBulan(b)
    startTransition(async () => {
      const data = await rekapBulanan(t, b)
      setByKategori(data.byKategori)
      setBulananTotal(data.total)
    })
  }

  function fetchRekening(awal: string, akhir: string) {
    setTglAwal(awal); setTglAkhir(akhir)
    startTransition(async () => {
      const data = await rekapPerRekening(awal, akhir)
      setByRekening(data.byRekening)
      setRekeningTotal(data.total)
    })
  }

  // Rekening Koran state
  const [koranRekeningId, setKoranRekeningId] = useState(initialRekeningKoranId)
  const [koranTahun, setKoranTahun] = useState(initialRekeningKoranTahun)
  const [koranData, setKoranData] = useState<RekeningKoranResult | null>(initialRekeningKoran)
  const [tabelKoranTerlihat, setTabelKoranTerlihat] = useState(false)

  const koranTahunList = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i)

  function fetchKoran(rid: string, thn: number) {
    setKoranRekeningId(rid)
    setKoranTahun(thn)
    startTransition(async () => {
      const data = await rekapRekeningKoran(rid, thn)
      setKoranData(data)
    })
  }

  async function exportKoran() {
    if (!koranData) return
    const XLSX = await import("xlsx")
    const rows: Record<string, unknown>[] = [
      { "Keterangan": "Saldo Awal", "Penerimaan": "", "Pengeluaran": "", "Saldo": koranData.saldoAwal },
    ]
    for (const b of koranData.perBulan) {
      rows.push({ "Keterangan": b.namaBulan, "Penerimaan": b.penerimaan, "Pengeluaran": b.pengeluaran, "Saldo": b.saldo })
    }
    rows.push({ "Keterangan": "Saldo Akhir", "Penerimaan": koranData.totalPenerimaan, "Pengeluaran": koranData.totalPengeluaran, "Saldo": koranData.saldoAkhir })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Rekening Koran")
    XLSX.writeFile(wb, `rekening-koran-${koranData.namaBank.replace(/\s+/g, "-")}-${koranData.tahun}.xlsx`)
  }

  async function exportHarianPDF() {
    setPdfLoadingHarian(true)
    try {
      const { pdf } = await import("@react-pdf/renderer")
      const { LaporanHarianPDF } = await import("@/components/pdf/laporan-harian-pdf")
      const blob = await pdf(<LaporanHarianPDF tanggal={tanggal} rows={harianRows} total={harianTotal} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `laporan-harian-${tanggal}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setPdfLoadingHarian(false)
    }
  }

  async function exportBulananPDF() {
    setPdfLoadingBulanan(true)
    try {
      const fullData = await rekapBulananFull(tahun, bulan)
      const { pdf } = await import("@react-pdf/renderer")
      const { LaporanBulananPDF } = await import("@/components/pdf/laporan-bulanan-pdf")
      const blob = await pdf(<LaporanBulananPDF data={fullData} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `laporan-bulanan-${tahun}-${String(bulan).padStart(2, "0")}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setPdfLoadingBulanan(false)
    }
  }

  async function exportRekeningPDF() {
    setPdfLoadingRekening(true)
    try {
      const { pdf } = await import("@react-pdf/renderer")
      const { LaporanRekeningPDF } = await import("@/components/pdf/laporan-rekening-pdf")
      const blob = await pdf(<LaporanRekeningPDF tglAwal={tglAwal} tglAkhir={tglAkhir} byRekening={byRekening} total={rekeningTotal} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `rekap-rekening-${tglAwal}-sd-${tglAkhir}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setPdfLoadingRekening(false)
    }
  }

  async function exportHarian() {
    const XLSX = await import("xlsx")
    const data = harianRows.map((r) => ({
      "Nomor Bukti": r.nomor_bukti, "Jenis": r.jenis?.nama ?? "—", "Unit": r.unit?.kode ?? "—",
      "Rekening": r.rekening?.nama_bank ?? "—", "Metode": r.metode?.nama ?? "—",
      "No. Referensi": r.nomor_referensi ?? "", "Jumlah": r.jumlah, "Status": r.status,
    }))
    data.push({ "Nomor Bukti": "TOTAL", "Jenis": "", "Unit": "", "Rekening": "", "Metode": "", "No. Referensi": "", "Jumlah": harianTotal, "Status": "" })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "Laporan Harian")
    XLSX.writeFile(wb, `laporan-harian-${tanggal}.xlsx`)
  }

  async function exportBulanan() {
    const XLSX = await import("xlsx")
    const rows: Record<string, unknown>[] = []
    for (const kat of byKategori) {
      rows.push({ "Kategori": kat.namaKategori, "Jenis": "", "Total": kat.total })
      for (const j of Object.values(kat.jenis)) rows.push({ "Kategori": "", "Jenis": j.nama, "Total": j.total })
    }
    rows.push({ "Kategori": "TOTAL", "Jenis": "", "Total": bulananTotal })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Laporan Bulanan")
    XLSX.writeFile(wb, `laporan-bulanan-${tahun}-${String(bulan).padStart(2, "0")}.xlsx`)
  }

  async function exportRekening() {
    const XLSX = await import("xlsx")
    const data = byRekening.map((r) => ({
      "Kode": r.kode, "Nama Bank": r.nama_bank, "Nama Rekening": r.nama_rekening,
      "Nomor Rekening": r.nomor_rekening, "Total Penerimaan": r.total,
    }))
    data.push({ "Kode": "TOTAL", "Nama Bank": "", "Nama Rekening": "", "Nomor Rekening": "", "Total Penerimaan": rekeningTotal })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "Rekap Rekening")
    XLSX.writeFile(wb, `rekap-rekening-${tglAwal}-sd-${tglAkhir}.xlsx`)
  }

  const tglLabel = format(new Date(tanggal + "T00:00:00"), "EEEE, dd MMMM yyyy", { locale: id })

  return (
    <Tabs defaultValue="harian">
      <TabsList>
        <TabsTrigger value="harian">Harian</TabsTrigger>
        <TabsTrigger value="bulanan">Bulanan</TabsTrigger>
        <TabsTrigger value="per-rekening">Per Rekening</TabsTrigger>
        <TabsTrigger value="rekening-koran">Rekening Koran</TabsTrigger>
      </TabsList>

      {/* Tab Harian */}
      <TabsContent value="harian">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <Input type="date" value={tanggal} onChange={(e) => fetchHarian(e.target.value)}
              className="w-44 bg-muted/50 border-border text-foreground" disabled={pending} />
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={exportHarian} className="gap-1.5 text-muted-foreground hover:text-foreground">
                <Download className="h-4 w-4" />Excel
              </Button>
              <Button variant="ghost" size="sm" onClick={exportHarianPDF} disabled={pdfLoadingHarian} className="gap-1.5 text-muted-foreground hover:text-foreground">
                <FileText className="h-4 w-4" />{pdfLoadingHarian ? "..." : "PDF"}
              </Button>
            </div>
          </div>

          {harianRows.length === 0 ? (
            <EmptyState message={`Tidak ada penerimaan pada ${tglLabel}`} />
          ) : (() => {
            const harianTotalPages = Math.ceil(harianRows.length / HARIAN_PAGE_SIZE)
            const pagedRows = harianRows.slice((harianPage - 1) * HARIAN_PAGE_SIZE, harianPage * HARIAN_PAGE_SIZE)
            return (
              <div className="flex flex-col gap-2">
                <div className="rounded-xl border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground text-xs">No. Bukti</TableHead>
                        <TableHead className="text-muted-foreground text-xs">Jenis</TableHead>
                        <TableHead className="text-muted-foreground text-xs">Unit</TableHead>
                        <TableHead className="text-muted-foreground text-xs">Metode</TableHead>
                        <TableHead className="text-muted-foreground text-xs text-right">Jumlah</TableHead>
                        <TableHead className="text-muted-foreground text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedRows.map((r) => (
                        <TableRow key={r.nomor_bukti} className="border-border/50">
                          <TableCell className="text-xs font-mono text-foreground/70 py-2">{r.nomor_bukti}</TableCell>
                          <TableCell className="text-xs text-foreground/70 py-2">{r.jenis?.nama ?? "—"}</TableCell>
                          <TableCell className="text-xs text-foreground/50 py-2">{r.unit?.kode ?? "—"}</TableCell>
                          <TableCell className="text-xs text-foreground/50 py-2">{r.metode?.nama ?? "—"}</TableCell>
                          <TableCell className="text-xs text-foreground/80 py-2 text-right font-medium">{rupiah(r.jumlah)}</TableCell>
                          <TableCell className="text-xs py-2">
                            <PenerimaanStatusBadge status={r.status as "draft" | "verified" | "void"} />
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="border-t-2 border-border font-semibold">
                        <TableCell colSpan={4} className="text-xs text-foreground/60 py-2">TOTAL</TableCell>
                        <TableCell className="text-sm text-foreground font-bold py-2 text-right">{rupiah(harianTotal)}</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                {harianTotalPages > 1 && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{harianRows.length} transaksi · halaman {harianPage} dari {harianTotalPages}</span>
                    <Pagination className="w-auto mx-0">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setHarianPage((p) => Math.max(1, p - 1)) }}
                            aria-disabled={harianPage === 1} className={harianPage === 1 ? "pointer-events-none opacity-40" : ""} text="Sebelumnya" />
                        </PaginationItem>
                        {buildPages(harianPage, harianTotalPages).map((p, i) =>
                          p === "…" ? (
                            <PaginationItem key={`e${i}`}><PaginationEllipsis /></PaginationItem>
                          ) : (
                            <PaginationItem key={p}>
                              <PaginationLink href="#" isActive={p === harianPage} onClick={(e) => { e.preventDefault(); setHarianPage(p) }}>{p}</PaginationLink>
                            </PaginationItem>
                          )
                        )}
                        <PaginationItem>
                          <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setHarianPage((p) => Math.min(harianTotalPages, p + 1)) }}
                            aria-disabled={harianPage === harianTotalPages} className={harianPage === harianTotalPages ? "pointer-events-none opacity-40" : ""} text="Berikutnya" />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      </TabsContent>

      {/* Tab Bulanan */}
      <TabsContent value="bulanan">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex gap-2">
              <Select value={String(bulan)} onValueChange={(v) => v && fetchBulanan(tahun, parseInt(v))}>
                <SelectTrigger className="w-36 bg-muted/50 border-border text-foreground">
                  <span className="flex flex-1 text-left text-sm truncate">{BULAN[bulan - 1]}</span>
                </SelectTrigger>
                <SelectContent>
                  {BULAN.map((b, i) => <SelectItem key={i + 1} value={String(i + 1)}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={String(tahun)} onValueChange={(v) => v && fetchBulanan(parseInt(v), bulan)}>
                <SelectTrigger className="w-28 bg-muted/50 border-border text-foreground">
                  <span className="flex flex-1 text-left text-sm truncate">{tahun}</span>
                </SelectTrigger>
                <SelectContent>
                  {tahunList.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={exportBulanan} className="gap-1.5 text-muted-foreground hover:text-foreground">
                <Download className="h-4 w-4" />Excel
              </Button>
              <Button variant="ghost" size="sm" onClick={exportBulananPDF} disabled={pdfLoadingBulanan} className="gap-1.5 text-muted-foreground hover:text-foreground">
                <FileText className="h-4 w-4" />{pdfLoadingBulanan ? "..." : "PDF"}
              </Button>
            </div>
          </div>

          {byKategori.length === 0 ? (
            <EmptyState message={`Tidak ada penerimaan pada ${BULAN[bulan - 1]} ${tahun}`} />
          ) : (
            <div className="flex flex-col gap-3">
              {byKategori.map((kat) => (
                <div key={kat.kodeKategori} className="rounded-xl border border-border overflow-hidden">
                  <div className="flex items-center justify-between bg-muted/50 px-4 py-3">
                    <span className="text-sm font-semibold text-foreground">{kat.namaKategori}</span>
                    <span className="text-sm font-bold text-foreground">{rupiah(kat.total)}</span>
                  </div>
                  <div className="divide-y divide-border/50">
                    {Object.values(kat.jenis).map((j) => (
                      <div key={j.kode} className="flex items-center justify-between px-6 py-2.5">
                        <span className="text-sm text-foreground/70">{j.nama}</span>
                        <span className="text-sm text-foreground/80">{rupiah(j.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
                <span className="text-sm font-semibold text-foreground/80">TOTAL BULAN INI</span>
                <span className="text-base font-bold text-foreground">{rupiah(bulananTotal)}</span>
              </div>
            </div>
          )}
        </div>
      </TabsContent>

      {/* Tab Per Rekening */}
      <TabsContent value="per-rekening">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Dari</Label>
                <Input type="date" value={tglAwal} onChange={(e) => fetchRekening(e.target.value, tglAkhir)}
                  className="w-40 bg-muted/50 border-border text-foreground" disabled={pending} />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Sampai</Label>
                <Input type="date" value={tglAkhir} onChange={(e) => fetchRekening(tglAwal, e.target.value)}
                  className="w-40 bg-muted/50 border-border text-foreground" disabled={pending} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={exportRekening} className="gap-1.5 text-muted-foreground hover:text-foreground">
                <Download className="h-4 w-4" />Excel
              </Button>
              <Button variant="ghost" size="sm" onClick={exportRekeningPDF} disabled={pdfLoadingRekening} className="gap-1.5 text-muted-foreground hover:text-foreground">
                <FileText className="h-4 w-4" />{pdfLoadingRekening ? "..." : "PDF"}
              </Button>
            </div>
          </div>

          {byRekening.length === 0 ? (
            <EmptyState message="Tidak ada data untuk periode ini" />
          ) : (
            <div className="flex flex-col gap-2">
              {byRekening.map((r) => (
                <div key={r.kode} className="rounded-xl border border-border px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{r.nama_bank}</p>
                    <p className="text-xs text-muted-foreground">{r.nama_rekening} — {r.nomor_rekening}</p>
                  </div>
                  <span className="text-sm font-bold text-foreground">{rupiah(r.total)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-xl bg-muted px-5 py-4">
                <span className="text-sm font-semibold text-foreground/80">TOTAL</span>
                <span className="text-base font-bold text-foreground">{rupiah(rekeningTotal)}</span>
              </div>
            </div>
          )}
        </div>
      </TabsContent>

      {/* Tab Rekening Koran */}
      <TabsContent value="rekening-koran">
        <div className="flex flex-col gap-4">
          {/* Controls */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Select value={koranRekeningId} onValueChange={(v) => v && fetchKoran(v, koranTahun)} disabled={pending}>
                <SelectTrigger className="w-64 bg-muted/50 border-border text-foreground">
                  <span className="flex flex-1 text-left text-sm truncate">
                    {rekeningList.find(r => r.id === koranRekeningId)
                      ? `${rekeningList.find(r => r.id === koranRekeningId)!.nama_bank} — ${rekeningList.find(r => r.id === koranRekeningId)!.nomor_rekening}`
                      : "Pilih rekening..."}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {rekeningList.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.nama_bank} — {r.nomor_rekening}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(koranTahun)} onValueChange={(v) => v && fetchKoran(koranRekeningId, parseInt(v))} disabled={pending}>
                <SelectTrigger className="w-28 bg-muted/50 border-border text-foreground">
                  <span className="flex flex-1 text-left text-sm truncate">{koranTahun}</span>
                </SelectTrigger>
                <SelectContent>
                  {koranTahunList.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button variant="ghost" size="sm" onClick={exportKoran} disabled={!koranData || pending} className="gap-1.5 text-muted-foreground hover:text-foreground">
              <Download className="h-4 w-4" />Excel
            </Button>
          </div>

          {/* Info rekening */}
          {koranData && (
            <p className="text-xs text-muted-foreground">
              {koranData.namaRekening} · {koranData.nomorRekening}
            </p>
          )}

          {/* Kartu ringkasan */}
          {koranData && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Saldo Awal", value: koranData.saldoAwal, note: `1 Jan ${koranData.tahun}` },
                { label: "Total Penerimaan", value: koranData.totalPenerimaan, note: "Debit", positive: true },
                { label: "Total Pengeluaran", value: koranData.totalPengeluaran, note: "Kredit", negative: true },
                { label: "Saldo Akhir", value: koranData.saldoAkhir, note: `31 Des ${koranData.tahun}`, bold: true },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-border p-4 flex flex-col gap-1">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className={`text-sm font-semibold ${
                    item.bold ? "text-foreground" :
                    item.positive ? "text-emerald-500" :
                    item.negative ? "text-rose-500" :
                    "text-foreground/80"
                  }`}>{rupiah(item.value)}</p>
                  <p className="text-xs text-muted-foreground/60">{item.note}</p>
                </div>
              ))}
            </div>
          )}

          {/* Tabel per bulan */}
          {!koranData ? (
            <EmptyState message={koranRekeningId ? "Belum ada data untuk rekening dan tahun ini" : "Pilih rekening terlebih dahulu"} />
          ) : (
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="w-full flex items-center justify-between"
                onClick={() => setTabelKoranTerlihat(!tabelKoranTerlihat)}
              >
                <span>Rincian Bulanan</span>
                {tabelKoranTerlihat ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              
              {tabelKoranTerlihat && (
                <div className="rounded-xl border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground text-xs">Bulan</TableHead>
                        <TableHead className="text-muted-foreground text-xs text-right">Penerimaan (Debit)</TableHead>
                        <TableHead className="text-muted-foreground text-xs text-right">Pengeluaran (Kredit)</TableHead>
                        <TableHead className="text-muted-foreground text-xs text-right">Saldo Akhir</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="border-border/50 bg-muted/20">
                        <TableCell className="text-xs font-medium text-foreground/80 py-2.5">Saldo Awal (1 Jan {koranData.tahun})</TableCell>
                        <TableCell className="text-xs text-foreground/30 py-2.5 text-right">—</TableCell>
                        <TableCell className="text-xs text-foreground/30 py-2.5 text-right">—</TableCell>
                        <TableCell className="text-xs font-semibold text-foreground py-2.5 text-right">{rupiah(koranData.saldoAwal)}</TableCell>
                      </TableRow>
                      {koranData.perBulan.map((b) => (
                        <TableRow key={b.bulan} className="border-border/50">
                          <TableCell className="text-sm text-foreground/70 py-2.5">{b.namaBulan}</TableCell>
                          <TableCell className={`text-sm py-2.5 text-right ${b.penerimaan > 0 ? "text-emerald-500" : "text-foreground/30"}`}>
                            {b.penerimaan > 0 ? rupiah(b.penerimaan) : "—"}
                          </TableCell>
                          <TableCell className={`text-sm py-2.5 text-right ${b.pengeluaran > 0 ? "text-rose-500" : "text-foreground/30"}`}>
                            {b.pengeluaran > 0 ? rupiah(b.pengeluaran) : "—"}
                          </TableCell>
                          <TableCell className="text-sm font-medium text-foreground/80 py-2.5 text-right">{rupiah(b.saldo)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="border-t-2 border-border bg-muted/30">
                        <TableCell className="text-xs font-semibold text-foreground/70 py-3">SALDO AKHIR</TableCell>
                        <TableCell className="text-sm font-bold text-emerald-500 py-3 text-right">{rupiah(koranData.totalPenerimaan)}</TableCell>
                        <TableCell className="text-sm font-bold text-rose-500 py-3 text-right">{rupiah(koranData.totalPengeluaran)}</TableCell>
                        <TableCell className="text-base font-bold text-foreground py-3 text-right">{rupiah(koranData.saldoAkhir)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {/* Divider */}
          {koranRekeningId && (
            <div className="border-t border-border/50 pt-4 mt-2">
              <DokumenUploadSection rekeningId={koranRekeningId} tahun={koranTahun} isAdmin={isAdmin} />
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  )
}
