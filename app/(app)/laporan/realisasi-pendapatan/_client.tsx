"use client"

import { useState, Fragment } from "react"
import { useRouter } from "next/navigation"
import { pdf } from "@react-pdf/renderer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Printer, Filter, X, LayoutList, Landmark, ListTree, CalendarDays, Target, FileBarChart2, PieChart } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import type { RealisasiPendapatanRow, RealisasiPendapatanRekeningGroup, RealisasiKategoriGroup, RealisasiPendapatanBulananResult } from "@/app/actions/laporan"
import { getRealisasiPendapatan, getRealisasiPendapatanPerRekening, getRealisasiPendapatanDetail, getRealisasiPendapatanBulanan } from "@/app/actions/laporan"
import type { RealisasiPendapatanRingkasanResult } from "@/app/actions/laporan-ringkasan"
import { getRealisasiPendapatanRingkasan } from "@/app/actions/laporan-ringkasan"
import { RealisasiPendapatanPDF } from "@/components/pdf/realisasi-pendapatan-pdf"
import { RealisasiPendapatanRekeningPDF } from "@/components/pdf/realisasi-pendapatan-rekening-pdf"
import { RealisasiPendapatanDetailPDF } from "@/components/pdf/realisasi-pendapatan-detail-pdf"
import { RealisasiPendapatanBulananPDF } from "@/components/pdf/realisasi-pendapatan-bulanan-pdf"
import { RealisasiPendapatanTriwulanPDF } from "@/components/pdf/realisasi-pendapatan-triwulan-pdf"
import { RealisasiPendapatanRingkasanPDF } from "@/components/pdf/realisasi-pendapatan-ringkasan-pdf"
import { PdfProgressOverlay, usePdfProgress } from "@/components/pdf-progress-overlay"
import { TargetPendapatanModal } from "@/components/target-pendapatan-modal"
import { toast } from "sonner"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Props {
  initialTglAwal: string
  initialTglAkhir: string
  initialData: RealisasiPendapatanRow[]
  initialDataRekening: RealisasiPendapatanRekeningGroup[]
  initialDataDetail: RealisasiKategoriGroup[]
  initialDataBulanan: RealisasiPendapatanBulananResult
  initialTahunBulanan: number
  initialDataRingkasan: RealisasiPendapatanRingkasanResult
  isAdmin: boolean
}

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n)

// Format angka ringkas tanpa simbol Rp, untuk kolom tabel yang sempit
const rupiahAngka = (n: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n)

export type PrevTwCol = {
  label: string
  indices: number[]
}

function getPrevTwColumns(checkedBulan?: number[]): PrevTwCol[] {
  if (!checkedBulan || checkedBulan.length === 0) return []
  const sorted = [...checkedBulan].sort((a, b) => a - b)
  const minMonth = sorted[0]

  const cols: PrevTwCol[] = []
  if (minMonth >= 4) {
    cols.push({ label: "TOTAL TW I", indices: [0, 1, 2] })
  }
  if (minMonth >= 7) {
    cols.push({ label: "TOTAL TW II", indices: [3, 4, 5] })
  }
  if (minMonth >= 10) {
    cols.push({ label: "TOTAL TW III", indices: [6, 7, 8] })
  }
  return cols
}

export function getDisplayedTotal(
  perBulan: number[],
  prevCols: PrevTwCol[],
  visibleIdx: number[]
): number {
  const sumPrev = prevCols.reduce(
    (sum, col) => sum + col.indices.reduce((s, bi) => s + (perBulan[bi] || 0), 0),
    0
  )
  const sumVisible = visibleIdx.reduce(
    (sum, bi) => sum + (perBulan[bi] || 0),
    0
  )
  return sumPrev + sumVisible
}

export const getTwValues = (perBulan: number[]) => {
  const tw1 = (perBulan[0] || 0) + (perBulan[1] || 0) + (perBulan[2] || 0)
  const tw2 = (perBulan[3] || 0) + (perBulan[4] || 0) + (perBulan[5] || 0)
  const tw3 = (perBulan[6] || 0) + (perBulan[7] || 0) + (perBulan[8] || 0)
  const tw4 = (perBulan[9] || 0) + (perBulan[10] || 0) + (perBulan[11] || 0)
  const total = tw1 + tw2 + tw3 + tw4
  return { tw1, tw2, tw3, tw4, total }
}

const BULAN_LIST = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
const TRIWULAN_LIST = [
  { value: 1, label: "Triwulan I (Jan - Mar)" },
  { value: 2, label: "Triwulan II (Apr - Jun)" },
  { value: 3, label: "Triwulan III (Jul - Sep)" },
  { value: 4, label: "Triwulan IV (Okt - Des)" },
]
const SEMESTER_LIST = [
  { value: 1, label: "Semester I (Jan - Jun)" },
  { value: 2, label: "Semester II (Jul - Des)" },
]

