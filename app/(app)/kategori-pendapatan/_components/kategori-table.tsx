"use client"

import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { MasterTable, type MasterRow } from "@/components/master-table"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/status-badge"
import { toast } from "sonner"
import { createKategori, updateKategori, toggleKategoriAktif } from "@/app/actions/master"

const schema = z.object({
  kode: z.string().min(1).max(20),
  nama: z.string().min(1).max(100),
  keterangan: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

type Row = MasterRow & { kode: string; nama: string; keterangan: string | null; is_active: boolean }

function KategoriForm({ row, onDone }: { row: Row | null; onDone: () => void }) {
  const [pending, startTransition] = useTransition()
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { kode: row?.kode ?? "", nama: row?.nama ?? "", keterangan: row?.keterangan ?? "" },
  })

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = row
        ? await updateKategori(row.id, values)
        : await createKategori(values)
      if (!result.ok) { toast.error(result.pesan); return }
      toast.success(row ? "Berhasil diperbarui" : "Berhasil ditambahkan")
      onDone()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Field data-invalid={!!errors.kode}>
        <FieldLabel>Kode</FieldLabel>
        <Input {...register("kode")} placeholder="PND-01" className="bg-muted/50 border-border text-foreground" aria-invalid={!!errors.kode} />
        <FieldError errors={[errors.kode]} />
      </Field>
      <Field data-invalid={!!errors.nama}>
        <FieldLabel>Nama</FieldLabel>
        <Input {...register("nama")} placeholder="Pendapatan Mahasiswa" className="bg-muted/50 border-border text-foreground" aria-invalid={!!errors.nama} />
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

export function KategoriTable({ data }: { data: Row[] }) {
  return (
    <MasterTable
      data={data}
      dialogTitle="Kategori Pendapatan"
      columns={[
        { key: "kode", label: "Kode" },
        { key: "nama", label: "Nama" },
        { key: "keterangan", label: "Keterangan" },
        { key: "is_active", label: "Status", render: (row) => <StatusBadge aktif={row.is_active} /> },
      ]}
      form={(row, onDone) => <KategoriForm row={row as Row | null} onDone={onDone} />}
      onToggleAktif={toggleKategoriAktif}
    />
  )
}
