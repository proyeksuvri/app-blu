"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Target, Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import {
  getTargetPendapatanForm,
  saveTargetPendapatanBatch,
  type TargetFormItem,
} from "@/app/actions/target-pendapatan"

interface Props {
  tahun: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const rupiahFormat = (val: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(val)

export function TargetPendapatanModal({
  tahun,
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const [items, setItems] = useState<TargetFormItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open, tahun])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const data = await getTargetPendapatanForm(tahun)
      setItems(data)
    } catch (err: any) {
      toast.error("Gagal memuat target pendapatan", { description: err.message })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTargetChange = (jenisId: string, rawVal: string) => {
    // Bersihkan non-digit
    const numericStr = rawVal.replace(/\D/g, "")
    const num = numericStr ? parseInt(numericStr, 10) : 0

    setItems((prev) =>
      prev.map((item) =>
        item.jenis_pendapatan_id === jenisId ? { ...item, target: num } : item
      )
    )
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const payload = items.map((item) => ({
        jenis_pendapatan_id: item.jenis_pendapatan_id,
        target: item.target,
      }))
      await saveTargetPendapatanBatch(tahun, payload)
      toast.success(`Target pendapatan tahun ${tahun} berhasil disimpan!`)
      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      toast.error("Gagal menyimpan target", { description: err.message })
    } finally {
      setIsSaving(false)
    }
  }

  const totalTarget = items.reduce((sum, item) => sum + (item.target || 0), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="pb-2 border-b">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-primary/10 text-primary">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                Target Pendapatan Tahun {tahun}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Atur nominal target realisasi pendapatan per jenis pendapatan untuk tahun {tahun}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Dynamic Body */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-xs">Memuat data jenis & target...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              Tidak ada data jenis pendapatan aktif ditemukan.
            </div>
          ) : (
            <div className="border rounded-md divide-y overflow-hidden text-xs">
              <div className="grid grid-cols-12 bg-muted/60 p-2.5 font-semibold text-muted-foreground">
                <div className="col-span-2">Kode MAP</div>
                <div className="col-span-5">Jenis Pendapatan</div>
                <div className="col-span-5 text-right pr-2">Target (Rp)</div>
              </div>

              {items.map((item) => (
                <div
                  key={item.jenis_pendapatan_id}
                  className="grid grid-cols-12 items-center p-2.5 hover:bg-muted/20 gap-2"
                >
                  <div className="col-span-2 font-mono font-medium text-foreground">
                    {item.akun_pendapatan}
                  </div>
                  <div className="col-span-5 space-y-0.5">
                    <div className="font-medium text-foreground">{item.nama}</div>
                    <div className="text-[10px] text-muted-foreground">
                      Kategori: {item.kategori_nama}
                    </div>
                  </div>
                  <div className="col-span-5 flex justify-end">
                    <div className="relative w-full max-w-[220px]">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-medium">
                        Rp
                      </span>
                      <Input
                        type="text"
                        value={item.target > 0 ? rupiahFormat(item.target) : ""}
                        placeholder="0"
                        onChange={(e) =>
                          handleTargetChange(item.jenis_pendapatan_id, e.target.value)
                        }
                        className="pl-8 text-right h-8 text-xs font-semibold tabular-nums"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="pt-3 border-t flex items-center justify-between">
          <div className="text-xs text-muted-foreground font-medium">
            Total Target {tahun}:{" "}
            <span className="text-primary font-bold tabular-nums text-sm">
              Rp {rupiahFormat(totalTarget)}
            </span>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isLoading || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  Simpan Target
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
