"use client"

import { useState, useRef, useEffect, useTransition } from "react"
import { FileText, Upload, Download, Trash2, Loader2, X, FileUp, AlertTriangle, Eye } from "lucide-react"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { uploadDokumenPanduan, getDownloadUrl, deleteDokumenPanduan, type DokumenPanduan } from "@/app/actions/panduan"

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Upload Dialog ────────────────────────────────────────────────────────────

function UploadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  function handleFileChange(file: File | null) {
    setError(null)
    if (!file) { setSelectedFile(null); return }
    if (file.type !== "application/pdf") { setError("Hanya file PDF yang diizinkan."); return }
    if (file.size > 20 * 1024 * 1024) { setError("Ukuran file maksimal 20 MB."); return }
    setSelectedFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    handleFileChange(file ?? null)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const result = await uploadDokumenPanduan(formData)
      if (!result.ok) { setError(result.pesan); return }
      setSelectedFile(null)
      formRef.current?.reset()
      onClose()
    })
  }

  function handleClose() {
    if (isPending) return
    setSelectedFile(null)
    setError(null)
    formRef.current?.reset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-4 w-4 text-primary" />
            Upload Dokumen PDF
          </DialogTitle>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          {/* Dropzone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed
              px-4 py-8 text-center cursor-pointer transition-colors
              ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              name="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            />
            {selectedFile ? (
              <>
                <FileText className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(selectedFile.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = "" }}
                  className="absolute top-2 right-2 rounded-full p-1 hover:bg-muted"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground/50" />
                <div>
                  <p className="text-sm font-medium text-foreground">Klik atau seret file PDF ke sini</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Maksimal 20 MB</p>
                </div>
              </>
            )}
          </div>

          {/* Nama */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="upload-nama" className="text-xs">Nama Dokumen <span className="text-destructive">*</span></Label>
            <Input
              id="upload-nama"
              name="nama"
              placeholder="cth: SOP Penerimaan Dana 2025"
              required
              disabled={isPending}
            />
          </div>

          {/* Deskripsi */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="upload-deskripsi" className="text-xs">Deskripsi <span className="text-muted-foreground">(opsional)</span></Label>
            <Textarea
              id="upload-deskripsi"
              name="deskripsi"
              placeholder="Penjelasan singkat isi dokumen..."
              rows={2}
              disabled={isPending}
              className="resize-none text-sm"
            />
          </div>

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
          )}

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={isPending}>
              Batal
            </Button>
            <Button type="submit" size="sm" disabled={isPending || !selectedFile}>
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────

function DeleteDialog({
  item,
  onClose,
}: {
  item: DokumenPanduan | null
  onClose: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleDelete() {
    if (!item) return
    setError(null)
    startTransition(async () => {
      const result = await deleteDokumenPanduan(item.id)
      if (!result.ok) { setError(result.pesan); return }
      onClose()
    })
  }

  return (
    <Dialog open={!!item} onOpenChange={(v) => { if (!v && !isPending) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Hapus Dokumen?
          </DialogTitle>
          <DialogDescription>
            Dokumen <span className="font-medium text-foreground">&ldquo;{item?.nama}&rdquo;</span> akan dihapus permanen beserta filenya.
            Tindakan ini tidak bisa dibatalkan.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>}
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isPending}>
            Batal
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Hapus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── PDF Viewer Dialog ────────────────────────────────────────────────────────

function PdfViewerDialog({
  item,
  onClose,
}: {
  item: { id: string; nama: string } | null
  onClose: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch signed URL setiap kali item berubah
  useEffect(() => {
    if (!item) return

    async function fetchUrl() {
      setUrl(null)
      setError(null)
      setLoading(true)
      const result = await getDownloadUrl(item!.id)
      if (!result.ok) {
        setError(result.pesan)
      } else {
        setUrl(result.data.url)
      }
      setLoading(false)
    }

    fetchUrl()
  }, [item])

  function handleClose() {
    setUrl(null)
    setError(null)
    setLoading(false)
    onClose()
  }

  return (
    <Dialog open={!!item} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent
        className="flex flex-col gap-0 p-0 sm:max-w-4xl h-[90vh] max-h-[90vh]"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-medium text-foreground truncate">
              {item?.nama}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {url && (
              <a
                href={url}
                download={`${item?.nama}.pdf`}
                target="_blank"
                rel="noreferrer"
              >
                <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs">
                  <Download className="h-3 w-3" />
                  Unduh
                </Button>
              </a>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="relative flex-1 bg-muted/30 overflow-hidden">
          {/* Loading */}
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Memuat dokumen...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* PDF iframe */}
          {url && (
            <iframe
              key={url}
              src={`${url}#toolbar=1&view=FitH`}
              className="h-full w-full border-0"
              title={item?.nama ?? "Dokumen PDF"}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Dokumen Card ─────────────────────────────────────────────────────────────

function DokumenCard({
  dok,
  isAdmin,
  onDelete,
  onView,
}: {
  dok: DokumenPanduan
  isAdmin: boolean
  onDelete: (dok: DokumenPanduan) => void
  onView: (dok: DokumenPanduan) => void
}) {
  const [downloading, setDownloading] = useState(false)

  async function handleDownload() {
    setDownloading(true)
    try {
      const result = await getDownloadUrl(dok.id)
      if (!result.ok) { alert(result.pesan); return }
      const a = document.createElement("a")
      a.href = result.data.url
      a.download = `${result.data.nama}.pdf`
      a.target = "_blank"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="group flex items-start gap-4 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-sm">
      {/* Icon */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <FileText className="h-5 w-5 text-primary" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{dok.nama}</p>
        {dok.deskripsi && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{dok.deskripsi}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span>{formatBytes(dok.file_size)}</span>
          <span>·</span>
          <span>
            {format(new Date(dok.created_at), "dd MMM yyyy", { locale: idLocale })}
          </span>
          {dok.uploader_nama && (
            <>
              <span>·</span>
              <span>Oleh {dok.uploader_nama}</span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 text-xs"
          onClick={() => onView(dok)}
        >
          <Eye className="h-3.5 w-3.5" />
          Lihat
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 text-xs"
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Download className="h-3.5 w-3.5" />
          }
          Unduh
        </Button>
        {isAdmin && (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(dok)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── Main Client Component ────────────────────────────────────────────────────

export function PanduanUploadButton({ onClick }: { onClick: () => void }) {
  return (
    <Button size="sm" onClick={onClick} className="gap-2">
      <Upload className="h-3.5 w-3.5" />
      Upload PDF
    </Button>
  )
}

export function PanduanClient({
  dokumen,
  isAdmin,
}: {
  dokumen: DokumenPanduan[]
  isAdmin: boolean
}) {
  const [uploadOpen, setUploadOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DokumenPanduan | null>(null)
  const [viewTarget, setViewTarget] = useState<DokumenPanduan | null>(null)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Panduan &amp; Aturan</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Dokumen panduan dan aturan penggunaan sistem. Klik tombol unduh untuk mengunduh file PDF.
          </p>
        </div>
        {isAdmin && (
          <div className="shrink-0">
            <Button size="sm" onClick={() => setUploadOpen(true)} className="gap-2">
              <Upload className="h-3.5 w-3.5" />
              Upload PDF
            </Button>
          </div>
        )}
      </div>

      {/* List */}
      {dokumen.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <FileText className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Belum ada dokumen</p>
            {isAdmin && (
              <p className="mt-1 text-xs text-muted-foreground/70">
                Klik &ldquo;Upload PDF&rdquo; untuk menambahkan dokumen panduan pertama.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {dokumen.map((dok) => (
            <DokumenCard
              key={dok.id}
              dok={dok}
              isAdmin={isAdmin}
              onDelete={setDeleteTarget}
              onView={setViewTarget}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />
      <DeleteDialog item={deleteTarget} onClose={() => setDeleteTarget(null)} />
      <PdfViewerDialog item={viewTarget} onClose={() => setViewTarget(null)} />
    </div>
  )
}

