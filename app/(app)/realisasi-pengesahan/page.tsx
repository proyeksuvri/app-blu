import { requireRole } from "@/lib/session"
import { getGDriveConfigs } from "@/app/actions/gdrive-config"
import RealisasiPengesahanClient from "./_client"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Realisasi Pengesahan - UIN Palopo",
}

export default async function RealisasiPengesahanPage() {
  const profile = await requireRole(["ADMIN", "PIMPINAN"])
  const isAdmin = profile.role.kode === "ADMIN"
  const configs = await getGDriveConfigs()

  return (
    <RealisasiPengesahanClient
      configs={configs}
      isAdmin={isAdmin}
    />
  )
}
