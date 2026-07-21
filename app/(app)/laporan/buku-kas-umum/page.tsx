import { requireRole } from "@/lib/session"
import { getBukuKasUmum } from "@/app/actions/laporan"
import { listRekening, listUnitKerja } from "@/app/actions/master"
import { BukuKasUmumClient } from "./_client"

export default async function BukuKasUmumPage() {
  const profile = await requireRole(["ADMIN", "PIMPINAN"])

  const now = new Date()
  const tahun = now.getFullYear()
  const bulan = now.getMonth() + 1
  const tglAwal = `${tahun}-${String(bulan).padStart(2, "0")}-01`
  const tglAkhir = now.toISOString().split("T")[0]

  const [rekeningList, unitList, initialData] = await Promise.all([
    listRekening(),
    listUnitKerja(),
    getBukuKasUmum({ tglAwal, tglAkhir, page: 1, limit: 50 }),
  ])

  return (
    <BukuKasUmumClient
      rekeningList={rekeningList.map((r) => ({
        id: r.id,
        kode: r.kode,
        nama_bank: r.nama_bank,
        nama_rekening: r.nama_rekening,
        nomor_rekening: r.nomor_rekening,
      }))}
      unitList={unitList.map((u) => ({ id: u.id, kode: u.kode, nama: u.nama }))}
      initialData={initialData}
      initialFilter={{ tglAwal, tglAkhir }}
      isAdmin={profile.role.kode === "ADMIN"}
    />
  )
}
