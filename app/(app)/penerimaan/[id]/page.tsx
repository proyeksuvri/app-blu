import { notFound, redirect } from "next/navigation"
import { getCurrentProfile } from "@/lib/session"
import { getPenerimaan } from "@/app/actions/penerimaan"
import { PageHeader } from "@/components/page-header"
import { PenerimaanStatusBadge } from "@/components/penerimaan-status-badge"
import { PenerimaanActions } from "./_actions"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function PenerimaanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/")

  const { id: penerimaanId } = await params
  const data = await getPenerimaan(penerimaanId)
  if (!data) notFound()

  const isAdmin = profile.role.kode === "ADMIN"
  const isOwner = data.created_by === profile.id
  const canEdit = data.status === "draft" && (isOwner || isAdmin)

  const fmt = (v: string | null | undefined) =>
    v ? format(new Date(v), "dd MMMM yyyy", { locale: id }) : "—"

  const rupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/penerimaan" className="text-muted-foreground hover:text-foreground/70 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <PageHeader title={data.nomor_bukti} />
      </div>

      <div className="rounded-xl border border-border divide-y divide-border/50">
        <Row label="Status">
          <PenerimaanStatusBadge status={data.status as "draft" | "verified" | "void"} />
        </Row>
        <Row label="Tanggal Transaksi">{fmt(data.tanggal_terima)}</Row>
        <Row label="Jenis Pendapatan">
          {(data.jenis as { nama?: string } | null)?.nama ?? "—"}
        </Row>
        <Row label="Sub Pendapatan">
          {(data.sub as { nama?: string } | null)?.nama ?? "—"}
        </Row>
        <Row label="Unit Kerja">
          {(data.unit as { nama?: string } | null)?.nama ?? "—"}
        </Row>
        <Row label="Rekening Bank">
          {(() => {
            const r = data.rekening as { nama_bank?: string; nama_rekening?: string } | null
            return r ? `${r.nama_bank} — ${r.nama_rekening}` : "—"
          })()}
        </Row>
        <Row label="Metode Pembayaran">
          {(data.metode as { nama?: string } | null)?.nama ?? "—"}
        </Row>
        <Row label="Jumlah">
          <span className="text-foreground font-semibold">{rupiah(data.jumlah)}</span>
        </Row>
        <Row label="Nomor Bukti">{data.nomor_referensi ?? "—"}</Row>
        <Row label="Uraian">{data.uraian ?? "—"}</Row>
        <Row label="Diinput oleh">
          {(data.creator as { nama_lengkap?: string } | null)?.nama_lengkap ?? "—"}
        </Row>
        {data.status === "verified" && (
          <Row label="Diverifikasi">
            {(data.verifier as { nama_lengkap?: string } | null)?.nama_lengkap ?? "—"} •{" "}
            {fmt(data.verified_at)}
          </Row>
        )}
        {data.status === "void" && (
          <>
            <Row label="Dibatalkan oleh">
              {(data.voider as { nama_lengkap?: string } | null)?.nama_lengkap ?? "—"} • {fmt(data.voided_at)}
            </Row>
            <Row label="Alasan Void">{data.alasan_void ?? "—"}</Row>
          </>
        )}
      </div>

      <PenerimaanActions
        id={penerimaanId}
        status={data.status as "draft" | "verified" | "void"}
        isAdmin={isAdmin}
        canEdit={canEdit}
        isOwner={isOwner}
      />
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <span className="text-xs text-muted-foreground w-40 shrink-0">{label}</span>
      <span className="text-sm text-foreground/70 text-right">{children}</span>
    </div>
  )
}