export default function RealisasiPendapatanClient({
  initialTglAwal,
  initialTglAkhir,
  initialData,
  initialDataRekening,
  initialDataDetail,
  initialDataBulanan,
  initialTahunBulanan,
  initialDataRingkasan,
  isAdmin,
}: Props) {
  const router = useRouter()
  const pdfProgress = usePdfProgress()

  const [tglAwal, setTglAwal] = useState(initialTglAwal)
  const [tglAkhir, setTglAkhir] = useState(initialTglAkhir)

  // State untuk Filter Periode (Bulan, Triwulan, Semester, Tahun)
  const [modePeriode, setModePeriode] = useState<"custom" | "bulan" | "triwulan" | "semester" | "tahun">("custom")
  const [selectedTahun, setSelectedTahun] = useState(new Date().getFullYear())
  const [selectedBulan, setSelectedBulan] = useState(new Date().getMonth() + 1)
  const [selectedTriwulan, setSelectedTriwulan] = useState(Math.ceil((new Date().getMonth() + 1) / 3))
  const [selectedSemester, setSelectedSemester] = useState(new Date().getMonth() < 6 ? 1 : 2)

  const tahunList = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i)

  const applyPeriodDates = (
    mode: "custom" | "bulan" | "triwulan" | "semester" | "tahun",
    thn: number,
    bln: number,
    tw: number,
    sem: number
  ) => {
    if (mode === "custom") return
    if (mode === "bulan") {
      const lastDay = new Date(thn, bln, 0).getDate()
      const mStr = String(bln).padStart(2, "0")
      setTglAwal(`${thn}-${mStr}-01`)
      setTglAkhir(`${thn}-${mStr}-${String(lastDay).padStart(2, "0")}`)
    } else if (mode === "triwulan") {
      if (tw === 1) { setTglAwal(`${thn}-01-01`); setTglAkhir(`${thn}-03-31`) }
      else if (tw === 2) { setTglAwal(`${thn}-04-01`); setTglAkhir(`${thn}-06-30`) }
      else if (tw === 3) { setTglAwal(`${thn}-07-01`); setTglAkhir(`${thn}-09-30`) }
      else { setTglAwal(`${thn}-10-01`); setTglAkhir(`${thn}-12-31`) }
    } else if (mode === "semester") {
      if (sem === 1) { setTglAwal(`${thn}-01-01`); setTglAkhir(`${thn}-06-30`) }
      else { setTglAwal(`${thn}-07-01`); setTglAkhir(`${thn}-12-31`) }
    } else if (mode === "tahun") {
      setTglAwal(`${thn}-01-01`)
      setTglAkhir(`${thn}-12-31`)
    }
  }

  const handleModeChange = (val: string | null) => {
    if (!val) return
    const mode = val as "custom" | "bulan" | "triwulan" | "semester" | "tahun"
    setModePeriode(mode)
    applyPeriodDates(mode, selectedTahun, selectedBulan, selectedTriwulan, selectedSemester)
  }

  const handleTahunChange = (val: string | null) => {
    if (!val) return
    const thn = Number(val)
    setSelectedTahun(thn)
    applyPeriodDates(modePeriode, thn, selectedBulan, selectedTriwulan, selectedSemester)
  }

  const handleBulanChange = (val: string | null) => {
    if (!val) return
    const bln = Number(val)
    setSelectedBulan(bln)
    applyPeriodDates(modePeriode, selectedTahun, bln, selectedTriwulan, selectedSemester)
  }

  const handleTriwulanChange = (val: string | null) => {
    if (!val) return
    const tw = Number(val)
    setSelectedTriwulan(tw)
    applyPeriodDates(modePeriode, selectedTahun, selectedBulan, tw, selectedSemester)
  }

  const handleSemesterChange = (val: string | null) => {
    if (!val) return
    const sem = Number(val)
    setSelectedSemester(sem)
    applyPeriodDates(modePeriode, selectedTahun, selectedBulan, selectedTriwulan, sem)
  }
  
  // Data State
  const [data, setData] = useState<RealisasiPendapatanRow[]>(initialData)
  const [dataRekening, setDataRekening] = useState<RealisasiPendapatanRekeningGroup[]>(initialDataRekening)
  const [dataDetail, setDataDetail] = useState<RealisasiKategoriGroup[]>(initialDataDetail)
  const [dataBulanan, setDataBulanan] = useState<RealisasiPendapatanBulananResult>(initialDataBulanan)
  const [tahunBulanan, setTahunBulanan] = useState(initialTahunBulanan)
  const [checkedBulan, setCheckedBulan] = useState<number[]>([])
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false)
  const [isLoadingBulanan, setIsLoadingBulanan] = useState(false)
  const [showSubTriwulan, setShowSubTriwulan] = useState(false)

  // State Ringkasan
  const [dataRingkasan, setDataRingkasan] = useState<RealisasiPendapatanRingkasanResult>(initialDataRingkasan)
  const [tahunRingkasan, setTahunRingkasan] = useState(initialTahunBulanan)
  const [checkedBulanRingkasan, setCheckedBulanRingkasan] = useState<number[]>([])
  const [isLoadingRingkasan, setIsLoadingRingkasan] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("rekap")

  const handleFilter = async () => {
    setIsLoading(true)
    try {
      const [freshData, freshDataRekening, freshDataDetail] = await Promise.all([
        getRealisasiPendapatan(tglAwal, tglAkhir),
        getRealisasiPendapatanPerRekening(tglAwal, tglAkhir),
        getRealisasiPendapatanDetail(tglAwal, tglAkhir),
      ])
      
      setData(freshData)
      setDataRekening(freshDataRekening)
      setDataDetail(freshDataDetail)
      
      const params = new URLSearchParams()
      params.set("tglAwal", tglAwal)
      params.set("tglAkhir", tglAkhir)
      router.replace(`?${params.toString()}`, { scroll: false })
    } catch (e: any) {
      toast.error("Gagal memuat data", { description: e.message })
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    const now = new Date()
    const tahun = now.getFullYear()
    const bulan = now.getMonth() + 1
    const defAwal = `${tahun}-${String(bulan).padStart(2, "0")}-01`
    const defAkhir = now.toISOString().split("T")[0]
    setTglAwal(defAwal)
    setTglAkhir(defAkhir)
    setModePeriode("custom")
  }

  const handleTahunBulananChange = async (val: string | null) => {
    if (!val) return
    const thn = Number(val)
    setTahunBulanan(thn)
    setIsLoadingBulanan(true)
    try {
      const fresh = await getRealisasiPendapatanBulanan(thn)
      setDataBulanan(fresh)
      const params = new URLSearchParams(window.location.search)
      params.set("tahunBulanan", String(thn))
      router.replace(`?${params.toString()}`, { scroll: false })
    } catch (e: any) {
      toast.error("Gagal memuat data", { description: e.message })
    } finally {
      setIsLoadingBulanan(false)
    }
  }

  const handleTahunRingkasanChange = async (val: string | null) => {
    if (!val) return
    const thn = Number(val)
    setTahunRingkasan(thn)
    setIsLoadingRingkasan(true)
    try {
      const fresh = await getRealisasiPendapatanRingkasan(thn)
      setDataRingkasan(fresh)
    } catch (e: any) {
      toast.error("Gagal memuat data ringkasan", { description: e.message })
    } finally {
      setIsLoadingRingkasan(false)
    }
  }

  const handlePrint = async () => {
    pdfProgress.start()
    try {
      pdfProgress.setPhase("fetch")
      await new Promise(r => setTimeout(r, 200))

      pdfProgress.setPhase("render")
      const blob = await pdf(
        activeTab === "rekap" ? (
          <RealisasiPendapatanPDF 
            tglAwal={tglAwal} 
            tglAkhir={tglAkhir} 
            rows={data} 
          />
        ) : activeTab === "rincian" ? (
          <RealisasiPendapatanRekeningPDF 
            tglAwal={tglAwal} 
            tglAkhir={tglAkhir} 
            groups={dataRekening} 
          />
        ) : activeTab === "bulanan" ? (
          <RealisasiPendapatanBulananPDF
            tahun={dataBulanan.tahun}
            data={dataBulanan}
            checkedBulan={checkedBulan}
          />
        ) : activeTab === "triwulan" ? (
          <RealisasiPendapatanTriwulanPDF
            tahun={dataBulanan.tahun}
            data={dataBulanan}
            showSub={showSubTriwulan}
          />
        ) : activeTab === "ringkasan" ? (
          <RealisasiPendapatanRingkasanPDF
            tahun={dataRingkasan.tahun}
            data={dataRingkasan}
            checkedBulan={checkedBulanRingkasan}
          />
        ) : (
          <RealisasiPendapatanDetailPDF
            tglAwal={tglAwal}
            tglAkhir={tglAkhir}
            groups={dataDetail}
          />
        )
      ).toBlob()

      pdfProgress.setPhase("compile")
      await new Promise(r => setTimeout(r, 300))
      
      pdfProgress.setPhase("done")
      const url = URL.createObjectURL(blob)
      window.open(url, "_blank")
    } catch (err: any) {
      toast.error("Gagal cetak PDF", { description: err.message })
    } finally {
      pdfProgress.stop()
    }
  }

  const totalRekap = data.reduce((acc, row) => acc + row.jumlah, 0)
  const totalRekening = dataRekening.reduce((acc, group) => acc + group.subtotal, 0)

  return (
    <div className="space-y-6">
      <PdfProgressOverlay state={pdfProgress.state} />
      
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Filter Periode</label>
              <Select value={modePeriode} onValueChange={handleModeChange}>
                <SelectTrigger className="w-40 h-9 bg-input/20 border-input text-xs font-medium">
                  <SelectValue placeholder="Pilih Periode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Rentang Tanggal</SelectItem>
                  <SelectItem value="bulan">Bulan</SelectItem>
                  <SelectItem value="triwulan">Triwulan</SelectItem>
                  <SelectItem value="semester">Semester</SelectItem>
                  <SelectItem value="tahun">Tahun</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {modePeriode === "bulan" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Bulan</label>
                <Select value={String(selectedBulan)} onValueChange={handleBulanChange}>
                  <SelectTrigger className="w-36 h-9 bg-input/20 border-input text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BULAN_LIST.map((b, idx) => (
                      <SelectItem key={idx + 1} value={String(idx + 1)}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {modePeriode === "triwulan" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Triwulan</label>
                <Select value={String(selectedTriwulan)} onValueChange={handleTriwulanChange}>
                  <SelectTrigger className="w-48 h-9 bg-input/20 border-input text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIWULAN_LIST.map((tw) => (
                      <SelectItem key={tw.value} value={String(tw.value)}>
                        {tw.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {modePeriode === "semester" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Semester</label>
                <Select value={String(selectedSemester)} onValueChange={handleSemesterChange}>
                  <SelectTrigger className="w-48 h-9 bg-input/20 border-input text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEMESTER_LIST.map((s) => (
                      <SelectItem key={s.value} value={String(s.value)}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {modePeriode !== "custom" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Tahun</label>
                <Select value={String(selectedTahun)} onValueChange={handleTahunChange}>
                  <SelectTrigger className="w-28 h-9 bg-input/20 border-input text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tahunList.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Tanggal Awal</label>
              <Input
                type="date"
                value={tglAwal}
                onChange={(e) => {
                  setTglAwal(e.target.value)
                  setModePeriode("custom")
                }}
                className="h-9 w-36 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Tanggal Akhir</label>
              <Input
                type="date"
                value={tglAkhir}
                onChange={(e) => {
                  setTglAkhir(e.target.value)
                  setModePeriode("custom")
                }}
                className="h-9 w-36 text-xs"
              />
            </div>

            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={handleReset} title="Reset" className="h-9">
                <X className="w-4 h-4" />
              </Button>
              <Button onClick={handleFilter} disabled={isLoading} size="sm" className="h-9">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button onClick={handlePrint} variant="secondary" size="sm" className="h-9">
                <Printer className="w-4 h-4 mr-2" />
                Cetak PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full ${isAdmin ? "grid-cols-6 max-w-[1150px]" : "grid-cols-5 max-w-[980px]"} mb-4`}>
          <TabsTrigger value="rekap" className="flex items-center gap-2">
            <LayoutList className="w-4 h-4" /> Rekapitulasi Akun
          </TabsTrigger>
          <TabsTrigger value="rincian" className="flex items-center gap-2">
            <Landmark className="w-4 h-4" /> Rincian per Rekening
          </TabsTrigger>
          <TabsTrigger value="rincian-detail" className="flex items-center gap-2">
            <ListTree className="w-4 h-4" /> Rincian Lengkap
          </TabsTrigger>
          <TabsTrigger value="bulanan" className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4" /> Laporan Bulanan
          </TabsTrigger>
          <TabsTrigger value="triwulan" className="flex items-center gap-2">
            <PieChart className="w-4 h-4" /> Laporan Triwulan
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="ringkasan" className="flex items-center gap-2">
              <FileBarChart2 className="w-4 h-4" /> Ringkasan
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="rekap">
          <Card>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[50px] text-center">No</TableHead>
                    <TableHead className="w-[150px] text-center">Akun Pendapatan</TableHead>
                    <TableHead>Jenis Pendapatan</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                        Memuat data...
                      </TableCell>
                    </TableRow>
                  ) : data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                        Tidak ada data realisasi pendapatan pada periode ini.
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {data.map((row, i) => (
                        <TableRow key={`${row.akun_pendapatan}-${i}`}>
                          <TableCell className="text-center">{i + 1}</TableCell>
                          <TableCell className="text-center font-medium">{row.akun_pendapatan}</TableCell>
                          <TableCell>{row.nama_jenis}</TableCell>
                          <TableCell className="text-right">{rupiah(row.jumlah)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-semibold">
                        <TableCell colSpan={3} className="text-right">TOTAL PENDAPATAN</TableCell>
                        <TableCell className="text-right text-primary">{rupiah(totalRekap)}</TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="rincian">
          <Card>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[50px] text-center">No</TableHead>
                    <TableHead className="w-[120px] text-center">Akun</TableHead>
                    <TableHead className="min-w-[150px]">Jenis Pendapatan</TableHead>
                    <TableHead className="text-right min-w-[120px]">Jumlah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                        Memuat data...
                      </TableCell>
                    </TableRow>
                  ) : dataRekening.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                        Tidak ada data realisasi pendapatan pada periode ini.
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {dataRekening.map((group, i) => (
                        <Fragment key={`${group.nama_bank}-${group.nomor_rekening}-${i}`}>
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={4} className="font-semibold text-primary">
                              {group.nama_bank} - {group.nomor_rekening} ({group.nama_rekening})
                            </TableCell>
                          </TableRow>
                          {group.items.map((item, j) => (
                            <TableRow key={`${item.akun_pendapatan}-${j}`}>
                              <TableCell className="text-center text-muted-foreground">{j + 1}</TableCell>
                              <TableCell className="text-center font-medium">{item.akun_pendapatan}</TableCell>
                              <TableCell>{item.nama_jenis}</TableCell>
                              <TableCell className="text-right tabular-nums">{rupiah(item.jumlah)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-muted/10 font-semibold">
                            <TableCell colSpan={3} className="text-right text-muted-foreground">
                              Subtotal {group.nama_bank} - {group.nomor_rekening}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{rupiah(group.subtotal)}</TableCell>
                          </TableRow>
                        </Fragment>
                      ))}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell colSpan={3} className="text-right">TOTAL KESELURUHAN PENDAPATAN</TableCell>
                        <TableCell className="text-right text-primary tabular-nums">{rupiah(totalRekening)}</TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="rincian-detail">
          <div className="flex justify-end mb-3">
            <Button onClick={handlePrint} variant="secondary" size="sm" className="h-9">
              <Printer className="w-4 h-4 mr-2" />
              Cetak PDF Rincian Lengkap
            </Button>
          </div>
          <Card>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[50px] text-center">No</TableHead>
                    <TableHead className="w-[120px] text-center">Akun</TableHead>
                    <TableHead>Uraian Pendapatan</TableHead>
                    <TableHead className="text-right min-w-[140px]">Jumlah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                        Memuat data...
                      </TableCell>
                    </TableRow>
                  ) : dataDetail.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                        Tidak ada data realisasi pendapatan pada periode ini.
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {dataDetail.map((kat, ki) => (
                        <Fragment key={`kat-${ki}`}>
                          {/* Baris Kategori */}
                          <TableRow className="bg-slate-800 hover:bg-slate-700">
                            <TableCell className="text-center text-white font-bold">{ki + 1}</TableCell>
                            <TableCell className="text-center text-white font-bold">
                              {kat.kode_kategori === "__tanpa_kategori__" ? "-" : kat.kode_kategori}
                            </TableCell>
                            <TableCell className="text-white font-bold">{kat.nama_kategori}</TableCell>
                            <TableCell className="text-right text-white font-bold tabular-nums">
                              {rupiah(kat.jumlah)}
                            </TableCell>
                          </TableRow>

                          {/* Baris Jenis */}
                          {kat.jenis.map((jen, ji) => (
                            <Fragment key={`jen-${ki}-${ji}`}>
                              <TableRow className={ji % 2 === 0 ? "bg-muted/30" : "bg-background"}>
                                <TableCell className="text-center text-muted-foreground">{ji + 1}</TableCell>
                                <TableCell className="text-center font-semibold">{jen.akun_pendapatan}</TableCell>
                                <TableCell className="pl-8">{jen.nama_jenis}</TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {jen.sub.length === 0 ? rupiah(jen.jumlah) : ""}
                                </TableCell>
                              </TableRow>

                              {/* Baris Sub Pendapatan */}
                              {jen.sub.map((sub, si) => (
                                <TableRow key={`sub-${ki}-${ji}-${si}`} className="bg-background/50">
                                  <TableCell></TableCell>
                                  <TableCell className="text-center text-muted-foreground text-xs">
                                    {sub.kode_sub ?? "-"}
                                  </TableCell>
                                  <TableCell className="pl-14 text-muted-foreground text-sm">
                                    ↳ {sub.nama_sub ?? "-"}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums text-sm">
                                    {rupiah(sub.jumlah)}
                                  </TableCell>
                                </TableRow>
                              ))}

                              {/* Subtotal Jenis jika ada sub */}
                              {jen.sub.length > 0 && (
                                <TableRow className="bg-slate-100 dark:bg-slate-800/40">
                                  <TableCell colSpan={3} className="text-right text-xs text-muted-foreground pr-4">
                                    Subtotal {jen.nama_jenis}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums font-semibold">
                                    {rupiah(jen.jumlah)}
                                  </TableCell>
                                </TableRow>
                              )}
                            </Fragment>
                          ))}

                          {/* Subtotal Kategori */}
                          <TableRow className="bg-slate-200 dark:bg-slate-700/50 font-bold border-t-2">
                            <TableCell colSpan={3} className="text-right text-primary">
                              Subtotal {kat.nama_kategori}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-primary">
                              {rupiah(kat.jumlah)}
                            </TableCell>
                          </TableRow>
                        </Fragment>
                      ))}

                      {/* Grand Total */}
                      <TableRow className="bg-muted/50 font-bold border-t-2">
                        <TableCell colSpan={3} className="text-right">TOTAL KESELURUHAN PENDAPATAN</TableCell>
                        <TableCell className="text-right text-primary tabular-nums">
                          {rupiah(dataDetail.reduce((acc, g) => acc + g.jumlah, 0))}
                        </TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="bulanan">
          {/* ── Filter & Aksi ── */}
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Tahun</label>
              <Select
                value={String(tahunBulanan)}
                onValueChange={handleTahunBulananChange}
                disabled={isLoadingBulanan}
              >
                <SelectTrigger className="w-28 h-9 bg-input/20 border-input text-xs font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Multi-select Bulan dengan Popover + Checkbox */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Bulan</label>
              <Popover>
                <PopoverTrigger
                  disabled={isLoadingBulanan}
                  className="inline-flex h-9 w-52 items-center justify-between rounded-md border border-input bg-input/20 px-3 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                >
                  <span className="truncate">
                    {checkedBulan.length === 0
                      ? "Semua Bulan"
                      : checkedBulan.length === 1
                        ? BULAN_LIST[checkedBulan[0] - 1]
                        : `${checkedBulan.length} Bulan Dipilih`}
                  </span>
                  <svg className="ml-2 h-4 w-4 shrink-0 opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-52 p-1">
                  {/* Tombol Reset */}
                  <button
                    onClick={() => setCheckedBulan([])}
                    className="w-full flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground mb-1"
                  >
                    <span className={`font-medium ${checkedBulan.length === 0 ? "text-primary" : "text-muted-foreground"}`}>
                      Semua Bulan
                    </span>
                    {checkedBulan.length === 0 && (
                      <svg className="ml-auto h-3.5 w-3.5 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>
                    )}
                  </button>
                  <div className="border-t border-border mb-1" />
                  {/* Daftar Bulan dengan Checkbox */}
                  {BULAN_LIST.map((b, i) => {
                    const num = i + 1
                    const checked = checkedBulan.includes(num)
                    return (
                      <label
                        key={num}
                        className="flex items-center gap-2 rounded px-2 py-1.5 text-xs cursor-pointer hover:bg-accent hover:text-accent-foreground select-none"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(isChecked) => {
                            setCheckedBulan((prev) =>
                              isChecked
                                ? [...prev, num].sort((a, z) => a - z)
                                : prev.filter((x) => x !== num)
                            )
                          }}
                        />
                        {b}
                      </label>
                    )
                  })}
                </PopoverContent>
              </Popover>
            </div>

            {/* Shortcut Triwulan */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Triwulan</label>
              <div className="flex items-center gap-1">
                {[
                  { label: "TW I",  bulan: [1,2,3] },
                  { label: "TW II", bulan: [4,5,6] },
                  { label: "TW III",bulan: [7,8,9] },
                  { label: "TW IV", bulan: [10,11,12] },
                ].map(({ label, bulan }) => {
                  const isActive =
                    checkedBulan.length === bulan.length &&
                    bulan.every((b) => checkedBulan.includes(b))
                  return (
                    <button
                      key={label}
                      onClick={() => setCheckedBulan(isActive ? [] : bulan)}
                      disabled={isLoadingBulanan}
                      className={`h-9 px-2 rounded-md border text-xs font-medium transition-colors disabled:opacity-50 ${
                        isActive
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-input/20 border-input hover:bg-accent hover:text-accent-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Button
                onClick={() => setIsTargetModalOpen(true)}
                variant="outline"
                size="sm"
                className="h-9 font-medium"
              >
                <Target className="w-4 h-4 mr-2 text-primary" />
                Set Target
              </Button>
              <Button onClick={handlePrint} variant="secondary" size="sm" className="h-9">
                <Printer className="w-4 h-4 mr-2" />
                Cetak PDF
              </Button>
            </div>
          </div>

          {/* Hitung kolom bulan yang ditampilkan */}
          {(() => {
            const BULAN_SINGKAT = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"]
            // indeks 0-based yang akan ditampilkan (selectedBulan kosong = semua)
            const visibleIdx: number[] = checkedBulan.length === 0
              ? Array.from({ length: 12 }, (_, i) => i)
              : checkedBulan.map((m) => m - 1)
            const prevCols = getPrevTwColumns(checkedBulan)
            const colCount = 3 + prevCols.length + visibleIdx.length + 3 // No + Kode + Nama + [PrevCols] + bulan + Total + Target + %
            return (
          <Card>
            <div className="overflow-x-auto rounded-md border">
              <Table style={{ minWidth: visibleIdx.length === 1 ? "600px" : "900px" }}>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-8 text-center sticky left-0 bg-muted/50 z-10">No</TableHead>
                    <TableHead className="w-20 text-center">Kode MAP</TableHead>
                    <TableHead className="min-w-[200px] sticky left-[calc(2rem+5rem)] bg-muted/50 z-10">Jenis Pendapatan</TableHead>
                    {prevCols.map((col, cIdx) => (
                      <TableHead key={`prev-col-h-${cIdx}`} className="text-right min-w-[100px] font-semibold text-primary bg-primary/10">
                        {col.label}
                      </TableHead>
                    ))}
                    {visibleIdx.map((bi) => (
                      <TableHead key={bi} className="text-right min-w-[90px] text-xs">{BULAN_SINGKAT[bi]}</TableHead>
                    ))}
                    <TableHead className="text-right min-w-[100px] font-semibold">Total</TableHead>
                    <TableHead className="text-right min-w-[100px]">Target</TableHead>
                    <TableHead className="text-right min-w-[90px]">Persentase</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingBulanan ? (
                    <TableRow>
                      <TableCell colSpan={colCount} className="text-center h-24 text-muted-foreground">Memuat data...</TableCell>
                    </TableRow>
                  ) : dataBulanan.kategori.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={colCount} className="text-center h-24 text-muted-foreground">Tidak ada data untuk tahun {tahunBulanan}.</TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {dataBulanan.kategori.map((kat, ki) => (
                        <Fragment key={`kat-${ki}`}>
                          {/* Baris Header Kategori */}
                          <TableRow className="bg-slate-800 hover:bg-slate-700">
                            <TableCell className="text-center text-white font-bold text-sm sticky left-0 bg-slate-800">{kat.nomorRomawi}</TableCell>
                            <TableCell className="text-white font-bold text-sm"></TableCell>
                            <TableCell className="text-white font-bold text-sm sticky left-[calc(2rem+5rem)] bg-slate-800">{kat.nama_kategori}</TableCell>
                            {prevCols.map((col, cIdx) => (
                              <TableCell key={`kat-prev-${cIdx}`} className="text-right text-white font-bold tabular-nums text-xs bg-slate-800">
                                {(() => {
                                  const sumPrev = col.indices.reduce((s, bi) => s + (kat.perBulan[bi] || 0), 0)
                                  return sumPrev > 0 ? rupiahAngka(sumPrev) : "-"
                                })()}
                              </TableCell>
                            ))}
                            {visibleIdx.map((bi) => (
                              <TableCell key={bi} className="text-right text-white font-bold tabular-nums text-xs">
                                {kat.perBulan[bi] > 0 ? rupiahAngka(kat.perBulan[bi]) : "-"}
                              </TableCell>
                            ))}
                            <TableCell className="text-right text-white font-bold tabular-nums">
                              {rupiahAngka(getDisplayedTotal(kat.perBulan, prevCols, visibleIdx))}
                            </TableCell>
                            <TableCell className="text-right text-white/60 text-xs">-</TableCell>
                            <TableCell className="text-right text-white/60 text-xs">-</TableCell>
                          </TableRow>

                          {/* Baris Jenis */}
                          {kat.jenis.map((jen, ji) => (
                            <Fragment key={`jen-${ki}-${ji}`}>
                              <TableRow className={ji % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                                <TableCell className="text-center text-muted-foreground text-xs sticky left-0 bg-inherit">{ji + 1}</TableCell>
                                <TableCell className="text-center font-medium text-xs">{jen.akun_pendapatan}</TableCell>
                                <TableCell className="text-sm sticky left-[calc(2rem+5rem)] bg-inherit pl-4">{jen.nama_jenis}</TableCell>
                                {prevCols.map((col, cIdx) => (
                                  <TableCell key={`jen-prev-${cIdx}`} className="text-right tabular-nums font-semibold text-xs bg-primary/5">
                                    {(() => {
                                      const sumPrev = col.indices.reduce((s, bi) => s + (jen.perBulan[bi] || 0), 0)
                                      return sumPrev > 0 ? rupiahAngka(sumPrev) : "-"
                                    })()}
                                  </TableCell>
                                ))}
                                {visibleIdx.map((bi) => (
                                  <TableCell key={bi} className="text-right tabular-nums text-xs">
                                    {jen.perBulan[bi] > 0 ? rupiahAngka(jen.perBulan[bi]) : "-"}
                                  </TableCell>
                                ))}
                                {(() => {
                                  const totalDisplay = getDisplayedTotal(jen.perBulan, prevCols, visibleIdx)
                                  const pctDisplay = jen.target > 0 ? Math.round((totalDisplay / jen.target) * 10000) / 100 : 0
                                  return (
                                    <>
                                      <TableCell className="text-right tabular-nums font-semibold text-sm">
                                        {rupiahAngka(totalDisplay)}
                                      </TableCell>
                                      <TableCell className="text-right tabular-nums text-muted-foreground text-xs">
                                        {jen.target > 0 ? rupiahAngka(jen.target) : "-"}
                                      </TableCell>
                                      <TableCell className={`text-right text-xs font-medium ${
                                        pctDisplay >= 100 ? "text-green-600 dark:text-green-400" :
                                        pctDisplay >= 75 ? "text-yellow-600 dark:text-yellow-400" :
                                        pctDisplay > 0 ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"
                                      }`}>
                                        {jen.target > 0 ? `${pctDisplay.toFixed(2)}%` : "-"}
                                      </TableCell>
                                    </>
                                  )
                                })()}
                              </TableRow>

                              {/* Baris Sub */}
                              {jen.sub.map((sub, si) => (
                                <TableRow key={`sub-${ki}-${ji}-${si}`} className="bg-background/50">
                                  <TableCell className="sticky left-0 bg-inherit"></TableCell>
                                  <TableCell className="text-center text-muted-foreground text-xs">{sub.kode_sub ?? "-"}</TableCell>
                                  <TableCell className="pl-10 text-muted-foreground text-xs sticky left-[calc(2rem+5rem)] bg-inherit">
                                    ↳ {sub.nama_sub ?? "-"}
                                  </TableCell>
                                  {prevCols.map((col, cIdx) => (
                                    <TableCell key={`sub-prev-${cIdx}`} className="text-right tabular-nums text-xs text-muted-foreground bg-primary/5">
                                      {(() => {
                                        const sumPrev = col.indices.reduce((s, bi) => s + (sub.perBulan[bi] || 0), 0)
                                        return sumPrev > 0 ? rupiahAngka(sumPrev) : "-"
                                      })()}
                                    </TableCell>
                                  ))}
                                  {visibleIdx.map((bi) => (
                                    <TableCell key={bi} className="text-right tabular-nums text-xs text-muted-foreground">
                                      {sub.perBulan[bi] > 0 ? rupiahAngka(sub.perBulan[bi]) : "-"}
                                    </TableCell>
                                  ))}
                                  <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                                    {rupiahAngka(getDisplayedTotal(sub.perBulan, prevCols, visibleIdx))}
                                  </TableCell>
                                  <TableCell></TableCell>
                                  <TableCell></TableCell>
                                </TableRow>
                              ))}
                            </Fragment>
                          ))}
                        </Fragment>
                      ))}

                      {/* Grand Total */}
                      <TableRow className="bg-muted/50 font-bold border-t-2">
                        <TableCell colSpan={3} className="text-right sticky left-0 bg-muted/50">TOTAL</TableCell>
                        {prevCols.map((col, cIdx) => (
                          <TableCell key={`gt-prev-${cIdx}`} className="text-right tabular-nums font-bold text-xs text-primary bg-primary/10">
                            {(() => {
                              const sumPrev = col.indices.reduce((s, bi) => s + (dataBulanan.grandPerBulan[bi] || 0), 0)
                              return sumPrev > 0 ? rupiahAngka(sumPrev) : "-"
                            })()}
                          </TableCell>
                        ))}
                        {visibleIdx.map((bi) => (
                          <TableCell key={bi} className="text-right tabular-nums font-bold text-xs">
                            {dataBulanan.grandPerBulan[bi] > 0 ? rupiahAngka(dataBulanan.grandPerBulan[bi]) : "-"}
                          </TableCell>
                        ))}
                        {(() => {
                          const grandTotalDisplay = getDisplayedTotal(dataBulanan.grandPerBulan, prevCols, visibleIdx)
                          const grandPctDisplay = dataBulanan.grandTarget > 0 ? (grandTotalDisplay / dataBulanan.grandTarget) * 100 : 0
                          return (
                            <>
                              <TableCell className="text-right tabular-nums text-primary">
                                {rupiahAngka(grandTotalDisplay)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-muted-foreground text-xs">
                                {dataBulanan.grandTarget > 0 ? rupiahAngka(dataBulanan.grandTarget) : "-"}
                              </TableCell>
                              <TableCell className="text-right text-xs font-bold">
                                {dataBulanan.grandTarget > 0 ? `${grandPctDisplay.toFixed(2)}%` : "-"}
                              </TableCell>
                            </>
                          )
                        })()}
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
            )
          })()} 
        </TabsContent>

        {/* ── Tab Laporan Triwulan (Semua Triwulan 1 s/d 4) ── */}
        <TabsContent value="triwulan">
          {/* Toolbar Filter & Aksi */}
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Tahun</label>
              <Select
                value={String(tahunBulanan)}
                onValueChange={handleTahunBulananChange}
                disabled={isLoadingBulanan}
              >
                <SelectTrigger className="w-28 h-9 bg-input/20 border-input text-xs font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none border border-input bg-input/20 h-9 px-3 rounded-md hover:bg-accent hover:text-accent-foreground">
              <Checkbox
                checked={showSubTriwulan}
                onCheckedChange={(checked) => setShowSubTriwulan(!!checked)}
              />
              <span>Tampilkan Sub Jenis</span>
            </label>

            <div className="ml-auto flex items-center gap-2">
              <Button
                onClick={() => setIsTargetModalOpen(true)}
                variant="outline"
                size="sm"
                className="h-9 font-medium"
              >
                <Target className="w-4 h-4 mr-2 text-primary" />
                Set Target
              </Button>
              <Button onClick={handlePrint} variant="secondary" size="sm" className="h-9">
                <Printer className="w-4 h-4 mr-2" />
                Cetak PDF
              </Button>
            </div>
          </div>

          {/* Tabel Triwulan */}
          <Card>
            <div className="overflow-x-auto rounded-md border">
              <Table style={{ minWidth: "900px" }}>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-8 text-center sticky left-0 bg-muted/50 z-10">No</TableHead>
                    <TableHead className="w-20 text-center">Kode MAP</TableHead>
                    <TableHead className="min-w-[200px] sticky left-[calc(2rem+5rem)] bg-muted/50 z-10">Jenis Pendapatan</TableHead>
                    <TableHead className="text-right min-w-[110px] font-semibold">Triwulan I</TableHead>
                    <TableHead className="text-right min-w-[110px] font-semibold">Triwulan II</TableHead>
                    <TableHead className="text-right min-w-[110px] font-semibold">Triwulan III</TableHead>
                    <TableHead className="text-right min-w-[110px] font-semibold">Triwulan IV</TableHead>
                    <TableHead className="text-right min-w-[120px] font-semibold">Total Realisasi</TableHead>
                    <TableHead className="text-right min-w-[110px]">Target</TableHead>
                    <TableHead className="text-right min-w-[90px]">Persentase</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingBulanan ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center h-24 text-muted-foreground">Memuat data...</TableCell>
                    </TableRow>
                  ) : dataBulanan.kategori.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center h-24 text-muted-foreground">Tidak ada data untuk tahun {tahunBulanan}.</TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {dataBulanan.kategori.map((kat, ki) => {
                        const katTw = getTwValues(kat.perBulan)

                        return (
                          <Fragment key={`kat-tw-${ki}`}>
                            {/* Header Kategori */}
                            <TableRow className="bg-slate-800 hover:bg-slate-700">
                              <TableCell className="text-center text-white font-bold text-sm sticky left-0 bg-slate-800">{kat.nomorRomawi}</TableCell>
                              <TableCell className="text-white font-bold text-sm"></TableCell>
                              <TableCell className="text-white font-bold text-sm sticky left-[calc(2rem+5rem)] bg-slate-800">{kat.nama_kategori}</TableCell>
                              <TableCell className="text-right text-white font-bold tabular-nums text-xs">
                                {katTw.tw1 > 0 ? rupiahAngka(katTw.tw1) : "-"}
                              </TableCell>
                              <TableCell className="text-right text-white font-bold tabular-nums text-xs">
                                {katTw.tw2 > 0 ? rupiahAngka(katTw.tw2) : "-"}
                              </TableCell>
                              <TableCell className="text-right text-white font-bold tabular-nums text-xs">
                                {katTw.tw3 > 0 ? rupiahAngka(katTw.tw3) : "-"}
                              </TableCell>
                              <TableCell className="text-right text-white font-bold tabular-nums text-xs">
                                {katTw.tw4 > 0 ? rupiahAngka(katTw.tw4) : "-"}
                              </TableCell>
                              <TableCell className="text-right text-white font-bold tabular-nums">
                                {rupiahAngka(katTw.total)}
                              </TableCell>
                              <TableCell className="text-right text-white/60 text-xs">-</TableCell>
                              <TableCell className="text-right text-white/60 text-xs">-</TableCell>
                            </TableRow>

                            {/* Baris Jenis */}
                            {kat.jenis.map((jen, ji) => {
                              const jenTw = getTwValues(jen.perBulan)
                              const pctDisplay = jen.target > 0 ? Math.round((jenTw.total / jen.target) * 10000) / 100 : 0

                              return (
                                <Fragment key={`jen-tw-${ki}-${ji}`}>
                                  <TableRow className={ji % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                                    <TableCell className="text-center text-muted-foreground text-xs sticky left-0 bg-inherit">{ji + 1}</TableCell>
                                    <TableCell className="text-center font-medium text-xs">{jen.akun_pendapatan}</TableCell>
                                    <TableCell className="text-sm sticky left-[calc(2rem+5rem)] bg-inherit pl-4">{jen.nama_jenis}</TableCell>
                                    <TableCell className="text-right tabular-nums text-xs font-medium">
                                      {jenTw.tw1 > 0 ? rupiahAngka(jenTw.tw1) : "-"}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums text-xs font-medium">
                                      {jenTw.tw2 > 0 ? rupiahAngka(jenTw.tw2) : "-"}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums text-xs font-medium">
                                      {jenTw.tw3 > 0 ? rupiahAngka(jenTw.tw3) : "-"}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums text-xs font-medium">
                                      {jenTw.tw4 > 0 ? rupiahAngka(jenTw.tw4) : "-"}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums font-semibold text-sm">
                                      {rupiahAngka(jenTw.total)}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums text-muted-foreground text-xs">
                                      {jen.target > 0 ? rupiahAngka(jen.target) : "-"}
                                    </TableCell>
                                    <TableCell className={`text-right text-xs font-medium ${
                                      pctDisplay >= 100 ? "text-green-600 dark:text-green-400" :
                                      pctDisplay >= 75 ? "text-yellow-600 dark:text-yellow-400" :
                                      pctDisplay > 0 ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"
                                    }`}>
                                      {jen.target > 0 ? `${pctDisplay.toFixed(2)}%` : "-"}
                                    </TableCell>
                                  </TableRow>

                                  {/* Baris Sub (hanya jika showSubTriwulan aktif) */}
                                  {showSubTriwulan && jen.sub.map((sub, si) => {
                                    const subTw = getTwValues(sub.perBulan)
                                    return (
                                      <TableRow key={`sub-tw-${ki}-${ji}-${si}`} className="bg-background/50">
                                        <TableCell className="sticky left-0 bg-inherit"></TableCell>
                                        <TableCell className="text-center text-muted-foreground text-xs">{sub.kode_sub ?? "-"}</TableCell>
                                        <TableCell className="pl-10 text-muted-foreground text-xs sticky left-[calc(2rem+5rem)] bg-inherit">
                                          ↳ {sub.nama_sub ?? "-"}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                                          {subTw.tw1 > 0 ? rupiahAngka(subTw.tw1) : "-"}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                                          {subTw.tw2 > 0 ? rupiahAngka(subTw.tw2) : "-"}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                                          {subTw.tw3 > 0 ? rupiahAngka(subTw.tw3) : "-"}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                                          {subTw.tw4 > 0 ? rupiahAngka(subTw.tw4) : "-"}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                                          {rupiahAngka(subTw.total)}
                                        </TableCell>
                                        <TableCell></TableCell>
                                        <TableCell></TableCell>
                                      </TableRow>
                                    )
                                  })}
                                </Fragment>
                              )
                            })}
                          </Fragment>
                        )
                      })}

                      {/* Grand Total */}
                      {(() => {
                        const grandTw = getTwValues(dataBulanan.grandPerBulan)
                        const grandPctDisplay = dataBulanan.grandTarget > 0 ? (grandTw.total / dataBulanan.grandTarget) * 100 : 0

                        return (
                          <TableRow className="bg-muted/50 font-bold border-t-2">
                            <TableCell colSpan={3} className="text-right sticky left-0 bg-muted/50">TOTAL</TableCell>
                            <TableCell className="text-right tabular-nums font-bold text-xs text-primary">
                              {grandTw.tw1 > 0 ? rupiahAngka(grandTw.tw1) : "-"}
                            </TableCell>
                            <TableCell className="text-right tabular-nums font-bold text-xs text-primary">
                              {grandTw.tw2 > 0 ? rupiahAngka(grandTw.tw2) : "-"}
                            </TableCell>
                            <TableCell className="text-right tabular-nums font-bold text-xs text-primary">
                              {grandTw.tw3 > 0 ? rupiahAngka(grandTw.tw3) : "-"}
                            </TableCell>
                            <TableCell className="text-right tabular-nums font-bold text-xs text-primary">
                              {grandTw.tw4 > 0 ? rupiahAngka(grandTw.tw4) : "-"}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-primary">
                              {rupiahAngka(grandTw.total)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground text-xs">
                              {dataBulanan.grandTarget > 0 ? rupiahAngka(dataBulanan.grandTarget) : "-"}
                            </TableCell>
                            <TableCell className="text-right text-xs font-bold">
                              {dataBulanan.grandTarget > 0 ? `${grandPctDisplay.toFixed(2)}%` : "-"}
                            </TableCell>
                          </TableRow>
                        )
                      })()}
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ── Tab Ringkasan (Admin Only) ── */}
        {isAdmin && (
          <TabsContent value="ringkasan">
            {(() => {
              const visibleIdx: number[] =
                checkedBulanRingkasan.length === 0
                  ? Array.from({ length: 12 }, (_, i) => i)
                  : checkedBulanRingkasan.map((b) => b - 1).sort((a, z) => a - z)

              const prevCols = getPrevTwColumns(checkedBulanRingkasan)
              const colCount = 4 + prevCols.length + visibleIdx.length

              return (
                <Card>
                  {/* Toolbar */}
                  <div className="flex flex-wrap items-end gap-3 p-4 border-b">
                    {/* Tahun */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Tahun</label>
                      <Select
                        value={String(tahunRingkasan)}
                        onValueChange={handleTahunRingkasanChange}
                        disabled={isLoadingRingkasan}
                      >
                        <SelectTrigger className="w-28 h-9 bg-input/20 border-input text-xs font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Multi-select Bulan */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Bulan</label>
                      <Popover>
                        <PopoverTrigger
                          disabled={isLoadingRingkasan}
                          className="inline-flex h-9 w-52 items-center justify-between rounded-md border border-input bg-input/20 px-3 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                        >
                          <span className="truncate">
                            {checkedBulanRingkasan.length === 0
                              ? "Semua Bulan"
                              : checkedBulanRingkasan.length === 1
                                ? BULAN_LIST[checkedBulanRingkasan[0] - 1]
                                : `${checkedBulanRingkasan.length} Bulan Dipilih`}
                          </span>
                          <svg className="ml-2 h-4 w-4 shrink-0 opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-52 p-1">
                          <button
                            onClick={() => setCheckedBulanRingkasan([])}
                            className="w-full flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground mb-1"
                          >
                            <span className={`font-medium ${checkedBulanRingkasan.length === 0 ? "text-primary" : "text-muted-foreground"}`}>Semua Bulan</span>
                            {checkedBulanRingkasan.length === 0 && (
                              <svg className="ml-auto h-3.5 w-3.5 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>
                            )}
                          </button>
                          <div className="border-t border-border mb-1" />
                          {BULAN_LIST.map((b, i) => {
                            const num = i + 1
                            const checked = checkedBulanRingkasan.includes(num)
                            return (
                              <label key={num} className="flex items-center gap-2 rounded px-2 py-1.5 text-xs cursor-pointer hover:bg-accent hover:text-accent-foreground select-none">
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(isChecked) => {
                                    setCheckedBulanRingkasan((prev) =>
                                      isChecked ? [...prev, num].sort((a, z) => a - z) : prev.filter((x) => x !== num)
                                    )
                                  }}
                                />
                                {b}
                              </label>
                            )
                          })}
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Shortcut Triwulan */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Triwulan</label>
                      <div className="flex items-center gap-1">
                        {[
                          { label: "TW I",   bulan: [1,2,3] },
                          { label: "TW II",  bulan: [4,5,6] },
                          { label: "TW III", bulan: [7,8,9] },
                          { label: "TW IV",  bulan: [10,11,12] },
                        ].map(({ label, bulan }) => {
                          const isActive =
                            checkedBulanRingkasan.length === bulan.length &&
                            bulan.every((b) => checkedBulanRingkasan.includes(b))
                          return (
                            <button
                              key={label}
                              onClick={() => setCheckedBulanRingkasan(isActive ? [] : bulan)}
                              disabled={isLoadingRingkasan}
                              className={`h-9 px-2 rounded-md border text-xs font-medium transition-colors disabled:opacity-50 ${
                                isActive
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-input/20 border-input hover:bg-accent hover:text-accent-foreground"
                              }`}
                            >
                              {label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                      <Button
                        onClick={() => setIsTargetModalOpen(true)}
                        variant="outline"
                        size="sm"
                        className="h-9 font-medium"
                      >
                        <Target className="w-4 h-4 mr-2 text-primary" />
                        Set Target
                      </Button>
                      <Button onClick={handlePrint} variant="secondary" size="sm" className="h-9">
                        <Printer className="w-4 h-4 mr-2" />
                        Cetak PDF
                      </Button>
                    </div>
                  </div>

                  {/* Tabel Ringkasan */}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-8 text-center sticky left-0 bg-muted/50 z-10">No</TableHead>
                          <TableHead className="w-20 text-center">Kode MAP</TableHead>
                          <TableHead className="min-w-[200px] sticky left-[calc(2rem+5rem)] bg-muted/50 z-10">Jenis Pendapatan</TableHead>
                          {prevCols.map((col, cIdx) => (
                            <TableHead key={`r-prev-h-${cIdx}`} className="text-right min-w-[100px] font-semibold text-primary bg-primary/10">
                              {col.label}
                            </TableHead>
                          ))}
                          {visibleIdx.map((bi) => (
                            <TableHead key={bi} className="text-right min-w-[90px] text-xs">{BULAN_LIST[bi].slice(0,3).toUpperCase()}</TableHead>
                          ))}
                          <TableHead className="text-right min-w-[100px] font-semibold">Total</TableHead>
                          <TableHead className="text-right min-w-[100px]">Target</TableHead>
                          <TableHead className="text-right min-w-[90px]">Persentase</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoadingRingkasan ? (
                          <TableRow>
                            <TableCell colSpan={colCount} className="text-center h-24 text-muted-foreground">Memuat data...</TableCell>
                          </TableRow>
                        ) : dataRingkasan.kategori.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={colCount} className="text-center h-24 text-muted-foreground">Tidak ada data penerimaan untuk tahun {tahunRingkasan}</TableCell>
                          </TableRow>
                        ) : (
                          <>
                            {dataRingkasan.kategori.map((kat, ki) => {
                              const katTotalDisplay = getDisplayedTotal(kat.perBulan, prevCols, visibleIdx)
                              let noJenis = 0

                              return (
                                <Fragment key={`kat-${ki}`}>
                                  {/* Baris Kategori */}
                                  <TableRow className="bg-primary/10 font-semibold">
                                    <TableCell className="text-center sticky left-0 bg-primary/10 z-10 text-xs">{kat.nomorRomawi}</TableCell>
                                    <TableCell />
                                    <TableCell className="sticky left-[calc(2rem+5rem)] bg-primary/10 z-10 font-bold text-sm">{kat.nama_kategori}</TableCell>
                                    {prevCols.map((col, cIdx) => (
                                      <TableCell key={`r-kat-prev-${cIdx}`} className="text-right tabular-nums text-xs font-bold bg-primary/10 text-primary">
                                        {(() => {
                                          const sumPrev = col.indices.reduce((s, bi) => s + (kat.perBulan[bi] || 0), 0)
                                          return sumPrev > 0 ? rupiahAngka(sumPrev) : "-"
                                        })()}
                                      </TableCell>
                                    ))}
                                    {visibleIdx.map((bi) => (
                                      <TableCell key={bi} className="text-right tabular-nums text-xs font-semibold">
                                        {kat.perBulan[bi] > 0 ? rupiahAngka(kat.perBulan[bi]) : "-"}
                                      </TableCell>
                                    ))}
                                    <TableCell className="text-right tabular-nums font-bold text-primary">
                                      {rupiahAngka(katTotalDisplay)}
                                    </TableCell>
                                    <TableCell />
                                    <TableCell />
                                  </TableRow>

                                  {/* Baris Jenis Pendapatan */}
                                  {kat.jenis.map((j, ji) => {
                                    noJenis++
                                    const jenisTotalDisplay = getDisplayedTotal(j.perBulan, prevCols, visibleIdx)
                                    const jenisPctDisplay = j.target > 0 ? (jenisTotalDisplay / j.target) * 100 : 0
                                    return (
                                      <TableRow key={`jenis-${ki}-${ji}`} className={ji % 2 === 1 ? "bg-muted/20" : ""}>
                                        <TableCell className="text-center text-xs text-muted-foreground sticky left-0 z-10 bg-background">
                                          {noJenis}
                                        </TableCell>
                                        <TableCell className="text-center text-xs font-mono font-semibold">
                                          {j.akun_pendapatan}
                                        </TableCell>
                                        <TableCell className="text-xs pl-6 sticky left-[calc(2rem+5rem)] z-10 bg-background">
                                          {j.nama_jenis}
                                        </TableCell>
                                        {prevCols.map((col, cIdx) => (
                                          <TableCell key={`r-jen-prev-${cIdx}`} className="text-right tabular-nums font-semibold text-xs bg-primary/5">
                                            {(() => {
                                              const sumPrev = col.indices.reduce((s, bi) => s + (j.perBulan[bi] || 0), 0)
                                              return sumPrev > 0 ? rupiahAngka(sumPrev) : "-"
                                            })()}
                                          </TableCell>
                                        ))}
                                        {visibleIdx.map((bi) => (
                                          <TableCell key={bi} className="text-right tabular-nums text-xs">
                                            {j.perBulan[bi] > 0 ? rupiahAngka(j.perBulan[bi]) : "-"}
                                          </TableCell>
                                        ))}
                                        <TableCell className="text-right tabular-nums font-semibold text-xs">
                                          {jenisTotalDisplay > 0 ? rupiahAngka(jenisTotalDisplay) : "-"}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums text-muted-foreground text-xs">
                                          {j.target > 0 ? rupiahAngka(j.target) : "-"}
                                        </TableCell>
                                        <TableCell className="text-right text-xs font-medium">
                                          {j.target > 0 ? `${jenisPctDisplay.toFixed(2)}%` : "-"}
                                        </TableCell>
                                      </TableRow>
                                    )
                                  })}
                                </Fragment>
                              )
                            })}

                            {/* Grand Total */}
                            <TableRow className="bg-muted/50 font-bold border-t-2">
                              <TableCell colSpan={3} className="text-right sticky left-0 bg-muted/50">TOTAL</TableCell>
                              {prevCols.map((col, cIdx) => (
                                <TableCell key={`r-gt-prev-${cIdx}`} className="text-right tabular-nums font-bold text-xs text-primary bg-primary/10">
                                  {(() => {
                                    const sumPrev = col.indices.reduce((s, bi) => s + (dataRingkasan.grandPerBulan[bi] || 0), 0)
                                    return sumPrev > 0 ? rupiahAngka(sumPrev) : "-"
                                  })()}
                                </TableCell>
                              ))}
                              {visibleIdx.map((bi) => (
                                <TableCell key={bi} className="text-right tabular-nums font-bold text-xs">
                                  {dataRingkasan.grandPerBulan[bi] > 0 ? rupiahAngka(dataRingkasan.grandPerBulan[bi]) : "-"}
                                </TableCell>
                              ))}
                              {(() => {
                                const grandTotalDisplay = getDisplayedTotal(dataRingkasan.grandPerBulan, prevCols, visibleIdx)
                                const grandPctDisplay = dataRingkasan.grandTarget > 0 ? (grandTotalDisplay / dataRingkasan.grandTarget) * 100 : 0
                                return (
                                  <>
                                    <TableCell className="text-right tabular-nums text-primary">
                                      {rupiahAngka(grandTotalDisplay)}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums text-muted-foreground text-xs">
                                      {dataRingkasan.grandTarget > 0 ? rupiahAngka(dataRingkasan.grandTarget) : "-"}
                                    </TableCell>
                                    <TableCell className="text-right text-xs font-bold">
                                      {dataRingkasan.grandTarget > 0 ? `${grandPctDisplay.toFixed(2)}%` : "-"}
                                    </TableCell>
                                  </>
                                )
                              })()}
                            </TableRow>
                          </>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              )
            })()}
          </TabsContent>
        )}
      </Tabs>

      {/* Modal Input Target Pendapatan */}
      <TargetPendapatanModal
        tahun={activeTab === "ringkasan" ? tahunRingkasan : tahunBulanan}
        open={isTargetModalOpen}
        onOpenChange={setIsTargetModalOpen}
        onSuccess={async () => {
          const targetYear = activeTab === "ringkasan" ? tahunRingkasan : tahunBulanan
          await Promise.all([
            handleTahunBulananChange(String(targetYear)),
            isAdmin ? handleTahunRingkasanChange(String(targetYear)) : Promise.resolve(),
          ])
        }}
      />
    </div>
  )
}
