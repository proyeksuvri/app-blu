import { requireRole } from "@/lib/session"
import { listSub, listJenis } from "@/app/actions/master"
import { PageHeader } from "@/components/page-header"
import { SubTable } from "./_components/sub-table"

export default async function SubPendapatanPage() {
  await requireRole(["ADMIN"])
  const [data, jenisOptions] = await Promise.all([listSub(), listJenis()])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sub Pendapatan"
        description="Kelola sub sumber penerimaan BLU"
      />
      <SubTable data={data} jenisOptions={jenisOptions} />
    </div>
  )
}
