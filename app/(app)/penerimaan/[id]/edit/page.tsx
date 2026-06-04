import { notFound, redirect } from "next/navigation"
import { getCurrentProfile } from "@/lib/session"
import { getPenerimaan } from "@/app/actions/penerimaan"
import { PageHeader } from "@/components/page-header"
import { PenerimaanForm } from "../../_components/penerimaan-form"

export default async function PenerimaanEditPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/")

  const { id } = await params
  const data = await getPenerimaan(id)
  if (!data) notFound()

  // Hanya draft yang bisa diedit, oleh owner atau admin
  const isAdmin = profile.role.kode === "ADMIN"
  const isOwner = data.created_by === profile.id
  if (data.status !== "draft" || (!isOwner && !isAdmin)) redirect(`/penerimaan/${id}`)

  const jenis = data.jenis as { id?: string; kategori?: { id?: string } } | null

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <PageHeader
        title="Edit Penerimaan"
        description={data.nomor_bukti}
      />
      <PenerimaanForm
        editId={id}
        defaultValues={{
          tanggal_terima: data.tanggal_terima,
          kategori_id: jenis?.kategori?.id ?? "",
          jenis_pendapatan_id: data.jenis_pendapatan_id,
          sub_pendapatan_id: data.sub_pendapatan_id ?? undefined,
          unit_kerja_id: data.unit_kerja_id,
          rekening_bank_id: data.rekening_bank_id,
          jenis_pemindahan_kas_id: data.jenis_pemindahan_kas_id,
          jumlah: data.jumlah,
          nomor_referensi: data.nomor_referensi ?? undefined,
          uraian: data.uraian ?? undefined,
        }}
        lockedUnitId={
          profile.role.kode === "OPERATOR" && profile.unit_kerja_id
            ? profile.unit_kerja_id
            : undefined
        }
      />
    </div>
  )
}
