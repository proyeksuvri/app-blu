import { Suspense } from "react"
import Link from "next/link"
import { getCurrentProfile } from "@/lib/session"
import { redirect } from "next/navigation"
import { listPenerimaan, countDraft, countDraftAndVerified, getPenerimaanSummary } from "@/app/actions/penerimaan"
import { listJenis, listRekening, listSub } from "@/app/actions/master"
import { PageHeader } from "@/components/page-header"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PenerimaanCards } from "./_components/penerimaan-cards"
import { PenerimaanTable } from "./_components/penerimaan-table"
import { PenerimaanFilters } from "./_components/penerimaan-filters"
import { PenerimaanPagination } from "./_components/penerimaan-pagination"

export default async function PenerimaanPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string
    bulan?: string
    tahun?: string
    jenis_id?: string
    sub_id?: string
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
  const sort = (["tanggal_terima", "jumlah", "nomor_bukti"].includes(params.sort ?? "")
    ? params.sort : "tanggal_terima") as "tanggal_terima" | "jumlah" | "nomor_bukti"
  const order = params.order === "asc" ? "asc" : "desc"
  const currentPage = params.page ? Math.max(1, parseInt(params.page)) : 1
  const pageSize = [25, 50, 100].includes(Number(params.limit)) ? Number(params.limit) : 25

  const statuses = (params.status ?? "").split(",").filter(Boolean)
  const jenisIds = (params.jenis_id ?? "").split(",").filter(Boolean)
  const subIds = (params.sub_id ?? "").split(",").filter(Boolean)
  const rekeningIds = (params.rekening_id ?? "").split(",").filter(Boolean)
  const tahun = params.tahun ? parseInt(params.tahun) : undefined
  const bulan = params.bulan ? parseInt(params.bulan) : undefined
  const q = params.q?.trim() || undefined

  const isOperator = profile.role.kode === "OPERATOR"
  const isAdmin = profile.role.kode === "ADMIN"

  const [{ data, count }, summary, jenisList, subList, rekeningList, totalDraft, totalDeletable] = await Promise.all([
    listPenerimaan({
      statuses: statuses.length ? statuses : undefined,
      jenis_ids: jenisIds.length ? jenisIds : undefined,
      sub_ids: subIds.length ? subIds : undefined,
      rekening_id: rekeningIds.length === 1 ? rekeningIds[0] : undefined,
      tahun,
      bulan,
      q,
      page: currentPage,
      limit: pageSize,
      sort,
      order,
    }),
    getPenerimaanSummary({
      jenis_ids: jenisIds.length ? jenisIds : undefined,
      sub_ids: subIds.length ? subIds : undefined,
      rekening_id: rekeningIds.length === 1 ? rekeningIds[0] : undefined,
      tahun,
      bulan,
      q,
    }),
    listJenis(),
    listSub(),
    listRekening(),
    isAdmin ? countDraft() : Promise.resolve(0),
    isAdmin ? countDraftAndVerified() : Promise.resolve(0),
  ])

  const jenisOptions = jenisList.map((j) => ({ value: j.id, label: j.nama }))
  const subOptions = subList.map((s) => ({ value: s.id, label: `${s.jenis?.kode ?? ""} — ${s.nama}` }))
  const rekeningOptions = rekeningList.map((r) => ({ value: r.id, label: `${r.nama_bank} — ${r.nomor_rekening}` }))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Penerimaan Dana"
        description={`${count} transaksi`}
        action={
          isOperator ? (
            <Button size="sm" nativeButton={false} render={<Link href="/penerimaan/baru" />}>
              <Plus className="h-4 w-4" />
              Input Baru
            </Button>
          ) : undefined
        }
      />

      <Suspense>
        <PenerimaanCards summary={summary} activeStatus={params.status} />
      </Suspense>

      <Suspense>
        <PenerimaanFilters jenisOptions={jenisOptions} subOptions={subOptions} rekeningOptions={rekeningOptions} />
      </Suspense>

      <Suspense>
        <PenerimaanTable
          data={data as Parameters<typeof PenerimaanTable>[0]["data"]}
          isAdmin={isAdmin}
          sort={sort}
          order={order}
          totalDraft={totalDraft}
          totalDeletable={totalDeletable}
          subOptions={subOptions}
          filter={{
            status: params.status ?? "",
            bulan: params.bulan ?? "",
            tahun: params.tahun ?? "",
            jenis_id: params.jenis_id ?? "",
            sub_id: params.sub_id ?? "",
            rekening_id: params.rekening_id ?? "",
            q: params.q ?? "",
          }}
        />
      </Suspense>

      <Suspense>
        <PenerimaanPagination count={count} page={currentPage} pageSize={pageSize} />
      </Suspense>
    </div>
  )
}

