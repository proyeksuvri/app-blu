import { useState } from "react"

export type GDriveFileType = "file" | "sheet"

export interface GDriveImportResult {
  file: File | null
  error: string | null
}

/**
 * Ekstrak Google Drive file ID dari berbagai format URL yang umum:
 * - https://drive.google.com/file/d/{ID}/view
 * - https://drive.google.com/open?id={ID}
 * - https://drive.google.com/uc?id={ID}
 * - https://docs.google.com/spreadsheets/d/{ID}/edit
 * - https://docs.google.com/spreadsheets/d/{ID}/export
 * - ID langsung (tanpa URL)
 */
export function extractGDriveFileId(input: string): { id: string; type: GDriveFileType } | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  // Google Sheets URL
  const sheetsMatch = trimmed.match(/docs\.google\.com\/spreadsheets\/d\/([\w-]+)/i)
  if (sheetsMatch) return { id: sheetsMatch[1], type: "sheet" }

  // Drive file URL — /file/d/{ID}/
  const fileMatch = trimmed.match(/drive\.google\.com\/file\/d\/([\w-]+)/i)
  if (fileMatch) return { id: fileMatch[1], type: "file" }

  // Drive open/uc URL — ?id={ID}
  const queryMatch = trimmed.match(/[?&]id=([\w-]+)/i)
  if (queryMatch) return { id: queryMatch[1], type: "file" }

  // Bare ID (hanya alphanumeric + dash, panjang minimal 10)
  if (/^[\w-]{10,}$/.test(trimmed)) return { id: trimmed, type: "file" }

  return null
}

/**
 * Hook untuk mengambil file Excel dari Google Drive melalui server proxy.
 *
 * @example
 * const { fetchFromDrive, loading, progress } = useGDriveImport()
 * const file = await fetchFromDrive(driveUrl)
 * if (file) processFile(file)
 */
export function useGDriveImport() {
  const [loading, setLoading]   = useState(false)
  const [progress, setProgress] = useState<string>("")

  async function fetchFromDrive(urlOrId: string): Promise<GDriveImportResult> {
    const parsed = extractGDriveFileId(urlOrId)

    if (!parsed) {
      return { file: null, error: "URL Google Drive tidak dikenali. Pastikan URL benar atau gunakan ID file secara langsung." }
    }

    setLoading(true)
    setProgress("Menghubungi Google Drive…")

    try {
      const params = new URLSearchParams({ fileId: parsed.id, type: parsed.type })
      const res = await fetch(`/api/gdrive-proxy?${params.toString()}`)

      if (!res.ok) {
        let errMsg = `Gagal mengambil file (HTTP ${res.status})`
        try {
          const json = await res.json()
          if (json?.error) errMsg = json.error
        } catch {
          // abaikan parse error
        }
        return { file: null, error: errMsg }
      }

      setProgress("Memuat file…")

      const contentType = res.headers.get("content-type") ?? "application/octet-stream"
      const arrayBuffer = await res.arrayBuffer()

      // Tentukan nama & ekstensi file
      let fileName = "gdrive-import"
      if (parsed.type === "sheet") {
        fileName += ".xlsx"
      } else {
        // Coba ambil nama dari Content-Disposition header
        const disposition = res.headers.get("content-disposition") ?? ""
        const nameMatch = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';\r\n]+)["']?/i)
        if (nameMatch) {
          fileName = decodeURIComponent(nameMatch[1].trim())
        } else {
          fileName += contentType.includes("csv") ? ".csv" : ".xlsx"
        }
      }

      const file = new File([arrayBuffer], fileName, { type: contentType })
      return { file, error: null }
    } catch (err) {
      console.error("[useGDriveImport] error:", err)
      return { file: null, error: "Terjadi kesalahan jaringan. Periksa koneksi internet." }
    } finally {
      setLoading(false)
      setProgress("")
    }
  }

  return { fetchFromDrive, loading, progress }
}
