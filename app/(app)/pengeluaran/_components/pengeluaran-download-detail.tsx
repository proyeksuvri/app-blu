"use client"

import { useState } from "react"
import { FileSpreadsheet, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { exportPengeluaranDetail } from "@/app/actions/pengeluaran"

type DownloadDetailButtonProps = {
  filter?: Record<string, string>
  sort?: "tanggal" | "jumlah" | "nomor_bukti"
  order?: "asc" | "desc"
}

export function PengeluaranDownloadDetail({ filter, sort, order }: DownloadDetailButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleDownloadDetail() {
    setLoading(true)
    try {
      const statuses = (filter?.status ?? "").split(",").filter(Boolean)
      const tahun = filter?.tahun ? parseInt(filter.tahun) : undefined
      const bulan = filter?.bulan ? parseInt(filter.bulan) : undefined

      const result = await exportPengeluaranDetail({
        statuses: statuses.length ? statuses : undefined,
        tahun,
        bulan,
        unit_id: filter?.unit_id || undefined,
        rekening_id: filter?.rekening_id || undefined,
        tgl_awal: filter?.tgl_awal,
        tgl_akhir: filter?.tgl_akhir,
        q: filter?.q,
        sort: sort,
        order: order,
      })


      if (!result.ok) {
        toast.error(result.pesan)
        return
      }

      const XLSX = await import("xlsx")
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(result.rows)

      ws["!cols"] = [
        { wch: 18 }, // Nomor Bukti
        { wch: 15 }, // Tanggal
        { wch: 14 }, // Status
        { wch: 16 }, // Jumlah
        { wch: 35 }, // Uraian / Keterangan
        { wch: 30 }, // Kategori Pengeluaran
        { wch: 30 }, // Jenis Pengeluaran
        { wch: 25 }, // Unit Kerja
        { wch: 35 }, // Bank & Rekening
        { wch: 20 }, // Dibuat Oleh
        { wch: 20 }, // Diverifikasi Oleh
        { wch: 20 }, // Waktu Verifikasi
        { wch: 20 }, // Dibatalkan Oleh
        { wch: 20 }, // Waktu Dibatalkan
      ]

      XLSX.utils.book_append_sheet(wb, ws, "Detail Pengeluaran")
      const label = statuses.length === 1 ? `-${statuses[0]}` : ""
      XLSX.writeFile(wb, `pengeluaran-detail${label}-${new Date().toISOString().slice(0, 10)}.xlsx`)
      toast.success("Berhasil mengunduh data detail pengeluaran")
    } catch (err) {
      toast.error("Gagal mengunduh data detail pengeluaran")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownloadDetail}
      disabled={loading}
      className="gap-1.5 text-muted-foreground hover:text-foreground border-dashed"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
      )}
      Download Detail Excel
    </Button>
  )
}
