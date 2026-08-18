import { requireRole } from "@/lib/session"
import { listPengguna } from "@/app/actions/pengguna"
import { listRoles, listUnitKerja } from "@/app/actions/pengguna-helpers"
import { PageHeader } from "@/components/page-header"
import { PenggunaTable } from "./_components/pengguna-table"

export default async function PenggunaPage() {
  await requireRole(["ADMIN"])
  const [pengguna, roles, unitKerja] = await Promise.all([
    listPengguna(),
    listRoles(),
    listUnitKerja(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Manajemen Pengguna"
        description="Kelola akun dan hak akses pengguna aplikasi"
      />
      <PenggunaTable data={pengguna} roles={roles} unitKerja={unitKerja} />
    </div>
  )
}
