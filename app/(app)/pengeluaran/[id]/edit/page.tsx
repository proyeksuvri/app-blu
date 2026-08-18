import { notFound, redirect } from "next/navigation"
import { requireRole, getCurrentProfile } from "@/lib/session"
import { getPengeluaran } from "@/app/actions/pengeluaran"
import { PengeluaranForm } from "../../_components/pengeluaran-form"

export default async function EditPengeluaranPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/")
  
  await requireRole(["OPERATOR", "ADMIN"])

  const { id } = await params
  const data = await getPengeluaran(id)
  
  if (!data) notFound()

  // Hanya bisa edit draft
  if (data.status !== "draft") {
    redirect(`/pengeluaran/${id}`)
  }

  // Operator hanya bisa edit miliknya sendiri
  if (profile.role.kode !== "ADMIN" && data.created_by !== profile.id) {
    redirect(`/pengeluaran/${id}`)
  }

  return (
    <PengeluaranForm
      editId={id}
      defaultValues={{
        tanggal: data.tanggal,
        unit_kerja_id: data.unit_kerja_id ?? undefined,
        rekening_bank_id: data.rekening_bank_id ?? undefined,
        jumlah: Number(data.jumlah),
        uraian: data.uraian ?? undefined,
      }}
      lockedUnitId={
        profile.role.kode === "OPERATOR" && profile.unit_kerja_id
          ? profile.unit_kerja_id
          : undefined
      }
    />
  )
}
