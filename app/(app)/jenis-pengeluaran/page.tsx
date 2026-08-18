import { requireRole } from "@/lib/session"
import { listJenisPengeluaran, listKategoriPengeluaran } from "@/app/actions/master"
import { PageHeader } from "@/components/page-header"
import { JenisPengeluaranTable } from "./_components/jenis-pengeluaran-table"

export default async function JenisPengeluaranPage() {
  await requireRole(["ADMIN"])
  const [data, kategoriOptions] = await Promise.all([listJenisPengeluaran(), listKategoriPengeluaran()])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Jenis Pengeluaran"
        description="Kelola jenis belanja dan pengeluaran BLU"
      />
      <JenisPengeluaranTable data={data} kategoriOptions={kategoriOptions} />
    </div>
  )
}
