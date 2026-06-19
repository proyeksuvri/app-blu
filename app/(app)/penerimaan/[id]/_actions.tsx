"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { verifyPenerimaan, voidPenerimaan, deletePenerimaan } from "@/app/actions/penerimaan"
import Link from "next/link"

type Props = {
  id: string
  status: "draft" | "verified" | "void"
  isAdmin: boolean
  canEdit: boolean
  isOwner: boolean
}

export function PenerimaanActions({ id, status, isAdmin, canEdit, isOwner }: Props) {
  const router = useRouter()
  const [voidOpen, setVoidOpen] = useState(false)
  const [alasan, setAlasan] = useState("")
  const [pending, startTransition] = useTransition()

  function handleVerify() {
    startTransition(async () => {
      const result = await verifyPenerimaan(id)
      if (!result.ok) { toast.error(result.pesan); return }
      toast.success("Transaksi berhasil diverifikasi")
    })
  }

  function handleVoid() {
    if (!alasan.trim()) { toast.error("Alasan void wajib diisi"); return }
    startTransition(async () => {
      const result = await voidPenerimaan(id, alasan)
      if (!result.ok) { toast.error(result.pesan); return }
      toast.success("Transaksi dibatalkan")
      setVoidOpen(false)
    })
  }

  function handleDelete() {
    const msg = status === "draft"
      ? "Hapus draft ini? Tindakan tidak bisa dibatalkan."
      : `Hapus transaksi ${status} ini secara permanen? Tindakan tidak bisa dibatalkan.`
    if (!confirm(msg)) return
    startTransition(async () => {
      const result = await deletePenerimaan(id)
      if (!result.ok) { toast.error(result.pesan); return }
      toast.success("Transaksi dihapus")
      router.push("/penerimaan")
    })
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {canEdit && (
        <Link
          href={`/penerimaan/${id}/edit`}
          className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-sm text-foreground/70 hover:bg-muted/50 transition-colors"
        >
          Edit
        </Link>
      )}

      {status === "draft" && isAdmin && (
        <Button size="sm" onClick={handleVerify} disabled={pending}>
          {pending ? "Memproses..." : "Verifikasi"}
        </Button>
      )}

      {status === "verified" && isAdmin && (
        <Button variant="destructive" size="sm" onClick={() => setVoidOpen(true)}>
          Void
        </Button>
      )}

      {(status === "draft" ? (isOwner || isAdmin) : isAdmin) && (
        <Button variant="destructive" size="sm" onClick={handleDelete} disabled={pending}>
          Hapus
        </Button>
      )}

      {/* Dialog void */}
      <Dialog open={voidOpen} onOpenChange={setVoidOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Batalkan Transaksi</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-foreground/60 text-xs">Alasan Pembatalan <span className="text-destructive">*</span></Label>
              <Textarea
                value={alasan}
                onChange={(e) => setAlasan(e.target.value)}
                rows={3}
                placeholder="Jelaskan alasan pembatalan..."
                className="bg-muted/50 border-border text-foreground resize-none"
              />
            </div>
            <Button onClick={handleVoid} disabled={pending || !alasan.trim()} variant="destructive" className="w-full">
              {pending ? "Memproses..." : "Konfirmasi Void"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
