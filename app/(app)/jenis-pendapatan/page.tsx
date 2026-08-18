import { requireRole } from "@/lib/session"
import { listJenis, listKategori } from "@/app/actions/master"
import { PageHeader } from "@/components/page-header"
import { JenisTable } from "./_components/jenis-table"

export default async function JenisPendapatanPage() {
  await requireRole(["ADMIN"])
  const [data, kategoriOptions] = await Promise.all([listJenis(), listKategori()])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Jenis Pendapatan"
        description="Kelola jenis sumber penerimaan BLU"
      />
      <JenisTable data={data} kategoriOptions={kategoriOptions} />
    </div>
  )
}
