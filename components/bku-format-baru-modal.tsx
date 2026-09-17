"use client"

import { useEffect, useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  FileText,
  Sparkles,
  Download,
  Loader2,
  Layers,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  GripVertical,
  TableProperties,
  AlertTriangle,
  Info,
} from "lucide-react"
import { toast } from "sonner"
import {
  getBukuKasUmumFormatBaru,
  type BukuKasFormatBaruResult,
} from "@/app/actions/laporan-bku-format-baru"
import type { CustomMetadata, IdentitasItem } from "@/components/pdf/buku-kas-umum-format-baru-pdf"

type BkuFormatBaruModalProps = {
  filter: {
    tglAwal: string
    tglAkhir: string
    rekeningId?: string
    unitId?: string
  }
  disabled?: boolean
  /** Render the configuration form only (used by the dedicated settings route). */
  settingsOnly?: boolean
  openInitially?: boolean
}

const getPeriodeDefaultKet = (tglAwal?: string, tglAkhir?: string, tahun = new Date().getFullYear()) => {
  if (!tglAwal || !tglAkhir) return `Tahun ${tahun}`
  const namaBulan = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ]
  const [y1, m1] = tglAwal.split("-").map(Number)
  const [y2, m2] = tglAkhir.split("-").map(Number)
  if (y1 === y2 && m1 === m2 && m1 >= 1 && m1 <= 12) {
    return `Bulan ${namaBulan[m1 - 1]} ${y1}`
  }
  return `Periode ${tglAwal} s.d. ${tglAkhir}`
}

// Baris identitas default (tanpa revisi ke-1/2/3)
const buildDefaultIdentitas = (spDipa: string, tahun: number, periodeKet = `Tahun ${tahun}`): IdentitasItem[] => [
  { no: "01", komp: "Kementerian / Lembaga",    ket: "(025) AGAMA RI" },
  { no: "02", komp: "Unit Organisasi",           ket: "DIREKTORAT JENDERAL PENDIDIKAN ISLAM" },
  { no: "03", komp: "Provinsi / Kab. / Kota",   ket: "SULAWESI SELATAN / KOTA PALOPO" },
  { no: "04", komp: "Satuan Kerja",              ket: "UNIVERSITAS ISLAM NEGERI PALOPO" },
  { no: "05", komp: "Tanggal / Nomor SP DIPA",  ket: spDipa },
  { no: "06", komp: "KPPN",                     ket: "KPPN PALOPO" },
  { no: "07", komp: "Tahun Anggaran",            ket: String(tahun) },
  { no: "08", komp: "Periode Pembukuan",         ket: periodeKet },
]

const endOfMonth = (dateValue: string) => {
  if (!dateValue) return ""
  const [year, month] = dateValue.split("-").map(Number)
  if (!year || !month) return dateValue
  return `${year}-${String(month).padStart(2, "0")}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`
}

