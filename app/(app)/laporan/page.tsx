import { requireRole, getCurrentProfile } from "@/lib/session"
import { rekapHarian, rekapBulanan, rekapPerRekening, rekapRekeningKoran } from "@/app/actions/laporan"
import { listRekening } from "@/app/actions/master"
import { LaporanClient } from "./_client"

export default async function LaporanPage() {
  const profile = await requireRole(["ADMIN", "PIMPINAN"])

  const now = new Date()
  const today = now.toISOString().split("T")[0]
  const tahun = now.getFullYear()
  const bulan = now.getMonth() + 1
  const tglAwal = `${tahun}-${String(bulan).padStart(2, "0")}-01`

  const rekeningList = await listRekening()
  const firstRekeningId = rekeningList[0]?.id ?? ""

  const [harianData, bulananData, rekeningData, koranData] = await Promise.all([
    rekapHarian(today),
    rekapBulanan(tahun, bulan),
    rekapPerRekening(tglAwal, today),
    firstRekeningId ? rekapRekeningKoran(firstRekeningId, tahun) : Promise.resolve(null),
  ])

  return (
    <LaporanClient
      initialHarian={{ tanggal: today, rows: harianData.rows, total: harianData.total }}
      initialBulanan={{ tahun, bulan, byKategori: bulananData.byKategori, total: bulananData.total }}
      initialRekening={{ tglAwal, tglAkhir: today, byRekening: rekeningData.byRekening, total: rekeningData.total }}
      rekeningList={rekeningList.map((r) => ({
        id: r.id,
        nama_bank: r.nama_bank,
        nama_rekening: r.nama_rekening,
        nomor_rekening: r.nomor_rekening,
      }))}
      initialRekeningKoran={koranData}
      initialRekeningKoranId={firstRekeningId}
      initialRekeningKoranTahun={tahun}
      isAdmin={profile.role.kode === "ADMIN"}
    />
  )
}
