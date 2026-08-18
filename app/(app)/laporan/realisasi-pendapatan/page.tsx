import { requireRole } from "@/lib/session"
import { getRealisasiPendapatan, getRealisasiPendapatanPerRekening, getRealisasiPendapatanDetail, getRealisasiPendapatanBulanan } from "@/app/actions/laporan"
import { getRealisasiPendapatanRingkasan } from "@/app/actions/laporan-ringkasan"
import RealisasiPendapatanClient from "./_client"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Realisasi Pendapatan BLU - UIN Palopo",
}

export default async function RealisasiPendapatanPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const profile = await requireRole(["ADMIN", "PIMPINAN"])
  const isAdmin = profile.role.kode === "ADMIN"

  const searchParams = await props.searchParams
  const now = new Date()
  const tahun = now.getFullYear()
  const tahunBulanan = typeof searchParams.tahunBulanan === "string" ? parseInt(searchParams.tahunBulanan, 10) || tahun : tahun
  const bulan = now.getMonth() + 1
  const todayStr = now.toISOString().split("T")[0]
  const defaultAwal = `${tahun}-${String(bulan).padStart(2, "0")}-01`
  const defaultAkhir = todayStr

  const tglAwal = typeof searchParams.tglAwal === "string" ? searchParams.tglAwal : defaultAwal
  const tglAkhir = typeof searchParams.tglAkhir === "string" ? searchParams.tglAkhir : defaultAkhir

  const [initialData, initialDataRekening, initialDataDetail, initialDataBulanan] = await Promise.all([
    getRealisasiPendapatan(tglAwal, tglAkhir),
    getRealisasiPendapatanPerRekening(tglAwal, tglAkhir),
    getRealisasiPendapatanDetail(tglAwal, tglAkhir),
    getRealisasiPendapatanBulanan(tahunBulanan),
  ])

  // Hanya fetch ringkasan untuk Admin
  const initialDataRingkasan = isAdmin
    ? await getRealisasiPendapatanRingkasan(tahunBulanan)
    : { tahun: tahunBulanan, kategori: [], grandPerBulan: new Array(12).fill(0), grandTotal: 0, grandTarget: 0, grandPct: 0 }

  return (
    <RealisasiPendapatanClient
      initialTglAwal={tglAwal}
      initialTglAkhir={tglAkhir}
      initialData={initialData}
      initialDataRekening={initialDataRekening}
      initialDataDetail={initialDataDetail}
      initialDataBulanan={initialDataBulanan}
      initialTahunBulanan={tahunBulanan}
      initialDataRingkasan={initialDataRingkasan}
      isAdmin={isAdmin}
    />
  )
}
