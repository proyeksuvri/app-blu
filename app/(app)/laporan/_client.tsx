"use client"

import { useState, useTransition } from "react"
import { Download, Printer } from "lucide-react"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { PenerimaanStatusBadge } from "@/components/penerimaan-status-badge"
import { EmptyState } from "@/components/empty-state"
import { rekapHarian, rekapBulanan, rekapPerRekening } from "@/app/actions/laporan"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)

const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"]

type HarianRow = {
  nomor_bukti: string; jumlah: number; status: string; nomor_referensi: string | null
  jenis: { nama?: string } | null; unit: { kode?: string } | null
  rekening: { nama_bank?: string } | null; metode: { nama?: string } | null
}
type KategoriGroup = { kodeKategori: string; namaKategori: string; total: number; jenis: Record<string, { kode: string; nama: string; total: number }> }
type Rekening = { kode: string; nama_bank: string; nama_rekening: string; nomor_rekening: string; total: number }

type Props = {
  initialHarian: { tanggal: string; rows: HarianRow[]; total: number }
  initialBulanan: { tahun: number; bulan: number; byKategori: KategoriGroup[]; total: number }
  initialRekening: { tglAwal: string; tglAkhir: string; byRekening: Rekening[]; total: number }
}

export function LaporanClient({ initialHarian, initialBulanan, initialRekening }: Props) {
  const [pending, startTransition] = useTransition()

  // Harian state
  const [tanggal, setTanggal] = useState(initialHarian.tanggal)
  const [harianRows, setHarianRows] = useState(initialHarian.rows)
  const [harianTotal, setHarianTotal] = useState(initialHarian.total)

  // Bulanan state
  const [tahun, setTahun] = useState(initialBulanan.tahun)
  const [bulan, setBulan] = useState(initialBulanan.bulan)
  const [byKategori, setByKategori] = useState(initialBulanan.byKategori)
  const [bulananTotal, setBulananTotal] = useState(initialBulanan.total)

  // Per-rekening state
  const [tglAwal, setTglAwal] = useState(initialRekening.tglAwal)
  const [tglAkhir, setTglAkhir] = useState(initialRekening.tglAkhir)
  const [byRekening, setByRekening] = useState(initialRekening.byRekening)
  const [rekeningTotal, setRekeningTotal] = useState(initialRekening.total)

  const tahunList = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  function fetchHarian(tgl: string) {
    setTanggal(tgl)
    startTransition(async () => {
      const data = await rekapHarian(tgl)
      setHarianRows(data.rows)
      setHarianTotal(data.total)
    })
  }

  function fetchBulanan(t: number, b: number) {
    setTahun(t); setBulan(b)
    startTransition(async () => {
      const data = await rekapBulanan(t, b)
      setByKategori(data.byKategori)
      setBulananTotal(data.total)
    })
  }

  function fetchRekening(awal: string, akhir: string) {
    setTglAwal(awal); setTglAkhir(akhir)
    startTransition(async () => {
      const data = await rekapPerRekening(awal, akhir)
      setByRekening(data.byRekening)
      setRekeningTotal(data.total)
    })
  }

  async function exportHarian() {
    const XLSX = await import("xlsx")
    const data = harianRows.map((r) => ({
      "Nomor Bukti": r.nomor_bukti, "Jenis": r.jenis?.nama ?? "—", "Unit": r.unit?.kode ?? "—",
      "Rekening": r.rekening?.nama_bank ?? "—", "Metode": r.metode?.nama ?? "—",
      "No. Referensi": r.nomor_referensi ?? "", "Jumlah": r.jumlah, "Status": r.status,
    }))
    data.push({ "Nomor Bukti": "TOTAL", "Jenis": "", "Unit": "", "Rekening": "", "Metode": "", "No. Referensi": "", "Jumlah": harianTotal, "Status": "" })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "Laporan Harian")
    XLSX.writeFile(wb, `laporan-harian-${tanggal}.xlsx`)
  }

  async function exportBulanan() {
    const XLSX = await import("xlsx")
    const rows: Record<string, unknown>[] = []
    for (const kat of byKategori) {
      rows.push({ "Kategori": kat.namaKategori, "Jenis": "", "Total": kat.total })
      for (const j of Object.values(kat.jenis)) rows.push({ "Kategori": "", "Jenis": j.nama, "Total": j.total })
    }
    rows.push({ "Kategori": "TOTAL", "Jenis": "", "Total": bulananTotal })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Laporan Bulanan")
    XLSX.writeFile(wb, `laporan-bulanan-${tahun}-${String(bulan).padStart(2, "0")}.xlsx`)
  }

  async function exportRekening() {
    const XLSX = await import("xlsx")
    const data = byRekening.map((r) => ({
      "Kode": r.kode, "Nama Bank": r.nama_bank, "Nama Rekening": r.nama_rekening,
      "Nomor Rekening": r.nomor_rekening, "Total Penerimaan": r.total,
    }))
    data.push({ "Kode": "TOTAL", "Nama Bank": "", "Nama Rekening": "", "Nomor Rekening": "", "Total Penerimaan": rekeningTotal })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "Rekap Rekening")
    XLSX.writeFile(wb, `rekap-rekening-${tglAwal}-sd-${tglAkhir}.xlsx`)
  }

  const tglLabel = format(new Date(tanggal + "T00:00:00"), "EEEE, dd MMMM yyyy", { locale: id })

  return (
    <Tabs defaultValue="harian">
      <TabsList>
        <TabsTrigger value="harian">Harian</TabsTrigger>
        <TabsTrigger value="bulanan">Bulanan</TabsTrigger>
        <TabsTrigger value="per-rekening">Per Rekening</TabsTrigger>
      </TabsList>

      {/* Tab Harian */}
      <TabsContent value="harian">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <Input type="date" value={tanggal} onChange={(e) => fetchHarian(e.target.value)}
              className="w-44 bg-muted/50 border-border text-foreground" disabled={pending} />
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={exportHarian} className="gap-1.5 text-foreground/50 hover:text-foreground">
                <Download className="h-4 w-4" />Excel
              </Button>
              <Button variant="ghost" size="sm" onClick={() => window.print()} className="gap-1.5 text-foreground/50 hover:text-foreground">
                <Printer className="h-4 w-4" />PDF
              </Button>
            </div>
          </div>

          {harianRows.length === 0 ? (
            <EmptyState message={`Tidak ada penerimaan pada ${tglLabel}`} />
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground text-xs">No. Bukti</TableHead>
                    <TableHead className="text-muted-foreground text-xs">Jenis</TableHead>
                    <TableHead className="text-muted-foreground text-xs">Unit</TableHead>
                    <TableHead className="text-muted-foreground text-xs">Metode</TableHead>
                    <TableHead className="text-muted-foreground text-xs text-right">Jumlah</TableHead>
                    <TableHead className="text-muted-foreground text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {harianRows.map((r) => (
                    <TableRow key={r.nomor_bukti} className="border-border/50">
                      <TableCell className="text-xs font-mono text-foreground/70 py-2">{r.nomor_bukti}</TableCell>
                      <TableCell className="text-xs text-foreground/70 py-2">{r.jenis?.nama ?? "—"}</TableCell>
                      <TableCell className="text-xs text-foreground/50 py-2">{r.unit?.kode ?? "—"}</TableCell>
                      <TableCell className="text-xs text-foreground/50 py-2">{r.metode?.nama ?? "—"}</TableCell>
                      <TableCell className="text-xs text-foreground/80 py-2 text-right font-medium">{rupiah(r.jumlah)}</TableCell>
                      <TableCell className="text-xs py-2">
                        <PenerimaanStatusBadge status={r.status as "draft" | "verified" | "void"} />
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 border-border font-semibold">
                    <TableCell colSpan={4} className="text-xs text-foreground/60 py-2">TOTAL</TableCell>
                    <TableCell className="text-sm text-foreground font-bold py-2 text-right">{rupiah(harianTotal)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </TabsContent>

      {/* Tab Bulanan */}
      <TabsContent value="bulanan">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex gap-2">
              <Select value={String(bulan)} onValueChange={(v) => fetchBulanan(tahun, parseInt(v))}>
                <SelectTrigger className="w-36 bg-muted/50 border-border text-foreground">
                  <span className="flex flex-1 text-left text-sm truncate">{BULAN[bulan - 1]}</span>
                </SelectTrigger>
                <SelectContent>
                  {BULAN.map((b, i) => <SelectItem key={i + 1} value={String(i + 1)}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={String(tahun)} onValueChange={(v) => fetchBulanan(parseInt(v), bulan)}>
                <SelectTrigger className="w-28 bg-muted/50 border-border text-foreground">
                  <span className="flex flex-1 text-left text-sm truncate">{tahun}</span>
                </SelectTrigger>
                <SelectContent>
                  {tahunList.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={exportBulanan} className="gap-1.5 text-foreground/50 hover:text-foreground">
                <Download className="h-4 w-4" />Excel
              </Button>
              <Button variant="ghost" size="sm" onClick={() => window.print()} className="gap-1.5 text-foreground/50 hover:text-foreground">
                <Printer className="h-4 w-4" />PDF
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
                <span className="text-base font-bold text-foreground">{rupiah(bulananTotal)}</span>
              </div>
            </div>
          )}
        </div>
      </TabsContent>

      {/* Tab Per Rekening */}
      <TabsContent value="per-rekening">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Dari</Label>
                <Input type="date" value={tglAwal} onChange={(e) => fetchRekening(e.target.value, tglAkhir)}
                  className="w-40 bg-muted/50 border-border text-foreground" disabled={pending} />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Sampai</Label>
                <Input type="date" value={tglAkhir} onChange={(e) => fetchRekening(tglAwal, e.target.value)}
                  className="w-40 bg-muted/50 border-border text-foreground" disabled={pending} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={exportRekening} className="gap-1.5 text-foreground/50 hover:text-foreground">
                <Download className="h-4 w-4" />Excel
              </Button>
              <Button variant="ghost" size="sm" onClick={() => window.print()} className="gap-1.5 text-foreground/50 hover:text-foreground">
                <Printer className="h-4 w-4" />PDF
              </Button>
            </div>
          </div>

          {byRekening.length === 0 ? (
            <EmptyState message="Tidak ada data untuk periode ini" />
          ) : (
            <div className="flex flex-col gap-2">
              {byRekening.map((r) => (
                <div key={r.kode} className="rounded-xl border border-border px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground/80">{r.nama_bank}</p>
                    <p className="text-xs text-muted-foreground">{r.nama_rekening} — {r.nomor_rekening}</p>
                  </div>
                  <span className="text-sm font-bold text-foreground">{rupiah(r.total)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-xl bg-muted px-5 py-4">
                <span className="text-sm font-semibold text-foreground/80">TOTAL</span>
                <span className="text-base font-bold text-foreground">{rupiah(rekeningTotal)}</span>
              </div>
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  )
}
