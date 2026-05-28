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
import { createSub, updateSub, toggleSubAktif } from "@/app/actions/master"

const schema = z.object({
  jenis_pendapatan_id: z.string().uuid(),
  kode: z.string().min(1).max(20),
  nama: z.string().min(1),
  keterangan: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

type JenisOption = { id: string; nama: string }
type Row = MasterRow & {
  jenis_pendapatan_id: string
  kode: string
  nama: string
  keterangan: string | null
  is_active: boolean
  jenis: { nama: string } | null
}

function SubForm({ row, onDone, jenisOptions }: { row: Row | null; onDone: () => void; jenisOptions: JenisOption[] }) {
  const [pending, startTransition] = useTransition()

  const { register, control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      jenis_pendapatan_id: row?.jenis_pendapatan_id ?? "",
      kode: row?.kode ?? "",
      nama: row?.nama ?? "",
      keterangan: row?.keterangan ?? "",
    },
  })

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = row
        ? await updateSub(row.id, values)
        : await createSub(values)
      if (!result.ok) { toast.error(result.pesan); return }
      toast.success(row ? "Berhasil diperbarui" : "Berhasil ditambahkan")
      onDone()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Field data-invalid={!!errors.jenis_pendapatan_id}>
        <FieldLabel>Jenis Pendapatan</FieldLabel>
        <Controller
          name="jenis_pendapatan_id"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="bg-muted/50 border-border text-foreground">
                <SelectValue placeholder="Pilih jenis" />
              </SelectTrigger>
              <SelectContent>
                {jenisOptions.map((j) => (
                  <SelectItem key={j.id} value={j.id}>{j.nama}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError errors={[errors.jenis_pendapatan_id]} />
      </Field>
      <Field data-invalid={!!errors.kode}>
        <FieldLabel>Kode</FieldLabel>
        <Input {...register("kode")} placeholder="SUB-01" className="bg-muted/50 border-border text-foreground" aria-invalid={!!errors.kode} />
        <FieldError errors={[errors.kode]} />
      </Field>
      <Field data-invalid={!!errors.nama}>
        <FieldLabel>Nama</FieldLabel>
        <Input {...register("nama")} placeholder="Nama sub pendapatan" className="bg-muted/50 border-border text-foreground" aria-invalid={!!errors.nama} />
        <FieldError errors={[errors.nama]} />
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

export function SubTable({ data, jenisOptions }: { data: Row[]; jenisOptions: JenisOption[] }) {
  return (
    <MasterTable
      data={data}
      dialogTitle="Sub Pendapatan"
      columns={[
        { key: "kode", label: "Kode" },
        { key: "nama", label: "Nama" },
        { key: "jenis", label: "Jenis", render: (row) => row.jenis?.nama ?? "-" },
        { key: "is_active", label: "Status", render: (row) => <StatusBadge aktif={row.is_active} /> },
      ]}
      form={(row, onDone) => <SubForm row={row as Row | null} onDone={onDone} jenisOptions={jenisOptions} />}
      onToggleAktif={toggleSubAktif}
    />
  )
}
