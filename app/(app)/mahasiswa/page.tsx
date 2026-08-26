import { getCurrentProfile } from "@/lib/session"
import { redirect } from "next/navigation"
import { listMahasiswa } from "@/app/actions/mahasiswa"
import { PageHeader } from "@/components/page-header"
import { MahasiswaTable } from "./_components/mahasiswa-table"
import { MahasiswaFilters } from "./_components/mahasiswa-filters"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Upload } from "lucide-react"

export default async function MahasiswaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; limit?: string }>
}) {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/")

  const isAdmin = profile.role.kode === "ADMIN"
  if (!isAdmin) redirect("/dashboard")

  const params = await searchParams
  const currentPage = params.page ? Math.max(1, parseInt(params.page)) : 1
  const pageSize = [25, 50, 100].includes(Number(params.limit)) ? Number(params.limit) : 25
  const q = params.q?.trim() || undefined

  const { data, count } = await listMahasiswa({ q, page: currentPage, limit: pageSize })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Data Mahasiswa"
        description={`${count} mahasiswa terdaftar`}
        action={
          <Button size="sm" nativeButton={false} render={<Link href="/mahasiswa/import" />}>
            <Upload className="h-4 w-4" />
            Import Excel
          </Button>
        }
      />

      <MahasiswaFilters />

      <MahasiswaTable data={data} count={count} page={currentPage} pageSize={pageSize} />
    </div>
  )
}
