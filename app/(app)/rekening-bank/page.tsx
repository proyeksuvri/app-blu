import { requireRole } from "@/lib/session"
import { listRekening } from "@/app/actions/master"
import { PageHeader } from "@/components/page-header"
import { RekeningTable } from "./_components/rekening-table"

export default async function RekeningBankPage() {
  await requireRole(["ADMIN"])
  const data = await listRekening()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Rekening Bank"
        description="Kelola rekening bank BLU"
      />
      <RekeningTable data={data} />
    </div>
  )
}
