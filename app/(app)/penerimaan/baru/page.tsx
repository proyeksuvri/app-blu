import { requireRole } from "@/lib/session"
import { PenerimaanForm } from "../_components/penerimaan-form"

export default async function PenerimaanBaruPage() {
  const profile = await requireRole(["OPERATOR", "ADMIN"])

  return (
    <PenerimaanForm
      lockedUnitId={
        profile.role.kode === "OPERATOR" && profile.unit_kerja_id
          ? profile.unit_kerja_id
          : undefined
      }
    />
  )
}
