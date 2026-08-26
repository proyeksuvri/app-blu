import { getCurrentProfile } from "@/lib/session"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { MahasiswaImportClient } from "./_client"

export default async function MahasiswaImportPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/")
  if (profile.role.kode !== "ADMIN") redirect("/mahasiswa")

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <PageHeader
        title="Import Data Mahasiswa"
        description="Upload file Excel (.xlsx) berisi data mahasiswa"
      />
      <MahasiswaImportClient />
    </div>
  )
}
