import { Suspense } from "react"
import Link from "next/link"
import { getCurrentProfile } from "@/lib/session"
import { redirect } from "next/navigation"
import { listPenerimaan, countDraft, countDraftAndVerified } from "@/app/actions/penerimaan"
import { listJenis, listRekening } from "@/app/actions/master"
import { PageHeader } from "@/components/page-header"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PenerimaanTable } from "./_components/penerimaan-table"
import { PenerimaanFilters } from "./_components/penerimaan-filters"
import { PenerimaanPagination } from "./_components/penerimaan-pagination"

export default async function PenerimaanPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; jenis_id?: string; rekening_id?: string; page?: string; limit?: string; sort?: string; order?: string }>
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
  const rekeningIds = (params.rekening_id ?? "").split(",").filter(Boolean)

  const isOperator = profile.role.kode === "OPERATOR"
  const isAdmin = profile.role.kode === "ADMIN"

  const [{ data, count }, jenisList, rekeningList, totalDraft, totalDeletable] = await Promise.all([
    listPenerimaan({
      statuses: statuses.length ? statuses : undefined,
      jenis_ids: jenisIds.length ? jenisIds : undefined,
      rekening_id: rekeningIds.length === 1 ? rekeningIds[0] : undefined,
      page: currentPage,
      limit: pageSize,
      sort,
      order,
    }),
    listJenis(),
    listRekening(),
    isAdmin ? countDraft() : Promise.resolve(0),
    isAdmin ? countDraftAndVerified() : Promise.resolve(0),
  ])

  const jenisOptions = jenisList.map((j) => ({ value: j.id, label: j.nama }))
  const rekeningOptions = rekeningList.map((r) => ({ value: r.id, label: `${r.nama_bank} — ${r.nomor_rekening}` }))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Penerimaan Dana"
        description={`${count} transaksi`}
        action={
          isOperator ? (
            <Button size="sm" render={<Link href="/penerimaan/baru" />}>
              <Plus className="h-4 w-4" />
              Input Baru
            </Button>
          ) : undefined
        }
      />

      <Suspense>
        <PenerimaanFilters jenisOptions={jenisOptions} rekeningOptions={rekeningOptions} />
      </Suspense>

      <Suspense>
        <PenerimaanTable
          data={data as Parameters<typeof PenerimaanTable>[0]["data"]}
          isAdmin={isAdmin}
          sort={sort}
          order={order}
          totalDraft={totalDraft}
          totalDeletable={totalDeletable}
          filter={{ status: params.status ?? "", jenis_id: params.jenis_id ?? "" }}
        />
      </Suspense>

      <Suspense>
        <PenerimaanPagination count={count} page={currentPage} pageSize={pageSize} />
      </Suspense>
    </div>
  )
}
