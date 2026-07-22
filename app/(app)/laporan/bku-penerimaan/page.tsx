import { Suspense } from "react"
import { BkuPenerimaanClient } from "./_client"
import { getBkuPenerimaan } from "@/app/actions/laporan"
import { listRekening, listUnitKerja } from "@/app/actions/master"

export const dynamic = "force-dynamic"

export default async function BkuPenerimaanPage({
  searchParams,
}: {
  searchParams: Promise<{ tglAwal?: string; tglAkhir?: string }>
}) {
  const params = await searchParams
  
  // The action getBkuPenerimaan handles defaults if not provided
  const [rekeningList, unitList, result] = await Promise.all([
    listRekening(),
    listUnitKerja(),
    getBkuPenerimaan({
      tglAwal: params.tglAwal,
      tglAkhir: params.tglAkhir,
      page: 1,
      limit: 50,
    }),
  ])

  const { rows, saldoAwal, saldoAkhir, totalPenerimaan, totalRows, page, limit } = result

  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<div className="h-[400px] w-full animate-pulse rounded-md bg-muted" />}>
        <BkuPenerimaanClient 
          initialData={{
            rows,
            saldoAwal,
            saldoAkhir,
            totalPenerimaan,
            totalRows,
            page,
            limit
          }}
          rekeningList={rekeningList.map((r) => ({
            id: r.id,
            kode: r.kode,
            nama_bank: r.nama_bank,
            nama_rekening: r.nama_rekening,
            nomor_rekening: r.nomor_rekening,
          }))}
          unitList={unitList.map((u) => ({ id: u.id, kode: u.kode, nama: u.nama }))}
        />
      </Suspense>
    </div>
  )
}
