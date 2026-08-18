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
import { createPengeluaran, updatePengeluaran, type PengeluaranInput } from "@/app/actions/pengeluaran"
import { createClient } from "@/lib/supabase/client"

const schema = z.object({
  tanggal: z.string().min(1, "Wajib diisi"),
  unit_kerja_id: z.string().uuid("Wajib dipilih"),
  rekening_bank_id: z.string().uuid("Wajib dipilih"),
  jenis_pengeluaran_id: z.string().uuid().optional().or(z.literal("")),
  jumlah: z.number().positive("Jumlah harus lebih dari 0"),
  uraian: z.string().min(1, "Uraian wajib diisi"),
})
type FormValues = z.infer<typeof schema>

type OptionItem = { id: string; kode: string; nama: string }

type Props = {
  editId?: string
  defaultValues?: Partial<FormValues>
  lockedUnitId?: string
}

const inputCls = "bg-muted/50 border-border text-foreground placeholder:text-muted-foreground/50 focus-visible:border-ring focus-visible:ring-ring/20"

function Req() {
  return <span className="ml-1 text-destructive">*</span>
}

export function PengeluaranForm({ editId, defaultValues, lockedUnitId }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [unitList, setUnitList] = useState<OptionItem[]>([])
  const [rekeningList, setRekeningList] = useState<OptionItem[]>([])
  const [jenisList, setJenisList] = useState<OptionItem[]>([])

  const { register, handleSubmit, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      tanggal: new Date().toISOString().split("T")[0],
      ...defaultValues,
      unit_kerja_id: lockedUnitId ?? defaultValues?.unit_kerja_id,
    },
  })

  useEffect(() => {
    const sb = createClient()
    Promise.all([
      sb.from("unit_kerja").select("id, kode, nama").eq("is_active", true).order("kode"),
      sb.from("rekening_bank").select("id, kode, nama_bank, nama_rekening").eq("is_active", true).order("kode"),
      sb.from("jenis_pengeluaran").select("id, kode, nama").eq("is_active", true).order("kode"),
    ]).then(([unit, rek, jenis]) => {
      setUnitList(unit.data?.map((u) => ({ id: u.id, kode: u.kode, nama: u.nama })) ?? [])
      setRekeningList(rek.data?.map((r) => ({ id: r.id, kode: r.kode, nama: `${r.nama_bank} — ${r.nama_rekening}` })) ?? [])
      setJenisList(jenis.data?.map((j) => ({ id: j.id, kode: j.kode, nama: j.nama })) ?? [])
    })
  }, [])

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const input: PengeluaranInput = {
        tanggal: values.tanggal,
        unit_kerja_id: values.unit_kerja_id,
        rekening_bank_id: values.rekening_bank_id,
        jenis_pengeluaran_id: values.jenis_pengeluaran_id || undefined,
        jumlah: values.jumlah,
        uraian: values.uraian,
      }
      const result = editId
        ? await updatePengeluaran(editId, input)
        : await createPengeluaran(input)

      if (!result.ok) { toast.error(result.pesan); return }
      toast.success(editId ? "Berhasil diperbarui" : "Pengeluaran berhasil disimpan sebagai draft")
      router.push("/pengeluaran")
    })
  }

  const sectionCls = "rounded-xl border border-border overflow-hidden"
  const sectionHeadCls = "px-5 py-3.5 border-b border-border"
  const sectionTitleCls = "text-sm font-medium text-foreground/60"
  const sectionBodyCls = "p-5 flex flex-col gap-5"
  const triggerCls = `w-full ${inputCls}`

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto flex w-full max-w-3xl flex-col gap-6">

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
              {editId ? "Edit Pengeluaran" : "Input Pengeluaran"}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">Catat pengeluaran dana baru sebagai draft</p>
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

      {/* 1-kolom body */}
      <div className="flex flex-col gap-4">

        <div className={sectionCls}>
          <div className={sectionHeadCls}>
            <p className={sectionTitleCls}>Informasi Transaksi</p>
          </div>
          <div className={sectionBodyCls}>
            <Field data-invalid={!!errors.tanggal}>
              <FieldLabel>Tanggal Transaksi<Req /></FieldLabel>
              <Input {...register("tanggal")} type="date" className={inputCls} aria-invalid={!!errors.tanggal} />
              <FieldError errors={[errors.tanggal]} />
            </Field>

            <Field data-invalid={!!errors.uraian}>
              <FieldLabel>Uraian / Keterangan<Req /></FieldLabel>
              <Textarea {...register("uraian")} rows={3} placeholder="Penjelasan pengeluaran..." className={`${inputCls} resize-none`} />
              <FieldError errors={[errors.uraian]} />
            </Field>
          </div>
        </div>

        <div className={sectionCls}>
          <div className={sectionHeadCls}>
            <p className={sectionTitleCls}>Pembayaran</p>
          </div>
          <div className={sectionBodyCls}>
            <Field data-invalid={!!errors.jumlah}>
              <FieldLabel>Jenis Pengeluaran</FieldLabel>
              <Controller name="jenis_pengeluaran_id" control={control} render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <SelectTrigger className={triggerCls}>
                    <SelectValue>{field.value ? (jenisList.find(j => j.id === field.value) ? `${jenisList.find(j => j.id === field.value)!.kode} — ${jenisList.find(j => j.id === field.value)!.nama}` : "Memuat...") : "Pilih jenis (opsional)"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— Tidak dipilih —</SelectItem>
                    {jenisList.map(j => <SelectItem key={j.id} value={j.id}>{j.kode} — {j.nama}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </Field>

            <Field data-invalid={!!errors.jumlah}>
              <FieldLabel>Jumlah<Req /></FieldLabel>
              <Controller name="jumlah" control={control} render={({ field }) => (
                <CurrencyInput value={field.value} onChange={field.onChange} className={inputCls} aria-invalid={!!errors.jumlah} />
              )} />
              <FieldError errors={[errors.jumlah]} />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <FieldLabel>Rekening Bank (Sumber Dana)<Req /></FieldLabel>
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
        </div>

      </div>
    </form>
  )
}
