import { NextRequest, NextResponse } from "next/server"

const ALLOWED_MIME = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel",                                           // .xls
  "text/csv",
  "application/csv",
  "application/octet-stream",
]

const MAX_SIZE_BYTES = 25 * 1024 * 1024 // 25 MB

/**
 * GET /api/gdrive-proxy?fileId=<google_drive_file_id>&type=<sheet|file>
 *
 * Proxy untuk mengunduh file Excel dari Google Drive server-side,
 * sehingga browser tidak terkena CORS restriction.
 *
 * File harus di-share secara publik ("Anyone with the link").
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const fileId = searchParams.get("fileId")?.trim()
  const type   = searchParams.get("type") ?? "file" // "file" | "sheet"

  if (!fileId || !/^[\w-]{10,}$/.test(fileId)) {
    return NextResponse.json({ error: "File ID tidak valid" }, { status: 400 })
  }

  // Google Sheets: export as xlsx
  // Google Drive file: direct download
  const downloadUrl =
    type === "sheet"
      ? `https://docs.google.com/spreadsheets/d/${fileId}/export?format=xlsx`
      : `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`

  try {
    const res = await fetch(downloadUrl, {
      headers: {
        // Mimic browser user-agent to avoid bot detection
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      redirect: "follow",
    })

    if (!res.ok) {
      // 403 biasanya file tidak dibagikan publik
      if (res.status === 403 || res.status === 401) {
        return NextResponse.json(
          { error: "File tidak dapat diakses. Pastikan file dibagikan dengan 'Anyone with the link'." },
          { status: 403 },
        )
      }
      return NextResponse.json(
        { error: `Gagal mengambil file dari Google Drive (HTTP ${res.status})` },
        { status: res.status },
      )
    }

    const contentType = res.headers.get("content-type") ?? ""

    // Google Drive kadang kembalikan HTML (halaman konfirmasi virus scan) untuk file besar
    if (contentType.includes("text/html")) {
      return NextResponse.json(
        {
          error:
            "Google Drive meminta konfirmasi unduhan (file terlalu besar atau terdeteksi scan). " +
            "Coba gunakan Google Sheets export atau upload file manual.",
        },
        { status: 422 },
      )
    }

    // Validasi content-type (longgar — Google kadang kembalikan octet-stream)
    const isAllowed = ALLOWED_MIME.some((m) => contentType.includes(m))
    if (!isAllowed && !contentType.includes("spreadsheet") && !contentType.includes("excel")) {
      return NextResponse.json(
        { error: `Tipe file tidak didukung: ${contentType}. Gunakan file Excel (.xlsx, .xls) atau CSV.` },
        { status: 415 },
      )
    }

    // Baca body dengan batas ukuran
    const arrayBuffer = await res.arrayBuffer()
    if (arrayBuffer.byteLength > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "Ukuran file melebihi batas 25 MB" }, { status: 413 })
    }

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType || "application/octet-stream",
        "Content-Length": String(arrayBuffer.byteLength),
        // Cache 5 menit — file Drive jarang berubah dalam satu sesi
        "Cache-Control": "private, max-age=300",
      },
    })
  } catch (err) {
    console.error("[gdrive-proxy] fetch error:", err)
    return NextResponse.json(
      { error: "Gagal menghubungi Google Drive. Periksa koneksi internet." },
      { status: 502 },
    )
  }
}
