import { requireRole } from "@/lib/session"
import { rekapPosisiRekening, rekapPosisiKasBulanan } from "@/app/actions/laporan"
import { listRekening } from "@/app/actions/master"
import { PosisiRekeningClient } from "./_client"

export const dynamic = "force-dynamic"

export default async function PosisiRekeningPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; tahun?: string; bulan?: string; rekening_id?: string }>
}) {
  await requireRole(["ADMIN", "PIMPINAN"])

  const params = await searchParams
  const tahun = params.tahun ? parseInt(params.tahun) : new Date().getFullYear()
  const bulan = params.bulan ? parseInt(params.bulan) : null
  const rekeningId = params.rekening_id ?? "__ALL__"
  const defaultTab = params.tab === "bulanan" ? "bulanan" : "per-rekening"

  const [dataPerRekening, dataBulanan, rekeningList] = await Promise.all([
    rekapPosisiRekening(tahun, bulan),
    rekapPosisiKasBulanan(tahun, rekeningId),
    listRekening(),
  ])

  return (
    <PosisiRekeningClient
      defaultTab={defaultTab}
      initialDataPerRekening={dataPerRekening}
      initialDataBulanan={dataBulanan}
      rekeningList={rekeningList.map((r) => ({
        id: r.id,
        nama_bank: r.nama_bank,
        nama_rekening: r.nama_rekening,
        nomor_rekening: r.nomor_rekening,
      }))}
      initialTahun={tahun}
      initialBulan={bulan}
      initialRekeningId={rekeningId}
    />
  )
}
