import { getCurrentProfile } from "@/lib/session"
import { redirect } from "next/navigation"
import { listDokumenPanduan } from "@/app/actions/panduan"
import { PanduanClient } from "./_panduan-client"

export const metadata = {
  title: "Panduan & Aturan — BLU UIN Palopo",
  description: "Dokumen panduan dan aturan penggunaan sistem penerimaan dana BLU UIN Palopo.",
}

export default async function PanduanPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/")

  const dokumen = await listDokumenPanduan()
  const isAdmin = profile.role.kode === "ADMIN"

  return <PanduanClient dokumen={dokumen} isAdmin={isAdmin} />
}
