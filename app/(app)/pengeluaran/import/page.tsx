import { requireRole } from "@/lib/session"
import { PageHeader } from "@/components/page-header"
import { ImportPengeluaranClient } from "./_client"

export default async function ImportPengeluaranPage() {
  await requireRole(["OPERATOR", "ADMIN"])

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      <PageHeader
        title="Import Pengeluaran"
        description="Upload file Excel/CSV untuk import data pengeluaran secara massal"
      />
      <ImportPengeluaranClient />
    </div>
  )
}
