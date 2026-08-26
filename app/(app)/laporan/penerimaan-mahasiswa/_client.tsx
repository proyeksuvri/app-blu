"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { Download, Printer, Search, X, Users, CreditCard, Receipt, ChevronLeft, ChevronRight, GraduationCap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/empty-state"
import { PenerimaanStatusBadge } from "@/components/penerimaan-status-badge"
import { getPenerimaanMahasiswa, type PenerimaanMahasiswaResult, type PenerimaanMahasiswaRow } from "@/app/actions/laporan"

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)

export function LaporanPenerimaanMahasiswaClient({
  initialData,
  initialFilter,
}: {
  initialData: PenerimaanMahasiswaResult
  initialFilter: {
    tglAwal: string
    tglAkhir: string
    fakultas: string
    prodi: string
    status: string
    q: string
    page: number
    limit: number
  }
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [data, setData] = useState<PenerimaanMahasiswaResult>(initialData)
  const [filter, setFilter] = useState(initialFilter)
  const [searchVal, setSearchVal] = useState(initialFilter.q)

  function applyFilter(newFilter: Partial<typeof filter>) {
    const updated = { ...filter, ...newFilter, page: newFilter.page ?? 1 }
    setFilter(updated)

    startTransition(async () => {
      const res = await getPenerimaanMahasiswa({
        tglAwal: updated.tglAwal,
        tglAkhir: updated.tglAkhir,
        status: updated.status,
        q: updated.q,
        page: updated.page,
        limit: updated.limit,
      })
      setData(res)
    })

    const params = new URLSearchParams()
    if (updated.tglAwal) params.set("tglAwal", updated.tglAwal)
    if (updated.tglAkhir) params.set("tglAkhir", updated.tglAkhir)
    if (updated.status !== "all") params.set("status", updated.status)
    if (updated.q) params.set("q", updated.q)
    if (updated.page > 1) params.set("page", String(updated.page))
    router.push(`/laporan/penerimaan-mahasiswa?${params.toString()}`)
  }

  async function exportExcel() {
    if (data.rows.length === 0) return
    const XLSX = await import("xlsx")

    // Fetch all rows matching the filter without pagination limit for complete export
    const fullRes = await getPenerimaanMahasiswa({
      tglAwal: filter.tglAwal,
      tglAkhir: filter.tglAkhir,
      status: filter.status,
      q: filter.q,
      page: 1,
      limit: 10000,
    })

    const rows = fullRes.rows.map((r, idx) => ({
      "No": idx + 1,
      "No. Bukti": r.nomor_bukti,
      "Tanggal": r.tanggal_terima,
      "No. Virtual Akun": r.virtual_akun,
      "NIM": r.nim,
      "Nama Mahasiswa": r.nama_mahasiswa,
      "Fakultas": r.fakultas ?? "",
      "Program Studi": r.prodi ?? "",
      "Periode": r.periode ?? "",
      "Jenis Pendapatan": r.nama_jenis,
      "Rekening": r.nama_rekening,
      "Jumlah (Rp)": r.jumlah,
      "Status": r.status,
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, "Penerimaan Mahasiswa")
    XLSX.writeFile(wb, `laporan_penerimaan_mahasiswa_${filter.tglAwal}_sd_${filter.tglAkhir}.xlsx`)
  }

  const totalPages = Math.ceil(data.count / filter.limit)

  return (
    <div className="flex flex-col gap-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4 bg-muted/20 border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Penerimaan Mahasiswa</p>
              <p className="text-lg font-bold text-foreground mt-0.5">{rupiah(data.totalNominal)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-muted/20 border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Transaksi</p>
              <p className="text-lg font-bold text-foreground mt-0.5">{data.totalTransaksi.toLocaleString("id-ID")} Transaksi</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-muted/20 border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Mahasiswa Terlibat (Unik)</p>
              <p className="text-lg font-bold text-foreground mt-0.5">{data.totalMahasiswaUnik.toLocaleString("id-ID")} Mahasiswa</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Tanggal Awal */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-muted-foreground">Dari Tanggal</span>
            <Input
              type="date"
              value={filter.tglAwal}
              onChange={(e) => applyFilter({ tglAwal: e.target.value })}
              className="h-8 w-36 bg-muted/50 text-xs"
              disabled={pending}
            />
          </div>

          {/* Tanggal Akhir */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-muted-foreground">Sampai Tanggal</span>
            <Input
              type="date"
              value={filter.tglAkhir}
              onChange={(e) => applyFilter({ tglAkhir: e.target.value })}
              className="h-8 w-36 bg-muted/50 text-xs"
              disabled={pending}
            />
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-muted-foreground">Status</span>
            <Select
              value={filter.status}
              onValueChange={(v) => { if (v) applyFilter({ status: v }) }}
              disabled={pending}
            >
              <SelectTrigger className="h-8 w-32 bg-muted/50 text-xs">
                <SelectValue>
                  {filter.status === "all" ? "Semua Status" : filter.status === "verified" ? "Verified" : filter.status === "draft" ? "Draft" : filter.status === "void" ? "Void" : "Status"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="void">Void</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-muted-foreground">Cari</span>
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Nama, NIM, No. Bukti, VA..."
                value={searchVal}
                onChange={(e) => {
                  setSearchVal(e.target.value)
                  if (!e.target.value) applyFilter({ q: "" })
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyFilter({ q: searchVal })
                }}
                className="h-8 w-60 pl-8 pr-7 bg-muted/50 text-xs"
                disabled={pending}
              />
              {searchVal && (
                <button
                  type="button"
                  onClick={() => { setSearchVal(""); applyFilter({ q: "" }) }}
                  className="absolute right-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Export Button */}
        <div className="flex items-center gap-2 mt-4 sm:mt-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={exportExcel}
            disabled={data.rows.length === 0 || pending}
            className="gap-1.5 text-foreground/70 hover:text-foreground text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            Download Excel
          </Button>
        </div>
      </div>

      {/* Data Table */}
      {data.rows.length === 0 ? (
        <EmptyState message="Tidak ada data transaksi penerimaan mahasiswa untuk filter ini" />
      ) : (
        <div className="flex flex-col gap-3">
          <Card className="overflow-hidden p-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-xs pl-4">No. Bukti</TableHead>
                    <TableHead className="text-xs">Tanggal</TableHead>
                    <TableHead className="text-xs">No. Virtual Akun</TableHead>
                    <TableHead className="text-xs">NIM</TableHead>
                    <TableHead className="text-xs">Nama Mahasiswa</TableHead>
                    <TableHead className="text-xs">Prodi / Fakultas</TableHead>
                    <TableHead className="text-xs">Jenis</TableHead>
                    <TableHead className="text-xs text-right">Jumlah</TableHead>
                    <TableHead className="text-xs text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((row) => (
                    <TableRow key={row.id} className="border-border/50 hover:bg-muted/20">
                      <TableCell className="pl-4 py-2.5 font-mono text-xs font-semibold text-primary">
                        {row.nomor_bukti}
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-foreground/70">
                        {format(new Date(row.tanggal_terima), "dd MMM yyyy", { locale: id })}
                      </TableCell>
                      <TableCell className="py-2.5 font-mono text-xs text-foreground/80">
                        {row.virtual_akun}
                      </TableCell>
                      <TableCell className="py-2.5 font-mono text-xs text-foreground/70">{row.nim}</TableCell>
                      <TableCell className="py-2.5 text-sm font-medium text-foreground">{row.nama_mahasiswa}</TableCell>
                      <TableCell className="py-2.5 text-xs text-muted-foreground">
                        {row.prodi ?? "—"} {row.fakultas ? `(${row.fakultas})` : ""}
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-foreground/70">{row.nama_jenis}</TableCell>
                      <TableCell className="py-2.5 text-sm font-semibold text-foreground text-right">
                        {rupiah(row.jumlah)}
                      </TableCell>
                      <TableCell className="py-2.5 text-center">
                        <PenerimaanStatusBadge status={row.status as "draft" | "verified" | "void"} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{data.count} transaksi ditemukan · Halaman {filter.page} dari {totalPages}</span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => applyFilter({ page: filter.page - 1 })}
                  disabled={filter.page <= 1 || pending}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => applyFilter({ page: filter.page + 1 })}
                  disabled={filter.page >= totalPages || pending}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
