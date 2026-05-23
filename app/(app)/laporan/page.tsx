import { requireRole } from "@/lib/session"
import { rekapHarian, rekapBulanan, rekapPerRekening } from "@/app/actions/laporan"
import { LaporanClient } from "./_client"

export default async function LaporanPage() {
  await requireRole(["ADMIN", "PIMPINAN"])

  const now = new Date()
  const today = now.toISOString().split("T")[0]
  const tahun = now.getFullYear()
  const bulan = now.getMonth() + 1
  const tglAwal = `${tahun}-${String(bulan).padStart(2, "0")}-01`

  const [harianData, bulananData, rekeningData] = await Promise.all([
    rekapHarian(today),
    rekapBulanan(tahun, bulan),
    rekapPerRekening(tglAwal, today),
  ])

  return (
    <LaporanClient
      initialHarian={{ tanggal: today, rows: harianData.rows, total: harianData.total }}
      initialBulanan={{ tahun, bulan, byKategori: bulananData.byKategori, total: bulananData.total }}
      initialRekening={{ tglAwal, tglAkhir: today, byRekening: rekeningData.byRekening, total: rekeningData.total }}
    />
  )
}
