import { requireRole } from "@/lib/session"
import { listUnitKerja } from "@/app/actions/master"
import { PageHeader } from "@/components/page-header"
import { UnitTable } from "./_components/unit-table"

export default async function UnitKerjaPage() {
  await requireRole(["ADMIN"])
  const data = await listUnitKerja()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Unit Kerja"
        description="Kelola unit kerja BLU"
      />
      <UnitTable data={data} />
    </div>
  )
}
