"use client"

import { useEffect, useState, useTransition } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { CurrencyInput } from "@/components/currency-input"
import { toast } from "sonner"
import { createPenerimaan, updatePenerimaan, type PenerimaanInput } from "@/app/actions/penerimaan"
import { createClient } from "@/lib/supabase/client"

const schema = z.object({
  tanggal_terima: z.string().min(1, "Wajib diisi"),
  kategori_id: z.string().uuid("Wajib dipilih"),
  jenis_pendapatan_id: z.string().uuid("Wajib dipilih"),
  sub_pendapatan_id: z.string().optional(),
  unit_kerja_id: z.string().uuid("Wajib dipilih"),
  rekening_bank_id: z.string().uuid("Wajib dipilih"),
  jenis_pemindahan_kas_id: z.string().uuid("Wajib dipilih"),
  jumlah: z.number().positive("Jumlah harus lebih dari 0"),
  nomor_referensi: z.string().optional(),
  uraian: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

type OptionItem = { id: string; kode: string; nama: string }
type JenisItem = OptionItem & { kategori_pendapatan_id: string }
type SubItem = OptionItem & { jenis_pendapatan_id: string }

type Props = {
  editId?: string
  defaultValues?: Partial<FormValues>
  lockedUnitId?: string
}

const inputCls = "bg-muted/50 border-border text-foreground placeholder:text-muted-foreground/50 focus-visible:border-ring focus-visible:ring-ring/20"

function Req() {
  return <span className="ml-1 text-destructive">*</span>
}

export function PenerimaanForm({ editId, defaultValues, lockedUnitId }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [kategoriList, setKategoriList] = useState<OptionItem[]>([])
  const [jenisList, setJenisList] = useState<JenisItem[]>([])
  const [subList, setSubList] = useState<SubItem[]>([])
  const [unitList, setUnitList] = useState<OptionItem[]>([])
  const [rekeningList, setRekeningList] = useState<OptionItem[]>([])
  const [metodeList, setMetodeList] = useState<OptionItem[]>([])

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      tanggal_terima: new Date().toISOString().split("T")[0],
      ...defaultValues,
      unit_kerja_id: lockedUnitId ?? defaultValues?.unit_kerja_id,
    },
  })

  const watchKategori = watch("kategori_id")
  const watchJenis = watch("jenis_pendapatan_id")

  useEffect(() => {
    const sb = createClient()
    Promise.all([
      sb.from("kategori_pendapatan").select("id, kode, nama").eq("is_active", true).order("kode"),
      sb.from("unit_kerja").select("id, kode, nama").eq("is_active", true).order("kode"),
      sb.from("rekening_bank").select("id, kode, nama_bank, nama_rekening").eq("is_active", true).order("kode"),
      sb.from("jenis_pemindahan_kas").select("id, kode, nama").eq("is_active", true).order("kode"),
    ]).then(([kat, unit, rek, metode]) => {
      setKategoriList(kat.data ?? [])
      setUnitList(unit.data?.map((u) => ({ id: u.id, kode: u.kode, nama: u.nama })) ?? [])
      setRekeningList(rek.data?.map((r) => ({ id: r.id, kode: r.kode, nama: `${r.nama_bank} — ${r.nama_rekening}` })) ?? [])
      setMetodeList(metode.data ?? [])
    })
  }, [])

  useEffect(() => {
    if (!watchKategori) { setJenisList([]); setSubList([]); return }
    const sb = createClient()
    sb.from("jenis_pendapatan")
      .select("id, kode, nama, kategori_pendapatan_id")
      .eq("kategori_pendapatan_id", watchKategori)
      .eq("is_active", true)
      .order("kode")
      .then(({ data }) => {
        setJenisList(data ?? [])
        setSubList([])
        setValue("jenis_pendapatan_id", "" as string)
        setValue("sub_pendapatan_id", "")
      })
  }, [watchKategori, setValue])

  useEffect(() => {
    if (!watchJenis) { setSubList([]); return }
    const sb = createClient()
    sb.from("sub_pendapatan")
      .select("id, kode, nama, jenis_pendapatan_id")
      .eq("jenis_pendapatan_id", watchJenis)
      .eq("is_active", true)
      .order("kode")
      .then(({ data }) => {
        setSubList(data ?? [])
        setValue("sub_pendapatan_id", "")
      })
  }, [watchJenis, setValue])

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const input: PenerimaanInput = {
        tanggal_terima: values.tanggal_terima,
        jenis_pendapatan_id: values.jenis_pendapatan_id,
        sub_pendapatan_id: values.sub_pendapatan_id || undefined,
        unit_kerja_id: values.unit_kerja_id,
        rekening_bank_id: values.rekening_bank_id,
        jenis_pemindahan_kas_id: values.jenis_pemindahan_kas_id,
        jumlah: values.jumlah,
        nomor_referensi: values.nomor_referensi || undefined,
        uraian: values.uraian || undefined,
      }
      const result = editId
        ? await updatePenerimaan(editId, input)
        : await createPenerimaan(input)

      if (!result.ok) { toast.error(result.pesan); return }
      toast.success(editId ? "Berhasil diperbarui" : "Penerimaan berhasil disimpan sebagai draft")
      router.push("/penerimaan")
    })
  }

  const sectionCls = "rounded-xl border border-border overflow-hidden"
  const sectionHeadCls = "px-5 py-3.5 border-b border-border"
  const sectionTitleCls = "text-sm font-medium text-foreground/60"
  const sectionBodyCls = "p-5 flex flex-col gap-5"
  const triggerCls = `w-full ${inputCls}`

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto flex w-full max-w-5xl flex-col gap-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => router.back()}
            className="mt-0.5 shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              {editId ? "Edit Penerimaan" : "Input Penerimaan"}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">Catat penerimaan dana baru sebagai draft</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => router.back()}>
            Batal
          </Button>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Menyimpan..." : editId ? "Perbarui" : "Simpan sebagai Draft"}
          </Button>
        </div>
      </div>

      {/* 2-kolom body */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Kolom kiri */}
        <div className="flex flex-col gap-4">

          <div className={sectionCls}>
            <div className={sectionHeadCls}>
              <p className={sectionTitleCls}>Informasi Transaksi</p>
            </div>
            <div className={sectionBodyCls}>
              <Field data-invalid={!!errors.tanggal_terima}>
                <FieldLabel>Tanggal Transaksi<Req /></FieldLabel>
                <Input {...register("tanggal_terima")} type="date" className={inputCls} aria-invalid={!!errors.tanggal_terima} />
                <FieldError errors={[errors.tanggal_terima]} />
              </Field>
              <Field data-invalid={!!errors.kategori_id}>
                <FieldLabel>Kategori Pendapatan<Req /></FieldLabel>
                <Controller name="kategori_id" control={control} render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <SelectTrigger className={triggerCls} aria-invalid={!!errors.kategori_id}>
                      <SelectValue>{field.value ? (kategoriList.find(k => k.id === field.value) ? `${kategoriList.find(k => k.id === field.value)!.kode} — ${kategoriList.find(k => k.id === field.value)!.nama}` : "Memuat...") : "Pilih kategori"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>{kategoriList.map(k => <SelectItem key={k.id} value={k.id}>{k.kode} — {k.nama}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
                <FieldError errors={[errors.kategori_id]} />
              </Field>
            </div>
          </div>

          <div className={sectionCls}>
            <div className={sectionHeadCls}>
              <p className={sectionTitleCls}>Klasifikasi Pendapatan</p>
            </div>
            <div className={sectionBodyCls}>
              <Field data-invalid={!!errors.jenis_pendapatan_id}>
                <FieldLabel>Jenis Pendapatan<Req /></FieldLabel>
                <Controller name="jenis_pendapatan_id" control={control} render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value ?? ""} disabled={!watchKategori}>
                    <SelectTrigger className={triggerCls} aria-invalid={!!errors.jenis_pendapatan_id}>
                      <SelectValue>{field.value ? (jenisList.find(j => j.id === field.value) ? `${jenisList.find(j => j.id === field.value)!.kode} — ${jenisList.find(j => j.id === field.value)!.nama}` : "Memuat...") : (watchKategori ? "Pilih jenis" : "Pilih kategori dulu")}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>{jenisList.map(j => <SelectItem key={j.id} value={j.id}>{j.kode} — {j.nama}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
                <FieldError errors={[errors.jenis_pendapatan_id]} />
              </Field>
              <Field>
                <FieldLabel>Sub Pendapatan</FieldLabel>
                <Controller name="sub_pendapatan_id" control={control} render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value ?? ""} disabled={!watchJenis || subList.length === 0}>
                    <SelectTrigger className={triggerCls}>
                      <SelectValue>{field.value ? (subList.find(s => s.id === field.value) ? `${subList.find(s => s.id === field.value)!.kode} — ${subList.find(s => s.id === field.value)!.nama}` : "Memuat...") : "Pilih sub (opsional)"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>{subList.map(s => <SelectItem key={s.id} value={s.id}>{s.kode} — {s.nama}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </Field>
            </div>
          </div>

        </div>

        {/* Kolom kanan */}
        <div className="flex flex-col gap-4">

          <div className={sectionCls}>
            <div className={sectionHeadCls}>
              <p className={sectionTitleCls}>Pembayaran</p>
            </div>
            <div className={sectionBodyCls}>
              <Field data-invalid={!!errors.jumlah}>
                <FieldLabel>Jumlah<Req /></FieldLabel>
                <Controller name="jumlah" control={control} render={({ field }) => (
                  <CurrencyInput value={field.value} onChange={field.onChange} className={inputCls} aria-invalid={!!errors.jumlah} />
                )} />
                <FieldError errors={[errors.jumlah]} />
              </Field>
              <Field data-invalid={!!errors.jenis_pemindahan_kas_id}>
                <FieldLabel>Metode Pembayaran<Req /></FieldLabel>
                <Controller name="jenis_pemindahan_kas_id" control={control} render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <SelectTrigger className={triggerCls} aria-invalid={!!errors.jenis_pemindahan_kas_id}>
                      <SelectValue>{field.value ? (metodeList.find(m => m.id === field.value)?.nama ?? "Memuat...") : "Pilih metode"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>{metodeList.map(m => <SelectItem key={m.id} value={m.id}>{m.nama}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
                <FieldError errors={[errors.jenis_pemindahan_kas_id]} />
              </Field>
            </div>
          </div>

          <div className={sectionCls}>
            <div className={sectionHeadCls}>
              <p className={sectionTitleCls}>Unit & Rekening</p>
            </div>
            <div className={sectionBodyCls}>
              <Field data-invalid={!!errors.unit_kerja_id}>
                <FieldLabel>Unit Kerja<Req /></FieldLabel>
                <Controller name="unit_kerja_id" control={control} render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value ?? ""} disabled={!!lockedUnitId}>
                    <SelectTrigger className={triggerCls} aria-invalid={!!errors.unit_kerja_id}>
                      <SelectValue>{field.value ? (unitList.find(u => u.id === field.value) ? `${unitList.find(u => u.id === field.value)!.kode} — ${unitList.find(u => u.id === field.value)!.nama}` : "Memuat...") : "Pilih unit"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>{unitList.map(u => <SelectItem key={u.id} value={u.id}>{u.kode} — {u.nama}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
                <FieldError errors={[errors.unit_kerja_id]} />
              </Field>
              <Field data-invalid={!!errors.rekening_bank_id}>
                <FieldLabel>Rekening Bank<Req /></FieldLabel>
                <Controller name="rekening_bank_id" control={control} render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <SelectTrigger className={triggerCls} aria-invalid={!!errors.rekening_bank_id}>
                      <SelectValue>{field.value ? (rekeningList.find(r => r.id === field.value)?.nama ?? "Memuat...") : "Pilih rekening"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>{rekeningList.map(r => <SelectItem key={r.id} value={r.id}>{r.kode} — {r.nama}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
                <FieldError errors={[errors.rekening_bank_id]} />
              </Field>
            </div>
          </div>

          <div className={sectionCls}>
            <div className={sectionHeadCls}>
              <p className={sectionTitleCls}>Referensi</p>
            </div>
            <div className={sectionBodyCls}>
              <Field>
                <FieldLabel>Nomor Bukti</FieldLabel>
                <Input {...register("nomor_referensi")} placeholder="No. bukti / referensi transaksi" className={inputCls} />
              </Field>
              <Field>
                <FieldLabel>Uraian</FieldLabel>
                <Textarea {...register("uraian")} rows={3} placeholder="Keterangan tambahan (opsional)" className={`${inputCls} resize-none`} />
              </Field>
            </div>
          </div>

        </div>
      </div>
    </form>
  )
}
