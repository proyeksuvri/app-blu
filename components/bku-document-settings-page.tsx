"use client"

import { useEffect, useRef, useState } from "react"
import { CheckCircle2, Loader2, Plus, RotateCcw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { CustomMetadata, IdentitasItem } from "@/components/pdf/buku-kas-umum-format-baru-pdf"
import { toast } from "sonner"

const defaultItems = (tahun: number, spDipa: string): IdentitasItem[] => [
  { no: "01", komp: "Kementerian / Lembaga", ket: "(025) AGAMA RI" },
  { no: "02", komp: "Unit Organisasi", ket: "DIREKTORAT JENDERAL PENDIDIKAN ISLAM" },
  { no: "03", komp: "Provinsi / Kab. / Kota", ket: "SULAWESI SELATAN / KOTA PALOPO" },
  { no: "04", komp: "Satuan Kerja", ket: "UNIVERSITAS ISLAM NEGERI PALOPO" },
  { no: "05", komp: "Tanggal / Nomor SP DIPA", ket: spDipa },
  { no: "06", komp: "KPPN", ket: "KPPN PALOPO" },
  { no: "07", komp: "Tahun Anggaran", ket: String(tahun) },
]

const endOfMonth = (dateValue: string) => {
  const [year, month] = dateValue.split("-").map(Number)
  if (!year || !month) return dateValue
  return `${year}-${String(month).padStart(2, "0")}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`
}

export function BkuDocumentSettingsPage({ tglAkhir }: { tglAkhir: string }) {
  const tahun = Number(tglAkhir.slice(0, 4)) || new Date().getFullYear()
  const spDipa = `[DIISI SESUAI DIPA UIN PALOPO TAHUN ${tahun}]`
  const defaultTanggalBeritaAcara = endOfMonth(tglAkhir)
  const [metadata, setMetadata] = useState<CustomMetadata>({
    tglPemeriksaan: defaultTanggalBeritaAcara, namaKpa: "[NAMA KUASA PENGGUNA ANGGARAN]", nipKpa: "",
    jabatanKpa: "Rektor / Kuasa Pengguna Anggaran UIN Palopo / Atasan Langsung Bendahara Penerimaan UIN Palopo",
    namaBendahara: "SUVRI ABDILLAH, S.SOS", nipBendahara: "", jabatanBendahara: "Bendahara Penerimaan UIN Palopo",
    nomorSpDipa: spDipa, uangKertas: "", spmu: "", saldoBankKas: "", suratBerharga: "",
  })
  const [items, setItems] = useState<IdentitasItem[]>(() => defaultItems(tahun, spDipa))
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const hydrated = useRef(false)

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem("bku-format-baru-settings") || "null")
      if (saved?.metadata) setMetadata((prev) => ({ ...prev, ...saved.metadata }))
      if (Array.isArray(saved?.identitasItems)) setItems(saved.identitasItems)
    } catch { /* gunakan default */ }
  }, [])

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true
      return
    }
    try {
      window.localStorage.setItem("bku-format-baru-settings", JSON.stringify({ metadata, identitasItems: items }))
    } catch { /* penyimpanan manual tetap menampilkan error */ }
  }, [metadata, items])

  const save = () => {
    setSaving(true)
    try {
      window.localStorage.setItem("bku-format-baru-settings", JSON.stringify({ metadata, identitasItems: items }))
      const savedAt = new Date()
      setLastSaved(savedAt)
      toast.success("Pengaturan berhasil disimpan", {
        description: `Perubahan tersimpan pada ${savedAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}.`,
        icon: <CheckCircle2 className="h-4 w-4" />,
      })
    } catch {
      toast.error("Pengaturan gagal disimpan", { description: "Penyimpanan lokal tidak tersedia." })
    } finally {
      window.setTimeout(() => setSaving(false), 450)
    }
  }
  const updateMeta = (key: keyof CustomMetadata, value: string) => setMetadata((prev) => ({ ...prev, [key]: value }))
  const updateItem = (index: number, key: keyof IdentitasItem, value: string) =>
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, [key]: value } : item))
  const reset = () => setItems(defaultItems(tahun, metadata.nomorSpDipa || spDipa))

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Identitas Dokumen</h2>
        <p className="mt-1 text-xs text-muted-foreground">Baris identitas yang ditampilkan pada halaman dokumen BKU.</p>
        <div className="mt-4 overflow-hidden rounded-md border border-border">
          <div className="grid grid-cols-[48px_1fr_1fr_42px] bg-muted/60 text-[10px] font-semibold text-muted-foreground">
            <div className="p-2 text-center">NO</div><div className="border-l p-2">KOMPONEN IDENTITAS</div><div className="border-l p-2">KETERANGAN</div><div className="border-l" />
          </div>
          {items.map((item, index) => <div key={index} className="grid grid-cols-[48px_1fr_1fr_42px] border-t text-xs">
            <Input value={item.no} onChange={(e) => updateItem(index, "no", e.target.value)} className="h-8 rounded-none border-0 text-center text-xs" />
            <Input value={item.komp} onChange={(e) => updateItem(index, "komp", e.target.value)} className="h-8 rounded-none border-x text-xs" />
            <Input value={item.ket} onChange={(e) => updateItem(index, "ket", e.target.value)} className="h-8 rounded-none border-0 text-xs" />
            <button type="button" title="Hapus baris" onClick={() => setItems((prev) => prev.filter((_, i) => i !== index).map((v, i) => ({ ...v, no: String(i + 1).padStart(2, "0") })))} className="flex items-center justify-center border-l text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>)}
        </div>
        <div className="mt-3 flex gap-2"><Button variant="outline" size="sm" onClick={() => setItems((prev) => [...prev, { no: String(prev.length + 1).padStart(2, "0"), komp: "", ket: "" }])}><Plus className="mr-1 h-3.5 w-3.5" />Tambah Baris</Button><Button variant="ghost" size="sm" onClick={reset}><RotateCcw className="mr-1 h-3.5 w-3.5" />Reset Default</Button></div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Data Pengesahan &amp; Berita Acara</h2>
        <p className="mt-1 text-xs text-muted-foreground">Data berikut digunakan pada halaman pengesahan dan berita acara pemeriksaan kas.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><Label htmlFor="bku-nomor-dipa">Tanggal / Nomor SP DIPA</Label><Input id="bku-nomor-dipa" value={metadata.nomorSpDipa} onChange={(e) => updateMeta("nomorSpDipa", e.target.value)} className="mt-1 h-8 text-xs" /></div>
          <div><Label htmlFor="bku-nama-kpa">Nama Kuasa Pengguna Anggaran</Label><Input id="bku-nama-kpa" value={metadata.namaKpa} onChange={(e) => updateMeta("namaKpa", e.target.value)} className="mt-1 h-8 text-xs" /></div>
          <div><Label htmlFor="bku-nip-kpa">NIP KPA (Opsional)</Label><Input id="bku-nip-kpa" value={metadata.nipKpa} onChange={(e) => updateMeta("nipKpa", e.target.value)} className="mt-1 h-8 text-xs" /></div>
          <div><Label htmlFor="bku-nama-bendahara">Nama Bendahara Penerimaan</Label><Input id="bku-nama-bendahara" value={metadata.namaBendahara} onChange={(e) => updateMeta("namaBendahara", e.target.value)} className="mt-1 h-8 text-xs" /></div>
          <div><Label htmlFor="bku-nip-bendahara">NIP Bendahara (Opsional)</Label><Input id="bku-nip-bendahara" value={metadata.nipBendahara} onChange={(e) => updateMeta("nipBendahara", e.target.value)} className="mt-1 h-8 text-xs" /></div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
            {lastSaved && <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Tersimpan {lastSaved.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</>}
          </div>
          <Button onClick={save} disabled={saving} className="min-w-[156px]">
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan...</> : <><CheckCircle2 className="mr-2 h-4 w-4" />Simpan Pengaturan</>}
          </Button>
        </div>
      </section>
    </div>
  )
}
