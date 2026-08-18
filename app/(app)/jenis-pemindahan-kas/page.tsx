import { requireRole } from "@/lib/session"
import { listJenisPemindahan } from "@/app/actions/master"
import { PageHeader } from "@/components/page-header"
import { PemindahanTable } from "./_components/pemindahan-table"

export default async function JenisPemindahanKasPage() {
  await requireRole(["ADMIN"])
  const data = await listJenisPemindahan()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Jenis Pemindahan Kas"
        description="Kelola jenis pemindahan kas BLU"
      />
      <PemindahanTable data={data} />
    </div>
  )
}
