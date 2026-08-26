import { Suspense } from "react"
import { requireRole } from "@/lib/session"
import { getPenerimaanMahasiswa } from "@/app/actions/laporan"
import { LaporanPenerimaanMahasiswaClient } from "./_client"

export const dynamic = "force-dynamic"

export default async function LaporanPenerimaanMahasiswaPage({
  searchParams,
}: {
  searchParams: Promise<{
    tglAwal?: string
    tglAkhir?: string
    fakultas?: string
    prodi?: string
    status?: string
    q?: string
    page?: string
    limit?: string
  }>
}) {
  await requireRole(["ADMIN", "PIMPINAN"])
  const params = await searchParams

  const today = new Date().toISOString().split("T")[0]
  const firstDayOfYear = `${new Date().getFullYear()}-01-01`

  const tglAwal = params.tglAwal || firstDayOfYear
  const tglAkhir = params.tglAkhir || today
  const page = params.page ? Math.max(1, parseInt(params.page)) : 1
  const limit = [25, 50, 100, 200].includes(Number(params.limit)) ? Number(params.limit) : 50

  const initialData = await getPenerimaanMahasiswa({
    tglAwal,
    tglAkhir,
    fakultas: params.fakultas,
    prodi: params.prodi,
    status: params.status,
    q: params.q,
    page,
    limit,
  })

  return (
    <Suspense fallback={<div className="h-[400px] w-full animate-pulse rounded-md bg-muted" />}>
      <LaporanPenerimaanMahasiswaClient
        initialData={initialData}
        initialFilter={{
          tglAwal,
          tglAkhir,
          fakultas: params.fakultas ?? "all",
          prodi: params.prodi ?? "all",
          status: params.status ?? "all",
          q: params.q ?? "",
          page,
          limit,
        }}
      />
    </Suspense>
  )
}
