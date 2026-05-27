"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Download, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EmptyState } from "@/components/empty-state"

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)

const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"]

type JenisGroup = { kode: string; nama: string; total: number }
type KategoriGroup = { kodeKategori: string; namaKategori: string; total: number; jenis: Record<string, JenisGroup> }

export function LaporanBulananClient({ tahun, bulan, byKategori, total }: {
  tahun: number; bulan: number
  byKategori: KategoriGroup[]; total: number
}) {
  const router = useRouter()
  const [pdfLoading, setPdfLoading] = useState(false)
  const tahunList = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  function navigate(t: number, b: number) {
    router.push(`/laporan/bulanan?tahun=${t}&bulan=${b}`)
  }

  async function exportPDF() {
    setPdfLoading(true)
    try {
      const { pdf } = await import("@react-pdf/renderer")
      const { LaporanBulananPDF } = await import("@/components/pdf/laporan-bulanan-pdf")
      const blob = await pdf(
        <LaporanBulananPDF tahun={tahun} bulan={bulan} byKategori={byKategori} total={total} />
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `laporan-bulanan-${tahun}-${String(bulan).padStart(2, "0")}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setPdfLoading(false)
    }
  }

  async function exportExcel() {
    const XLSX = await import("xlsx")
    const rows: Record<string, unknown>[] = []
    for (const kat of byKategori) {
      rows.push({ "Kategori": kat.namaKategori, "Jenis": "", "Total": kat.total })
      for (const j of Object.values(kat.jenis)) {
        rows.push({ "Kategori": "", "Jenis": j.nama, "Total": j.total })
      }
    }
    rows.push({ "Kategori": "TOTAL", "Jenis": "", "Total": total })
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Bulanan")
    XLSX.writeFile(wb, `laporan-bulanan-${tahun}-${String(bulan).padStart(2, "0")}.xlsx`)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2">
          <Select value={String(bulan)} onValueChange={(v) => v != null && navigate(tahun, parseInt(v))}>
            <SelectTrigger className="w-36 bg-muted/50 border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BULAN.map((b, i) => <SelectItem key={i + 1} value={String(i + 1)}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(tahun)} onValueChange={(v) => v != null && navigate(parseInt(v), bulan)}>
            <SelectTrigger className="w-28 bg-muted/50 border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tahunList.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={exportExcel} className="gap-1.5 text-foreground/50 hover:text-foreground">
            <Download className="h-4 w-4" />Excel
          </Button>
          <Button variant="ghost" size="sm" onClick={exportPDF} disabled={pdfLoading} className="gap-1.5 text-foreground/50 hover:text-foreground">
            <FileText className="h-4 w-4" />{pdfLoading ? "..." : "PDF"}
          </Button>
        </div>
      </div>

      {byKategori.length === 0 ? (
        <EmptyState message={`Tidak ada penerimaan pada ${BULAN[bulan - 1]} ${tahun}`} />
      ) : (
        <div className="flex flex-col gap-3">
          {byKategori.map((kat) => (
            <div key={kat.kodeKategori} className="rounded-xl border border-border overflow-hidden">
              <div className="flex items-center justify-between bg-muted/50 px-4 py-3">
                <span className="text-sm font-semibold text-foreground">{kat.namaKategori}</span>
                <span className="text-sm font-bold text-foreground">{rupiah(kat.total)}</span>
              </div>
              <div className="divide-y divide-border/50">
                {Object.values(kat.jenis).map((j) => (
                  <div key={j.kode} className="flex items-center justify-between px-6 py-2.5">
                    <span className="text-sm text-foreground/60">{j.nama}</span>
                    <span className="text-sm text-foreground/70">{rupiah(j.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
            <span className="text-sm font-semibold text-foreground/80">TOTAL BULAN INI</span>
            <span className="text-base font-bold text-foreground">{rupiah(total)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
