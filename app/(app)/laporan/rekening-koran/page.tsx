import { requireRole } from "@/lib/session"
import { rekapRekeningKoran } from "@/app/actions/laporan"
import { listRekening } from "@/app/actions/master"
import { LaporanRekeningKoranClient } from "./_client"

export default async function RekeningKoranPage({
  searchParams,
}: {
  searchParams: Promise<{ rekening_id?: string; tahun?: string }>
}) {
  await requireRole(["ADMIN", "PIMPINAN"])

  const params = await searchParams
  const tahun = params.tahun ? parseInt(params.tahun) : new Date().getFullYear()
  const rekeningList = await listRekening()

  // Pilih rekening pertama jika tidak ada param
  const rekeningId = params.rekening_id ?? rekeningList[0]?.id ?? ""

  const initialData = rekeningId ? await rekapRekeningKoran(rekeningId, tahun) : null

  return (
    <LaporanRekeningKoranClient
      rekeningList={rekeningList.map((r) => ({
        id: r.id,
        nama_bank: r.nama_bank,
        nama_rekening: r.nama_rekening,
        nomor_rekening: r.nomor_rekening,
      }))}
      initialData={initialData}
      initialRekeningId={rekeningId}
      initialTahun={tahun}
    />
  )
}
