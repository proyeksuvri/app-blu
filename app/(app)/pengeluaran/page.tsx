import { Suspense } from "react"
import Link from "next/link"
import { getCurrentProfile } from "@/lib/session"
import { redirect } from "next/navigation"
import { listPengeluaran, getPengeluaranSummary } from "@/app/actions/pengeluaran"
import { listJenisPengeluaran, listUnitKerja, listRekening } from "@/app/actions/master"
import { PageHeader } from "@/components/page-header"
import { Plus, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PengeluaranCards } from "./_components/pengeluaran-cards"
import { PengeluaranTable } from "./_components/pengeluaran-table"
import { PengeluaranFilters } from "./_components/pengeluaran-filters"
import { PengeluaranPagination } from "./_components/pengeluaran-pagination"
import { createClient } from "@/lib/supabase/server"

export default async function PengeluaranPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string
    bulan?: string
    tahun?: string
    jenis_id?: string
    unit_id?: string
    rekening_id?: string
    q?: string
    page?: string
    limit?: string
    sort?: string
    order?: string
  }>
}) {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/")

  const params = await searchParams
  const sort = (["tanggal", "jumlah", "nomor_bukti"].includes(params.sort ?? "")
    ? params.sort : "tanggal") as "tanggal" | "jumlah" | "nomor_bukti"
  const order = params.order === "asc" ? "asc" : "desc"
  const currentPage = params.page ? Math.max(1, parseInt(params.page)) : 1
  const pageSize = [25, 50, 100].includes(Number(params.limit)) ? Number(params.limit) : 25

  const statuses = (params.status ?? "").split(",").filter(Boolean)
  const jenisIds = (params.jenis_id ?? "").split(",").filter(Boolean)
  const unitIds = (params.unit_id ?? "").split(",").filter(Boolean)
  const rekeningIds = (params.rekening_id ?? "").split(",").filter(Boolean)
  const tahun = params.tahun ? parseInt(params.tahun) : undefined
  const bulan = params.bulan ? parseInt(params.bulan) : undefined
  const q = params.q?.trim() || undefined

  const isOperator = profile.role.kode === "OPERATOR"
  const isAdmin = profile.role.kode === "ADMIN"

  const sb = await createClient()

  const [{ data, count }, summary, jenisList, unitList, rekeningList, { count: totalDraft }, { count: totalDeletable }] = await Promise.all([
    listPengeluaran({
      statuses: statuses.length ? statuses : undefined,
      jenis_ids: jenisIds.length ? jenisIds : undefined,
      unit_ids: unitIds.length ? unitIds : undefined,
      rekening_id: rekeningIds.length === 1 ? rekeningIds[0] : undefined,
      tahun,
      bulan,
      q,
      page: currentPage,
      limit: pageSize,
      sort,
      order,
    }),
    getPengeluaranSummary({
      jenis_ids: jenisIds.length ? jenisIds : undefined,
      unit_ids: unitIds.length ? unitIds : undefined,
      rekening_id: rekeningIds.length === 1 ? rekeningIds[0] : undefined,
      tahun,
      bulan,
      q,
    }),
    listJenisPengeluaran(),
    listUnitKerja(),
    listRekening(),
    isAdmin ? sb.from("pengeluaran").select("id", { count: "exact", head: true }).eq("status", "draft") : Promise.resolve({ count: 0 }),
    isAdmin ? sb.from("pengeluaran").select("id", { count: "exact", head: true }).in("status", ["draft", "verified"]) : Promise.resolve({ count: 0 }),
  ])

  const jenisOptions = jenisList.map((j) => ({ value: j.id, label: `[${j.kode}] ${j.nama}` }))
  const unitOptions = unitList.map((u) => ({ value: u.id, label: `${u.kode} — ${u.nama}` }))
  const rekeningOptions = rekeningList.map((r) => ({ value: r.id, label: `${r.nama_bank} — ${r.nomor_rekening}` }))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pengeluaran Dana"
        description={`${count} transaksi`}
        action={
          isOperator || isAdmin ? (
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" nativeButton={false} render={<Link href="/pengeluaran/import" />}>
                <Upload className="h-4 w-4" />
                Import
              </Button>
              <Button size="sm" nativeButton={false} render={<Link href="/pengeluaran/baru" />}>
                <Plus className="h-4 w-4" />
                Input Baru
              </Button>
            </div>
          ) : undefined
        }
      />

      <Suspense>
        <PengeluaranCards summary={summary} activeStatus={params.status} />
      </Suspense>

      <Suspense>
        <PengeluaranFilters jenisOptions={jenisOptions} unitOptions={unitOptions} rekeningOptions={rekeningOptions} />
      </Suspense>

      <Suspense>
        <PengeluaranTable
          data={data as Parameters<typeof PengeluaranTable>[0]["data"]}
          isAdmin={isAdmin}
          sort={sort}
          order={order}
          totalDraft={totalDraft ?? 0}
          totalDeletable={totalDeletable ?? 0}
          filter={{
            status: params.status ?? "",
            bulan: params.bulan ?? "",
            tahun: params.tahun ?? "",
            jenis_id: params.jenis_id ?? "",
            unit_id: params.unit_id ?? "",
            rekening_id: params.rekening_id ?? "",
            q: params.q ?? "",
          }}
        />
      </Suspense>

      <Suspense>
        <PengeluaranPagination count={count} page={currentPage} pageSize={pageSize} />
      </Suspense>
    </div>
  )
}

