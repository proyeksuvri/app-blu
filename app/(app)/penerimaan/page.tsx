import { Suspense } from "react"
import Link from "next/link"
import { getCurrentProfile } from "@/lib/session"
import { redirect } from "next/navigation"
import { listPenerimaan } from "@/app/actions/penerimaan"
import { PageHeader } from "@/components/page-header"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PenerimaanTable } from "./_components/penerimaan-table"
import { StatusTabs } from "./_components/status-tabs"

export default async function PenerimaanPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; sort?: string; order?: string }>
}) {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/")

  const params = await searchParams
  const sort = (["tanggal_terima", "jumlah", "nomor_bukti"].includes(params.sort ?? "")
    ? params.sort : "tanggal_terima") as "tanggal_terima" | "jumlah" | "nomor_bukti"
  const order = params.order === "asc" ? "asc" : "desc"

  const { data, count } = await listPenerimaan({
    status: params.status as "draft" | "verified" | "void" | undefined,
    page: params.page ? parseInt(params.page) : 1,
    sort,
    order,
  })

  const isOperator = profile.role.kode === "OPERATOR"
  const isAdmin = profile.role.kode === "ADMIN"

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
        <StatusTabs />
      </Suspense>

      <Suspense>
        <PenerimaanTable data={data as Parameters<typeof PenerimaanTable>[0]["data"]} isAdmin={isAdmin} sort={sort} order={order} />
      </Suspense>
    </div>
  )
}
