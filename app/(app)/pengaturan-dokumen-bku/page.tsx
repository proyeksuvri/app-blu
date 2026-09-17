import { requireRole } from "@/lib/session"
import { BkuDocumentSettingsPage } from "@/components/bku-document-settings-page"

export const dynamic = "force-dynamic"

export default async function PengaturanDokumenBkuPage() {
  await requireRole(["ADMIN", "PIMPINAN"])

  const today = new Date()
  const tglAkhir = today.toISOString().split("T")[0]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Pengaturan Dokumen BKU</h1>
        <p className="text-xs text-muted-foreground">
          Kelola identitas dokumen, data pengesahan, dan berita acara yang digunakan pada PDF Buku Kas Umum.
        </p>
      </div>
      <BkuDocumentSettingsPage tglAkhir={tglAkhir} />
    </div>
  )
}