export function BkuFormatBaruModal({ filter, disabled, settingsOnly = false, openInitially = false }: BkuFormatBaruModalProps) {
  const [open, setOpen] = useState(openInitially)
  const [showConfirmFilter, setShowConfirmFilter] = useState(false)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<string | null>(null)
  const [showOptions, setShowOptions] = useState(false)
  const [showIdentitas, setShowIdentitas] = useState(false)

  const isFiltered = Boolean(
    (filter.rekeningId && filter.rekeningId !== "__all__") ||
    (filter.unitId && filter.unitId !== "__all__")
  )

  const tahunNow = filter.tglAwal ? parseInt(filter.tglAwal.split("-")[0], 10) : new Date().getFullYear()
  const defaultSpDipa = `[DIISI SESUAI DIPA UIN PALOPO TAHUN ${tahunNow}]`

  // Form state
  const [metadata, setMetadata] = useState<CustomMetadata>({
    tglPemeriksaan: endOfMonth(filter.tglAkhir),
    namaKpa: "[NAMA KUASA PENGGUNA ANGGARAN]",
    nipKpa: "",
    jabatanKpa: "Rektor / Kuasa Pengguna Anggaran UIN Palopo / Atasan Langsung Bendahara Penerimaan UIN Palopo",
    namaBendahara: "SUVRI ABDILLAH, S.SOS",
    nipBendahara: "",
    jabatanBendahara: "Bendahara Penerimaan UIN Palopo",
    nomorSpDipa: defaultSpDipa,
    uangKertas: "",
    spmu: "",
    saldoBankKas: "",
    suratBerharga: "",
  })

  // Format mode state: Konsolidasi default ringkasan, Pembantu default detail
  const [modeBkuKonsolidasi, setModeBkuKonsolidasi] = useState<"ringkasan" | "detail">("ringkasan")
  const [modeBkuPembantu, setModeBkuPembantu] = useState<"detail" | "ringkasan">("detail")

  // State identitas terpisah agar lebih mudah dikelola
  const [identitasItems, setIdentitasItems] = useState<IdentitasItem[]>(() =>
    buildDefaultIdentitas(
      defaultSpDipa,
      tahunNow,
      getPeriodeDefaultKet(filter.tglAwal, filter.tglAkhir, tahunNow)
    )
  )
  const settingsHydrated = useRef(false)

  // Pengaturan dibagi dari dialog cetak, tetapi tetap dipakai ketika PDF dibuat.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("bku-format-baru-settings")
      if (!saved) return
      const parsed = JSON.parse(saved) as Partial<{
        metadata: CustomMetadata
        identitasItems: IdentitasItem[]
        modeBkuKonsolidasi: "ringkasan" | "detail"
        modeBkuPembantu: "detail" | "ringkasan"
      }>
      if (parsed.metadata) setMetadata((prev) => ({ ...prev, ...parsed.metadata }))
      if (Array.isArray(parsed.identitasItems)) setIdentitasItems(parsed.identitasItems)
      if (parsed.modeBkuKonsolidasi) setModeBkuKonsolidasi(parsed.modeBkuKonsolidasi)
      if (parsed.modeBkuPembantu) setModeBkuPembantu(parsed.modeBkuPembantu)
    } catch {
      // Gunakan nilai default jika penyimpanan lokal tidak tersedia/rusak.
    }
  }, [])

  useEffect(() => {
    if (!settingsHydrated.current) {
      settingsHydrated.current = true
      return
    }
    try {
      window.localStorage.setItem(
        "bku-format-baru-settings",
        JSON.stringify({ metadata, identitasItems, modeBkuKonsolidasi, modeBkuPembantu })
      )
    } catch {
      // Penyimpanan lokal bersifat opsional.
    }
  }, [metadata, identitasItems, modeBkuKonsolidasi, modeBkuPembantu])

  // ── Identitas row helpers ──────────────────────────────────────────────────

  const updateIdentitasItem = (idx: number, field: keyof IdentitasItem, value: string) => {
    setIdentitasItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    )
  }

  const deleteIdentitasItem = (idx: number) => {
    setIdentitasItems((prev) => {
      const next = prev.filter((_, i) => i !== idx)
      // renumber
      return next.map((item, i) => ({ ...item, no: String(i + 1).padStart(2, "0") }))
    })
  }

  const addIdentitasItem = () => {
    setIdentitasItems((prev) => {
      const nextNo = String(prev.length + 1).padStart(2, "0")
      return [...prev, { no: nextNo, komp: "", ket: "" }]
    })
  }

  const resetIdentitas = () => {
    setIdentitasItems(
      buildDefaultIdentitas(
        metadata.nomorSpDipa || defaultSpDipa,
        tahunNow,
        getPeriodeDefaultKet(filter.tglAwal, filter.tglAkhir, tahunNow)
      )
    )
  }

  // ── PDF Generator ──────────────────────────────────────────────────────────

  const handleGeneratePdf = async () => {
    try {
      setLoading(true)
      setStep("Mengambil data transaksi lengkap...")

      const data: BukuKasFormatBaruResult = await getBukuKasUmumFormatBaru({
        tglAwal: filter.tglAwal,
        tglAkhir: filter.tglAkhir,
        rekeningId: undefined, // Seluruh rekening satker untuk BKU Lengkap resmi
        unitId: undefined,     // Seluruh unit satker untuk BKU Lengkap resmi
      })

      if (data.totalRows === 0 && data.saldoAwal === 0) {
        toast.warning("Peringatan", {
          description: "Tidak ada transaksi dan saldo pada rentang tanggal yang dipilih.",
        })
      }

      setStep("Merender dokumen PDF (Paket Lengkap)...")
      const { pdf } = await import("@react-pdf/renderer")
      const { BukuKasUmumFormatBaruPDF } = await import(
        "@/components/pdf/buku-kas-umum-format-baru-pdf"
      )
      const logoSrc = `${window.location.origin}/logo-uin-palopo.png`

      setStep("Mengompilasi file PDF...")
      const blob = await pdf(
        <BukuKasUmumFormatBaruPDF
          data={data}
          logoSrc={logoSrc}
          modeBkuKonsolidasi={modeBkuKonsolidasi}
          modeBkuPembantu={modeBkuPembantu}
          metadata={{
            ...metadata,
            tglPemeriksaan: metadata.tglPemeriksaan || filter.tglAkhir,
            identitasItems,
            modeBkuKonsolidasi,
            modeBkuPembantu,
          }}
        />
      ).toBlob()

      setStep("Dokumen siap diunduh!")
      await new Promise((resolve) => setTimeout(resolve, 600))

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `BKU-Lengkap-${filter.tglAwal}-sd-${filter.tglAkhir}.pdf`
      a.click()
      URL.revokeObjectURL(url)

      toast.success("Berhasil mencetak PDF", {
        description: `Buku Kas Umum Lengkap (${data.periodeLabel}) siap digunakan.`,
      })
      setOpen(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat membuat PDF"
      toast.error("Gagal mencetak PDF", { description: msg })
    } finally {
      setLoading(false)
      setStep(null)
    }
  }

  return (
    <>
      {!settingsOnly && <Button
        id="bku-btn-pdf-format-baru"
        variant="default"
        size="sm"
        onClick={() => {
          if (isFiltered) {
            setShowConfirmFilter(true)
          } else {
            setOpen(true)
          }
        }}
        disabled={disabled || loading}
        className="h-8 text-xs gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-medium shadow-sm transition-all"
      >
        <Sparkles className="h-3.5 w-3.5 text-amber-300" />
        Cetak BKU Lengkap
      </Button>}

      {/* Dialog Konfirmasi Saat Filter Rekening/Unit Sedang Aktif (Rekomendasi 2) */}
      <Dialog open={showConfirmFilter} onOpenChange={setShowConfirmFilter}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-sm font-semibold">
                  Filter Rekening / Unit Sedang Aktif
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Konfirmasi pencetakan dokumen resmi BKU Lengkap
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-2.5 text-xs text-muted-foreground leading-relaxed py-1">
            <p>
              Di layar Buku Kas Umum, Anda saat ini sedang memfilter data berdasarkan <strong className="text-foreground">Rekening Bank</strong> atau <strong className="text-foreground">Unit Kerja</strong> tertentu.
            </p>
            <div className="p-2.5 rounded-lg bg-muted/60 border border-border/70 text-foreground text-[11px] space-y-1">
              <div className="font-semibold flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                <span>Ketentuan Dokumen Resmi:</span>
              </div>
              <p className="text-muted-foreground leading-normal">
                Dokumen <strong>BKU Lengkap</strong> memuat Berita Acara Pemeriksaan Kas, Rekonsiliasi, dan BKU Konsolidasi yang secara regulasi pembukuan satker UIN Palopo wajib mencakup <strong>seluruh rekening bank dan unit kas satker</strong>.
              </p>
            </div>
            <p>
              Apakah Anda ingin melanjutkan pencetakan dokumen BKU Lengkap untuk <strong>seluruh kas satker</strong>?
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowConfirmFilter(false)}
              className="h-8 text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => {
                setShowConfirmFilter(false)
                setOpen(true)
              }}
              className="h-8 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-medium gap-1.5"
            >
              Ya, Cetak Seluruh Kas Satker
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">
                  {settingsOnly ? "Pengaturan Dokumen BKU" : "Cetak BKU Lengkap (Dokumen Resmi)"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {settingsOnly
                    ? "Atur data yang akan digunakan pada dokumen PDF Buku Kas Umum."
                    : "Mencetak paket lengkap buku kas resmi dengan standar UIN Palopo."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Banner Notifikasi Cakupan Konsolidasi jika filter layar aktif */}
          {isFiltered && !settingsOnly && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] leading-tight">
              <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <span>
                <strong>Perhatian:</strong> Filter rekening/unit di layar diabaikan. Dokumen BKU Lengkap dicetak untuk <strong>seluruh rekening kas satker</strong> agar Berita Acara &amp; Konsolidasi sah secara regulasi.
              </span>
            </div>
          )}

          {/* Struktur Halaman Dokumen */}
          {!settingsOnly && <div className="rounded-lg border border-border/80 bg-muted/40 p-3 space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Dokumen yang dihasilkan (1 Berkas Lengkap):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                { num: "1", title: "Sampul Depan (Cover)", desc: "Corak hijau-emas, logo Kemenag & UIN Palopo, slogan" },
                { num: "2", title: "Identitas Dokumen", desc: "Data satker, DIPA, dan tanda tangan pengesahan KPA" },
                { num: "3", title: "Berita Acara Kas", desc: "Pemeriksaan fisik kas & tanda tangan pemeriksa" },
                { num: "4", title: "BKU Konsolidasi", desc: "Tabel konsolidasi kas seluruh rekening bank" },
                { num: "5", title: "Rekapitulasi Kas Bank", desc: "Tabel ringkasan posisi kas per rekening bank" },
                { num: "6+", title: "BKU Pembantu Bank", desc: "Tabel rincian kas per masing-masing rekening" },
              ].map((item) => (
                <div key={item.num} className="flex items-start gap-2 bg-background p-2 rounded border border-border/60">
                  <span className="flex-shrink-0 w-5 h-5 rounded bg-emerald-600/10 text-emerald-600 text-[10px] font-bold flex items-center justify-center">
                    {item.num}
                  </span>
                  <div>
                    <p className="font-medium text-foreground">{item.title}</p>
                    <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>}

          {/* ── Format Penyajian Transaksi (Akumulasi vs Detail) ── */}
          <div className="rounded-lg border border-border/80 bg-background p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <TableProperties className="h-3.5 w-3.5 text-emerald-600" />
                Format Penyajian Transaksi
              </p>
              <span className="text-[10px] text-muted-foreground">
                Dapat disesuaikan kebutuhan
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
              {/* Opsi BKU Konsolidasi */}
              <div className="space-y-1.5 p-2.5 rounded-md border border-border/60 bg-muted/20">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-foreground">BKU Konsolidasi</Label>
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    Semua Rekening
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-xs pt-0.5">
                  <button
                    type="button"
                    onClick={() => setModeBkuKonsolidasi("ringkasan")}
                    className={`px-2 py-1.5 rounded text-[11px] font-medium border text-left transition-all ${
                      modeBkuKonsolidasi === "ringkasan"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-background text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    <div className="font-semibold flex items-center gap-1">
                      Ringkasan
                      <span className={`text-[8px] px-1 py-0.2 rounded font-bold ${
                        modeBkuKonsolidasi === "ringkasan" ? "bg-emerald-800 text-emerald-100" : "bg-emerald-100 text-emerald-800"
                      }`}>
                        Saran
                      </span>
                    </div>
                    <div className="text-[9px] opacity-85 leading-tight mt-0.5">
                      Akumulasi tgl &amp; akun
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModeBkuKonsolidasi("detail")}
                    className={`px-2 py-1.5 rounded text-[11px] font-medium border text-left transition-all ${
                      modeBkuKonsolidasi === "detail"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-background text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    <div className="font-semibold">Detail</div>
                    <div className="text-[9px] opacity-85 leading-tight mt-0.5">
                      Seluruh transaksi
                    </div>
                  </button>
                </div>
                <p className="text-[9.5px] text-muted-foreground leading-tight pt-0.5">
                  {modeBkuKonsolidasi === "ringkasan"
                    ? "Transaksi dengan tanggal & akun yang sama diakumulasikan agar tidak terlalu panjang."
                    : "Menampilkan tiap transaksi tersendiri per baris."}
                </p>
              </div>

              {/* Opsi BKU Pembantu Bank */}
              <div className="space-y-1.5 p-2.5 rounded-md border border-border/60 bg-muted/20">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-foreground">BKU Pembantu Bank</Label>
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-medium bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    Per Rekening
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-xs pt-0.5">
                  <button
                    type="button"
                    onClick={() => setModeBkuPembantu("detail")}
                    className={`px-2 py-1.5 rounded text-[11px] font-medium border text-left transition-all ${
                      modeBkuPembantu === "detail"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-background text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    <div className="font-semibold flex items-center gap-1">
                      Detail Bukti
                      <span className={`text-[8px] px-1 py-0.2 rounded font-bold ${
                        modeBkuPembantu === "detail" ? "bg-emerald-800 text-emerald-100" : "bg-emerald-100 text-emerald-800"
                      }`}>
                        Saran
                      </span>
                    </div>
                    <div className="text-[9px] opacity-85 leading-tight mt-0.5">
                      Ada nomor bukti
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModeBkuPembantu("ringkasan")}
                    className={`px-2 py-1.5 rounded text-[11px] font-medium border text-left transition-all ${
                      modeBkuPembantu === "ringkasan"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-background text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    <div className="font-semibold">Ringkasan</div>
                    <div className="text-[9px] opacity-85 leading-tight mt-0.5">
                      Akumulasi per hari
                    </div>
                  </button>
                </div>
                <p className="text-[9.5px] text-muted-foreground leading-tight pt-0.5">
                  {modeBkuPembantu === "detail"
                    ? "Menampilkan nomor bukti dan transaksi rinci per rekening untuk rekonsiliasi & audit."
                    : "Nomor bukti diringkas menjadi rekap per hari."}
                </p>
              </div>
            </div>
          </div>

          {/* ── ACCORDION: Identitas Dokumen Editor ── */}
          {!settingsOnly && (
            <div className="rounded-lg border border-border/80 bg-background p-3">
              <div className="flex items-end gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <Label htmlFor="bku-tanggal-berita-acara" className="text-xs font-medium">Tanggal Berita Acara Pemeriksaan</Label>
                  <Input id="bku-tanggal-berita-acara" type="date" value={metadata.tglPemeriksaan} onChange={(e) => setMetadata((prev) => ({ ...prev, tglPemeriksaan: e.target.value }))} className="h-8 text-xs" />
                </div>
                <p className="max-w-[220px] pb-1 text-[10px] leading-tight text-muted-foreground">Default: tanggal terakhir pada bulan periode cetak. Dapat diubah manual.</p>
              </div>
            </div>
          )}

          {settingsOnly && <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowIdentitas(!showIdentitas)}
              className="w-full flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground py-1 border-b border-border/60"
            >
              <span className="flex items-center gap-1.5">
                <TableProperties className="h-3.5 w-3.5" />
                Edit Baris Identitas Dokumen
              </span>
              {showIdentitas ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {showIdentitas && (
              <div className="space-y-2 pt-1">
                <div className="rounded-md border border-border overflow-hidden text-xs">
                  {/* Tabel Header */}
                  <div className="grid grid-cols-[32px_1fr_1fr_32px] bg-muted/60 border-b border-border">
                    <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground text-center">NO</div>
                    <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground border-l border-border">KOMPONEN IDENTITAS</div>
                    <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground border-l border-border">KETERANGAN</div>
                    <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground border-l border-border text-center"></div>
                  </div>

                  {/* Baris-baris */}
                  {identitasItems.map((item, idx) => (
                    <div
                      key={idx}
                      className={`grid grid-cols-[32px_1fr_1fr_32px] border-b border-border last:border-b-0 ${
                        idx % 2 === 1 ? "bg-muted/20" : "bg-background"
                      }`}
                    >
                      {/* No */}
                      <div className="px-1 py-1 flex items-center justify-center">
                        <Input
                          value={item.no}
                          onChange={(e) => updateIdentitasItem(idx, "no", e.target.value)}
                          className="h-6 text-[10px] text-center px-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </div>
                      {/* Komponen */}
                      <div className="px-1 py-1 border-l border-border">
                        <Input
                          value={item.komp}
                          onChange={(e) => updateIdentitasItem(idx, "komp", e.target.value)}
                          placeholder="Komponen identitas..."
                          className="h-6 text-[10px] px-1.5 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </div>
                      {/* Keterangan */}
                      <div className="px-1 py-1 border-l border-border">
                        <Input
                          value={item.ket}
                          onChange={(e) => updateIdentitasItem(idx, "ket", e.target.value)}
                          placeholder="Keterangan..."
                          className="h-6 text-[10px] px-1.5 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </div>
                      {/* Hapus */}
                      <div className="flex items-center justify-center border-l border-border">
                        <button
                          type="button"
                          onClick={() => deleteIdentitasItem(idx)}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                          title="Hapus baris"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tombol aksi identitas */}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addIdentitasItem}
                    className="h-7 text-xs gap-1 flex-1"
                  >
                    <Plus className="h-3 w-3" />
                    Tambah Baris
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetIdentitas}
                    className="h-7 text-xs text-muted-foreground"
                  >
                    Reset ke Default
                  </Button>
                </div>
              </div>
            )}
          </div>}

          {/* ── ACCORDION: Data Pengesahan & Berita Acara ── */}
          {settingsOnly && <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowOptions(!showOptions)}
              className="w-full flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground py-1 border-b border-border/60"
            >
              <span>Sesuaikan Data Pengesahan &amp; Berita Acara (Opsional)</span>
              {showOptions ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {showOptions && (
              <div className="space-y-3 pt-1 text-xs">
                {/* Tanggal Pemeriksaan Berita Acara */}
                <div className="space-y-1">
                  <Label htmlFor="tglPemeriksaan" className="text-xs">
                    Tanggal Berita Acara Pemeriksaan
                  </Label>
                  <Input
                    id="tglPemeriksaan"
                    type="date"
                    value={metadata.tglPemeriksaan}
                    onChange={(e) =>
                      setMetadata((prev) => ({ ...prev, tglPemeriksaan: e.target.value }))
                    }
                    className="h-8 text-xs"
                  />
                </div>

                {/* Data KPA */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="namaKpa" className="text-xs">Nama Kuasa Pengguna Anggaran</Label>
                    <Input
                      id="namaKpa"
                      value={metadata.namaKpa}
                      onChange={(e) => setMetadata((prev) => ({ ...prev, namaKpa: e.target.value }))}
                      placeholder="[NAMA KUASA PENGGUNA ANGGARAN]"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="nipKpa" className="text-xs">NIP KPA (Opsional)</Label>
                    <Input
                      id="nipKpa"
                      value={metadata.nipKpa}
                      onChange={(e) => setMetadata((prev) => ({ ...prev, nipKpa: e.target.value }))}
                      placeholder="Biarkan kosong untuk garis tanda tangan"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                {/* Data Bendahara */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="namaBendahara" className="text-xs">Nama Bendahara Penerimaan</Label>
                    <Input
                      id="namaBendahara"
                      value={metadata.namaBendahara}
                      onChange={(e) => setMetadata((prev) => ({ ...prev, namaBendahara: e.target.value }))}
                      placeholder="SUVRI ABDILLAH, S.SOS"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="nipBendahara" className="text-xs">NIP Bendahara (Opsional)</Label>
                    <Input
                      id="nipBendahara"
                      value={metadata.nipBendahara}
                      onChange={(e) => setMetadata((prev) => ({ ...prev, nipBendahara: e.target.value }))}
                      placeholder="Biarkan kosong untuk garis tanda tangan"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                {/* Nomor SP DIPA */}
                <div className="space-y-1">
                  <Label htmlFor="nomorSpDipa" className="text-xs">Tanggal / Nomor SP DIPA</Label>
                  <Input
                    id="nomorSpDipa"
                    value={metadata.nomorSpDipa}
                    onChange={(e) => setMetadata((prev) => ({ ...prev, nomorSpDipa: e.target.value }))}
                    placeholder={defaultSpDipa}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            )}
          </div>}

          {/* Status Loading */}
          {loading && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-600 flex-shrink-0" />
              <span className="text-xs font-medium">{step || "Memproses..."}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="h-8 text-xs"
            >
              {settingsOnly ? "Tutup" : "Batal"}
            </Button>
            {!settingsOnly && <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleGeneratePdf}
              disabled={loading}
              className="h-8 text-xs gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  Unduh BKU Lengkap (PDF)
                </>
              )}
            </Button>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
