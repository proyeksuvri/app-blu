"use client"

import { useRouter } from "next/navigation"
import { Download, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PenerimaanStatusBadge } from "@/components/penerimaan-status-badge"
import { EmptyState } from "@/components/empty-state"
import { format } from "date-fns"
import { id } from "date-fns/locale"

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)

type Row = {
  nomor_bukti: string; jumlah: number; status: string; nomor_referensi: string | null
  jenis: { nama?: string } | null; unit: { kode?: string } | null
  rekening: { nama_bank?: string } | null; metode: { nama?: string } | null
}

export function LaporanHarianClient({ tanggal, rows, total }: { tanggal: string; rows: Row[]; total: number }) {
  const router = useRouter()

  function handleTanggal(e: React.ChangeEvent<HTMLInputElement>) {
    router.push(`/laporan/harian?tanggal=${e.target.value}`)
  }

  async function exportExcel() {
    const XLSX = await import("xlsx")
    const data = rows.map((r) => ({
      "Nomor Bukti": r.nomor_bukti,
      "Jenis": r.jenis?.nama ?? "—",
      "Unit": r.unit?.kode ?? "—",
      "Rekening": r.rekening?.nama_bank ?? "—",
      "Metode": r.metode?.nama ?? "—",
      "No. Referensi": r.nomor_referensi ?? "",
      "Jumlah": r.jumlah,
      "Status": r.status,
    }))
    data.push({ "Nomor Bukti": "TOTAL", "Jenis": "", "Unit": "", "Rekening": "", "Metode": "", "No. Referensi": "", "Jumlah": total, "Status": "" })
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Harian")
    XLSX.writeFile(wb, `laporan-harian-${tanggal}.xlsx`)
  }

  const tglLabel = format(new Date(tanggal + "T00:00:00"), "EEEE, dd MMMM yyyy", { locale: id })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Input
          type="date" value={tanggal} onChange={handleTanggal}
          className="w-44 bg-muted/50 border-border text-foreground"
        />
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={exportExcel} className="gap-1.5 text-foreground/50 hover:text-foreground">
            <Download className="h-4 w-4" />Excel
          </Button>
          <Button variant="ghost" size="sm" onClick={() => window.print()} className="gap-1.5 text-foreground/50 hover:text-foreground">
            <Printer className="h-4 w-4" />PDF
          </Button>
        </div>
      </div>

      <div className="print:block">
        <div className="hidden print:block mb-4 text-black">
          <h2 className="text-xl font-bold">Laporan Penerimaan Harian</h2>
          <p className="text-sm">BLU UIN Palopo — {tglLabel}</p>
        </div>

        {rows.length === 0 ? (
          <EmptyState message={`Tidak ada penerimaan pada ${tglLabel}`} />
        ) : (
          <div className="rounded-xl border border-border overflow-hidden print:border-gray-300">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent print:border-gray-200">
                  <TableHead className="text-muted-foreground text-xs print:text-gray-500">No. Bukti</TableHead>
                  <TableHead className="text-muted-foreground text-xs print:text-gray-500">Jenis</TableHead>
                  <TableHead className="text-muted-foreground text-xs print:text-gray-500">Unit</TableHead>
                  <TableHead className="text-muted-foreground text-xs print:text-gray-500">Metode</TableHead>
                  <TableHead className="text-muted-foreground text-xs print:text-gray-500 text-right">Jumlah</TableHead>
                  <TableHead className="text-muted-foreground text-xs print:text-gray-500 print:hidden">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.nomor_bukti} className="border-border/50 print:border-gray-100">
                    <TableCell className="text-xs font-mono text-foreground/70 py-2 print:text-gray-700">{r.nomor_bukti}</TableCell>
                    <TableCell className="text-xs text-foreground/70 py-2 print:text-gray-700">{r.jenis?.nama ?? "—"}</TableCell>
                    <TableCell className="text-xs text-foreground/50 py-2 print:text-gray-600">{r.unit?.kode ?? "—"}</TableCell>
                    <TableCell className="text-xs text-foreground/50 py-2 print:text-gray-600">{r.metode?.nama ?? "—"}</TableCell>
                    <TableCell className="text-xs text-foreground/80 py-2 text-right font-medium print:text-gray-800">{rupiah(r.jumlah)}</TableCell>
                    <TableCell className="text-xs py-2 print:hidden">
                      <PenerimaanStatusBadge status={r.status as "draft" | "verified" | "void"} />
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2 border-border font-semibold print:border-gray-400">
                  <TableCell colSpan={4} className="text-xs text-foreground/60 py-2 print:text-gray-700">TOTAL</TableCell>
                  <TableCell className="text-sm text-foreground font-bold py-2 text-right print:text-gray-900">{rupiah(total)}</TableCell>
                  <TableCell className="print:hidden" />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
