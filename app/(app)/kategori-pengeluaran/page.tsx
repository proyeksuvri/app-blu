import { requireRole } from "@/lib/session"
import { listKategoriPengeluaran } from "@/app/actions/master"
import { PageHeader } from "@/components/page-header"
import { KategoriPengeluaranTable } from "./_components/kategori-pengeluaran-table"

export default async function KategoriPengeluaranPage() {
  await requireRole(["ADMIN"])
  const data = await listKategoriPengeluaran()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Kategori Pengeluaran"
        description="Kelola kategori jenis belanja dan pengeluaran BLU"
      />
      <KategoriPengeluaranTable data={data} />
    </div>
  )
}
