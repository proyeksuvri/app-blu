"use client"

import { useState } from "react"
import { FolderOpen, Loader2, AlertCircle, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useGDriveImport, extractGDriveFileId } from "@/hooks/use-gdrive-import"

interface GDriveImportTabProps {
  /** Dipanggil saat file berhasil diambil dari Google Drive */
  onFile: (file: File) => void
  /** Teks hint tambahan di bawah input, opsional */
  hint?: string
}

/**
 * Komponen UI untuk mengambil file Excel dari Google Drive via shared link.
 * Plug-and-play ke halaman import manapun:
 *
 * @example
 * <GDriveImportTab onFile={(file) => processFile(file)} />
 */
export function GDriveImportTab({ onFile, hint }: GDriveImportTabProps) {
  const [url, setUrl]     = useState("")
  const [error, setError] = useState<string | null>(null)
  const { fetchFromDrive, loading, progress } = useGDriveImport()

  const parsed   = extractGDriveFileId(url)
  const isValid  = parsed !== null
  const isEmpty  = url.trim() === ""

  async function handleFetch() {
    setError(null)
    const result = await fetchFromDrive(url)
    if (result.error) {
      setError(result.error)
      return
    }
    if (result.file) {
      onFile(result.file)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && isValid && !loading) {
      handleFetch()
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Instruksi singkat */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground space-y-1.5">
        <p className="font-medium text-foreground flex items-center gap-1.5">
          <FolderOpen className="h-4 w-4 shrink-0" />
          Cara menggunakan
        </p>
        <ol className="list-decimal list-inside space-y-1 text-xs leading-relaxed">
          <li>Buka file Excel di Google Drive atau Google Sheets</li>
          <li>
            Klik kanan → <strong>Bagikan</strong> → Ubah akses ke{" "}
            <strong>&quot;Siapa saja yang memiliki link&quot;</strong>
          </li>
          <li>Salin link dan tempel di bawah ini</li>
        </ol>
      </div>

      {/* Input URL */}
      <div className="flex gap-2">
        <Input
          placeholder="Tempel URL Google Drive / Google Sheets di sini…"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError(null) }}
          onKeyDown={handleKeyDown}
          disabled={loading}
          className={`font-mono text-xs ${
            !isEmpty && !isValid ? "border-destructive focus-visible:ring-destructive" : ""
          }`}
          aria-label="URL Google Drive"
          id="gdrive-url-input"
        />
        <Button
          onClick={handleFetch}
          disabled={loading || !isValid}
          className="shrink-0 gap-1.5"
          id="gdrive-fetch-button"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {progress || "Mengambil…"}
            </>
          ) : (
            <>
              <FolderOpen className="h-4 w-4" />
              Ambil File
            </>
          )}
        </Button>
      </div>

      {/* Validasi URL real-time */}
      {!isEmpty && !isValid && (
        <p className="text-xs text-destructive -mt-2">
          URL tidak dikenali. Gunakan link Google Drive / Sheets yang valid.
        </p>
      )}

      {/* Info file ID yang terdeteksi */}
      {isValid && parsed && !loading && (
        <p className="text-xs text-muted-foreground -mt-2">
          {parsed.type === "sheet" ? "Google Sheets" : "Google Drive"} terdeteksi — ID:{" "}
          <code className="font-mono bg-muted px-1 rounded">{parsed.id}</code>
        </p>
      )}

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {/* Hint tambahan dari parent */}
      {hint && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}

      {/* Link ke Google Drive */}
      <div className="flex justify-end">
        <a
          href="https://drive.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          Buka Google Drive
        </a>
      </div>
    </div>
  )
}
