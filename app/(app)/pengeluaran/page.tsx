import { Suspense } from "react"
import Link from "next/link"
import { getCurrentProfile } from "@/lib/session"
import { redirect } from "next/navigation"
import { listPengeluaran } from "@/app/actions/pengeluaran"
import { PageHeader } from "@/components/page-header"
import { Plus, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PengeluaranTable } from "./_components/pengeluaran-table"
import { PengeluaranFilters } from "./_components/pengeluaran-filters"
import { PengeluaranPagination } from "./_components/pengeluaran-pagination"
import { createClient } from "@/lib/supabase/server"

export default async function PengeluaranPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; limit?: string; sort?: string; order?: string }>
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

  const isOperator = profile.role.kode === "OPERATOR"
  const isAdmin = profile.role.kode === "ADMIN"

  const sb = await createClient()

  const [{ data, count }, { count: totalDraft }, { count: totalDeletable }] = await Promise.all([
    listPengeluaran({
      statuses: statuses.length ? statuses : undefined,
      page: currentPage,
      limit: pageSize,
      sort,
      order,
    }),
    isAdmin ? sb.from("pengeluaran").select("id", { count: "exact", head: true }).eq("status", "draft") : Promise.resolve({ count: 0 }),
    isAdmin ? sb.from("pengeluaran").select("id", { count: "exact", head: true }).in("status", ["draft", "verified"]) : Promise.resolve({ count: 0 }),
  ])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pengeluaran Dana"
        description={`${count} transaksi`}
        action={
          isOperator || isAdmin ? (
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" render={<Link href="/pengeluaran/import" />}>
                <Upload className="h-4 w-4" />
                Import
              </Button>
              <Button size="sm" render={<Link href="/pengeluaran/baru" />}>
                <Plus className="h-4 w-4" />
                Input Baru
              </Button>
            </div>
          ) : undefined
        }
      />

      <Suspense>
        <PengeluaranFilters />
      </Suspense>

      <Suspense>
        <PengeluaranTable
          data={data as Parameters<typeof PengeluaranTable>[0]["data"]}
          isAdmin={isAdmin}
          sort={sort}
          order={order}
          totalDraft={totalDraft ?? 0}
          totalDeletable={totalDeletable ?? 0}
          filter={{ status: params.status ?? "" }}
        />
      </Suspense>

      <Suspense>
        <PengeluaranPagination count={count} page={currentPage} pageSize={pageSize} />
      </Suspense>
    </div>
  )
}
