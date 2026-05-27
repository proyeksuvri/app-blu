import { Suspense } from "react"
import Link from "next/link"
import { getCurrentProfile } from "@/lib/session"
import { redirect } from "next/navigation"
import { listPenerimaan } from "@/app/actions/penerimaan"
import { listJenis } from "@/app/actions/master"
import { PageHeader } from "@/components/page-header"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PenerimaanTable } from "./_components/penerimaan-table"
import { PenerimaanFilters } from "./_components/penerimaan-filters"
import { PenerimaanPagination } from "./_components/penerimaan-pagination"

export default async function PenerimaanPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; jenis_id?: string; page?: string; sort?: string; order?: string }>
}) {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/")

  const params = await searchParams
  const sort = (["tanggal_terima", "jumlah", "nomor_bukti"].includes(params.sort ?? "")
    ? params.sort : "tanggal_terima") as "tanggal_terima" | "jumlah" | "nomor_bukti"
  const order = params.order === "asc" ? "asc" : "desc"
  const currentPage = params.page ? Math.max(1, parseInt(params.page)) : 1

  const statuses = (params.status ?? "").split(",").filter(Boolean)
  const jenisIds = (params.jenis_id ?? "").split(",").filter(Boolean)

  const [{ data, count }, jenisList] = await Promise.all([
    listPenerimaan({
      statuses: statuses.length ? statuses : undefined,
      jenis_ids: jenisIds.length ? jenisIds : undefined,
      page: currentPage,
      sort,
      order,
    }),
    listJenis(),
  ])

  const isOperator = profile.role.kode === "OPERATOR"
  const isAdmin = profile.role.kode === "ADMIN"

  const jenisOptions = jenisList.map((j) => ({ value: j.id, label: j.nama }))

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
        <PenerimaanFilters jenisOptions={jenisOptions} />
      </Suspense>

      <Suspense>
        <PenerimaanTable data={data as Parameters<typeof PenerimaanTable>[0]["data"]} isAdmin={isAdmin} sort={sort} order={order} />
      </Suspense>

      <Suspense>
        <PenerimaanPagination count={count} page={currentPage} pageSize={20} />
      </Suspense>
    </div>
  )
}
