import { requireRole } from "@/lib/session"
import { PageHeader } from "@/components/page-header"
import { ImportClient } from "./_client"

export default async function ImportPage() {
  await requireRole(["OPERATOR", "ADMIN"])

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      <PageHeader
        title="Import Penerimaan"
        description="Upload file Excel/CSV untuk import data penerimaan secara massal"
      />
      <ImportClient />
    </div>
  )
}
