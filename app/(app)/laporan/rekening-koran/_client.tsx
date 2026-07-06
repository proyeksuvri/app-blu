"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState } from "@/components/empty-state"
import { rekapRekeningKoran, type RekeningKoranResult, type BulanPoint } from "@/app/actions/laporan"

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)

type Rekening = { id: string; nama_bank: string; nama_rekening: string; nomor_rekening: string }

export function LaporanRekeningKoranClient({
  rekeningList,
  initialData,
  initialRekeningId,
  initialTahun,
}: {
  rekeningList: Rekening[]
  initialData: RekeningKoranResult | null
  initialRekeningId: string
  initialTahun: number
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [data, setData] = useState(initialData)
  const [rekeningId, setRekeningId] = useState(initialRekeningId)
  const [tahun, setTahun] = useState(initialTahun)

  const tahunList = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i)

  function navigate(rid: string, thn: number) {
    router.push(`/laporan/rekening-koran?rekening_id=${rid}&tahun=${thn}`)
  }

  function handleRekening(id: string) {
    setRekeningId(id)
    startTransition(async () => {
      const result = await rekapRekeningKoran(id, tahun)
      setData(result)
    })
    navigate(id, tahun)
  }

  function handleTahun(thn: number) {
    setTahun(thn)
    startTransition(async () => {
      const result = await rekapRekeningKoran(rekeningId, thn)
      setData(result)
    })
    navigate(rekeningId, thn)
  }

  async function exportExcel() {
    if (!data) return
    const XLSX = await import("xlsx")
    const rows: Record<string, unknown>[] = [
      { "Keterangan": "Saldo Awal", "Penerimaan": "", "Pengeluaran": "", "Saldo": data.saldoAwal },
    ]
    for (const b of data.perBulan) {
      if (b.penerimaan > 0 || b.pengeluaran > 0) {
        rows.push({
          "Keterangan": b.namaBulan,
          "Penerimaan": b.penerimaan,
          "Pengeluaran": b.pengeluaran,
          "Saldo": b.saldo,
        })
      }
    }
    rows.push({ "Keterangan": "Saldo Akhir", "Penerimaan": data.totalPenerimaan, "Pengeluaran": data.totalPengeluaran, "Saldo": data.saldoAkhir })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Rekening Koran")
    XLSX.writeFile(wb, `rekening-koran-${data.namaBank.replace(/\s+/g, "-")}-${data.tahun}.xlsx`)
  }

  const hasData = data && (data.totalPenerimaan > 0 || data.totalPengeluaran > 0 || data.saldoAwal > 0)

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Select value={rekeningId} onValueChange={(v) => v && handleRekening(v)} disabled={pending}>
            <SelectTrigger className="w-64 bg-muted/50 border-border text-foreground">
              <SelectValue placeholder="Pilih rekening..." />
            </SelectTrigger>
            <SelectContent>
              {rekeningList.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.nama_bank} — {r.nomor_rekening}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(tahun)} onValueChange={(v) => v && handleTahun(parseInt(v))} disabled={pending}>
            <SelectTrigger className="w-28 bg-muted/50 border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tahunList.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button variant="ghost" size="sm" onClick={exportExcel} disabled={!hasData || pending} className="gap-1.5 text-foreground/50 hover:text-foreground">
          <Download className="h-4 w-4" />Excel
        </Button>
      </div>

      {/* Info rekening */}
      {data && (
        <div className="text-xs text-muted-foreground">
          {data.namaRekening} · {data.nomorRekening}
        </div>
      )}

      {/* Ringkasan saldo */}
      {data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Saldo Awal", value: data.saldoAwal, note: `Per 1 Jan ${data.tahun}` },
            { label: "Total Penerimaan", value: data.totalPenerimaan, note: "Debit", positive: true },
            { label: "Total Pengeluaran", value: data.totalPengeluaran, note: "Kredit", negative: true },
            { label: "Saldo Akhir", value: data.saldoAkhir, note: `Per 31 Des ${data.tahun}`, bold: true },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-border p-4 flex flex-col gap-1">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={`text-sm font-semibold ${item.bold ? "text-foreground" : item.positive ? "text-emerald-500" : item.negative ? "text-rose-500" : "text-foreground/80"}`}>
                {rupiah(item.value)}
              </p>
              <p className="text-xs text-muted-foreground/60">{item.note}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabel per bulan */}
      {!hasData ? (
        <EmptyState message={rekeningId ? "Tidak ada data untuk rekening dan tahun ini" : "Pilih rekening terlebih dahulu"} />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground text-xs">Bulan</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Penerimaan (Debit)</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Pengeluaran (Kredit)</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Saldo Akhir</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Baris saldo awal */}
              <TableRow className="border-border/50 bg-muted/20">
                <TableCell className="text-xs font-medium text-foreground/80 py-2.5">
                  Saldo Awal (1 Jan {data!.tahun})
                </TableCell>
                <TableCell className="text-xs text-foreground/50 py-2.5 text-right">—</TableCell>
                <TableCell className="text-xs text-foreground/50 py-2.5 text-right">—</TableCell>
                <TableCell className="text-xs font-semibold text-foreground py-2.5 text-right">
                  {rupiah(data!.saldoAwal)}
                </TableCell>
              </TableRow>

              {data!.perBulan.map((b: BulanPoint) => (
                <TableRow key={b.bulan} className="border-border/50">
                  <TableCell className="text-sm text-foreground/70 py-2.5">{b.namaBulan}</TableCell>
                  <TableCell className={`text-sm py-2.5 text-right ${b.penerimaan > 0 ? "text-emerald-500" : "text-foreground/30"}`}>
                    {b.penerimaan > 0 ? rupiah(b.penerimaan) : "—"}
                  </TableCell>
                  <TableCell className={`text-sm py-2.5 text-right ${b.pengeluaran > 0 ? "text-rose-500" : "text-foreground/30"}`}>
                    {b.pengeluaran > 0 ? rupiah(b.pengeluaran) : "—"}
                  </TableCell>
                  <TableCell className="text-sm font-medium text-foreground/80 py-2.5 text-right">
                    {rupiah(b.saldo)}
                  </TableCell>
                </TableRow>
              ))}

              {/* Baris total */}
              <TableRow className="border-t-2 border-border bg-muted/30">
                <TableCell className="text-xs font-semibold text-foreground/70 py-3">SALDO AKHIR</TableCell>
                <TableCell className="text-sm font-bold text-emerald-500 py-3 text-right">
                  {rupiah(data!.totalPenerimaan)}
                </TableCell>
                <TableCell className="text-sm font-bold text-rose-500 py-3 text-right">
                  {rupiah(data!.totalPengeluaran)}
                </TableCell>
                <TableCell className="text-base font-bold text-foreground py-3 text-right">
                  {rupiah(data!.saldoAkhir)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
