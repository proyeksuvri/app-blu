"use client"

import { useTransition } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { MasterTable, type MasterRow } from "@/components/master-table"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { StatusBadge } from "@/components/status-badge"
import { toast } from "sonner"
import { createJenis, updateJenis, toggleJenisAktif } from "@/app/actions/master"

const schema = z.object({
  kategori_pendapatan_id: z.string().uuid(),
  kode: z.string().min(1).max(20),
  nama: z.string().min(1),
  akun_pendapatan: z.string().optional(),
  keterangan: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

type KategoriOption = { id: string; nama: string }
type Row = MasterRow & {
  kategori_pendapatan_id: string
  kode: string
  nama: string
  akun_pendapatan: string | null
  keterangan: string | null
  is_active: boolean
  kategori: { nama: string } | null
}

function JenisForm({ row, onDone, kategoriOptions }: { row: Row | null; onDone: () => void; kategoriOptions: KategoriOption[] }) {
  const [pending, startTransition] = useTransition()

  const { register, control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      kategori_pendapatan_id: row?.kategori_pendapatan_id ?? "",
      kode: row?.kode ?? "",
      nama: row?.nama ?? "",
      akun_pendapatan: row?.akun_pendapatan ?? "",
      keterangan: row?.keterangan ?? "",
    },
  })

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = row
        ? await updateJenis(row.id, values)
        : await createJenis(values)
      if (!result.ok) { toast.error(result.pesan); return }
      toast.success(row ? "Berhasil diperbarui" : "Berhasil ditambahkan")
      onDone()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Field data-invalid={!!errors.kategori_pendapatan_id}>
        <FieldLabel>Kategori Pendapatan</FieldLabel>
        <Controller
          name="kategori_pendapatan_id"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="bg-muted/50 border-border text-foreground">
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                {kategoriOptions.map((k) => (
                  <SelectItem key={k.id} value={k.id}>{k.nama}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError errors={[errors.kategori_pendapatan_id]} />
      </Field>
      <Field data-invalid={!!errors.kode}>
        <FieldLabel>Kode</FieldLabel>
        <Input {...register("kode")} placeholder="JNS-01" className="bg-muted/50 border-border text-foreground" aria-invalid={!!errors.kode} />
        <FieldError errors={[errors.kode]} />
      </Field>
      <Field data-invalid={!!errors.nama}>
        <FieldLabel>Nama</FieldLabel>
        <Input {...register("nama")} placeholder="Nama jenis pendapatan" className="bg-muted/50 border-border text-foreground" aria-invalid={!!errors.nama} />
        <FieldError errors={[errors.nama]} />
      </Field>
      <Field>
        <FieldLabel>Akun Pendapatan</FieldLabel>
        <Input {...register("akun_pendapatan")} placeholder="424111" className="bg-muted/50 border-border text-foreground" />
      </Field>
      <Field>
        <FieldLabel>Keterangan</FieldLabel>
        <Textarea {...register("keterangan")} rows={2} placeholder="Opsional" className="bg-muted/50 border-border text-foreground resize-none" />
      </Field>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Menyimpan..." : "Simpan"}
      </Button>
    </form>
  )
}

export function JenisTable({ data, kategoriOptions }: { data: Row[]; kategoriOptions: KategoriOption[] }) {
  return (
    <MasterTable
      data={data}
      dialogTitle="Jenis Pendapatan"
      columns={[
        { key: "kode", label: "Kode" },
        { key: "nama", label: "Nama" },
        { key: "kategori", label: "Kategori", render: (row) => row.kategori?.nama ?? "-" },
        { key: "akun_pendapatan", label: "Akun Pendapatan" },
        { key: "is_active", label: "Status", render: (row) => <StatusBadge aktif={row.is_active} /> },
      ]}
      form={(row, onDone) => <JenisForm row={row as Row | null} onDone={onDone} kategoriOptions={kategoriOptions} />}
      onToggleAktif={toggleJenisAktif}
    />
  )
}
