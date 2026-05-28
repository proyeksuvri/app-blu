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
import { createRekening, updateRekening, toggleRekeningAktif } from "@/app/actions/master"

const schema = z.object({
  kode: z.string().min(1),
  nama_bank: z.string().min(1),
  nama_rekening: z.string().min(1),
  nomor_rekening: z.string().min(1),
  keterangan: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

type Row = MasterRow & {
  kode: string
  nama_bank: string
  nama_rekening: string
  nomor_rekening: string
  keterangan: string | null
  is_active: boolean
}

function RekeningForm({ row, onDone }: { row: Row | null; onDone: () => void }) {
  const [pending, startTransition] = useTransition()
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      kode: row?.kode ?? "",
      nama_bank: row?.nama_bank ?? "",
      nama_rekening: row?.nama_rekening ?? "",
      nomor_rekening: row?.nomor_rekening ?? "",
      keterangan: row?.keterangan ?? "",
    },
  })

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = row
        ? await updateRekening(row.id, values)
        : await createRekening(values)
      if (!result.ok) { toast.error(result.pesan); return }
      toast.success(row ? "Berhasil diperbarui" : "Berhasil ditambahkan")
      onDone()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Field data-invalid={!!errors.kode}>
        <FieldLabel>Kode</FieldLabel>
        <Input {...register("kode")} placeholder="RK-01" className="bg-muted/50 border-border text-foreground" aria-invalid={!!errors.kode} />
        <FieldError errors={[errors.kode]} />
      </Field>
      <Field data-invalid={!!errors.nama_bank}>
        <FieldLabel>Nama Bank</FieldLabel>
        <Input {...register("nama_bank")} placeholder="Bank BNI" className="bg-muted/50 border-border text-foreground" aria-invalid={!!errors.nama_bank} />
        <FieldError errors={[errors.nama_bank]} />
      </Field>
      <Field data-invalid={!!errors.nama_rekening}>
        <FieldLabel>Nama Rekening</FieldLabel>
        <Input {...register("nama_rekening")} placeholder="Nama pemilik rekening" className="bg-muted/50 border-border text-foreground" aria-invalid={!!errors.nama_rekening} />
        <FieldError errors={[errors.nama_rekening]} />
      </Field>
      <Field data-invalid={!!errors.nomor_rekening}>
        <FieldLabel>Nomor Rekening</FieldLabel>
        <Input {...register("nomor_rekening")} placeholder="0123456789" className="bg-muted/50 border-border text-foreground" aria-invalid={!!errors.nomor_rekening} />
        <FieldError errors={[errors.nomor_rekening]} />
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

export function RekeningTable({ data }: { data: Row[] }) {
  return (
    <MasterTable
      data={data}
      dialogTitle="Rekening Bank"
      columns={[
        { key: "kode", label: "Kode" },
        { key: "nama_bank", label: "Nama Bank" },
        { key: "nama_rekening", label: "Nama Rekening" },
        { key: "nomor_rekening", label: "Nomor Rekening" },
        { key: "is_active", label: "Status", render: (row) => <StatusBadge aktif={row.is_active} /> },
      ]}
      form={(row, onDone) => <RekeningForm row={row as Row | null} onDone={onDone} />}
      onToggleAktif={toggleRekeningAktif}
    />
  )
}
