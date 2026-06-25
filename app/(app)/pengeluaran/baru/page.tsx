import { requireRole } from "@/lib/session"
import { PengeluaranForm } from "../_components/pengeluaran-form"

export default async function PengeluaranBaruPage() {
  const profile = await requireRole(["OPERATOR", "ADMIN"])

  return (
    <PengeluaranForm
      lockedUnitId={
        profile.role.kode === "OPERATOR" && profile.unit_kerja_id
          ? profile.unit_kerja_id
          : undefined
      }
    />
  )
}
