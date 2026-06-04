import { requireRole } from "@/lib/session"
import { listKategori } from "@/app/actions/master"
import { PageHeader } from "@/components/page-header"
import { KategoriTable } from "./_components/kategori-table"

export default async function KategoriPendapatanPage() {
  await requireRole(["ADMIN"])
  const data = await listKategori()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Kategori Pendapatan"
        description="Kelola kategori sumber penerimaan BLU"
      />
      <KategoriTable data={data} />
    </div>
  )
}
