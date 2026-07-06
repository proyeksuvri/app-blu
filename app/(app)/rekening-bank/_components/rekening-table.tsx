"use client"

import { useTransition, useState, useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { MasterTable, type MasterRow } from "@/components/master-table"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/status-badge"
import { CurrencyInput } from "@/components/currency-input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Landmark, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { createRekening, updateRekening, toggleRekeningAktif, listSaldoAwal, upsertSaldoAwal, deleteSaldoAwal } from "@/app/actions/master"

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)

const schema = z.object({
  kode: z.string().min(1),
  nama_bank: z.string().min(1),
  nama_rekening: z.string().min(1),
  nomor_rekening: z.string().min(1),
  keterangan: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

const saldoSchema = z.object({
  tahun: z.number().int().min(2000).max(2100),
  saldo: z.number().min(0, "Saldo tidak boleh negatif"),
  keterangan: z.string().optional(),
})
type SaldoFormValues = z.infer<typeof saldoSchema>

type Row = MasterRow & {
  kode: string
  nama_bank: string
  nama_rekening: string
  nomor_rekening: string
  keterangan: string | null
  is_active: boolean
}

type SaldoRow = {
  id: string
  rekening_bank_id: string
  tahun: number
  saldo: number
  keterangan: string | null
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

function SaldoAwalDialog({ row, open, onClose }: { row: Row; open: boolean; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [saldoList, setSaldoList] = useState<SaldoRow[]>([])
  const [loading, setLoading] = useState(false)

  const tahunList = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i)

  const { control, handleSubmit, reset, formState: { errors } } = useForm<SaldoFormValues>({
    resolver: zodResolver(saldoSchema),
    defaultValues: { tahun: new Date().getFullYear(), saldo: 0, keterangan: "" },
  })

  useEffect(() => {
    if (!open) return
    setLoading(true)
    listSaldoAwal(row.id).then((data) => {
      setSaldoList((data as SaldoRow[]) ?? [])
      setLoading(false)
    })
  }, [open, row.id])

  function onSubmit(values: SaldoFormValues) {
    startTransition(async () => {
      const result = await upsertSaldoAwal({
        rekening_bank_id: row.id,
        tahun: values.tahun,
        saldo: values.saldo,
        keterangan: values.keterangan,
      })
      if (!result.ok) { toast.error(result.pesan); return }
      toast.success("Saldo awal berhasil disimpan")
      reset({ tahun: new Date().getFullYear(), saldo: 0, keterangan: "" })
      const fresh = await listSaldoAwal(row.id)
      setSaldoList((fresh as SaldoRow[]) ?? [])
    })
  }

  function handleDelete(id: string) {
    setDeletingId(id)
    startTransition(async () => {
      const result = await deleteSaldoAwal(id)
      if (!result.ok) { toast.error(result.pesan); setDeletingId(null); return }
      toast.success("Saldo awal dihapus")
      setDeletingId(null)
      const fresh = await listSaldoAwal(row.id)
      setSaldoList((fresh as SaldoRow[]) ?? [])
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Saldo Awal — {row.nama_bank}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">{row.nama_rekening} · {row.nomor_rekening}</p>

        {/* Form input saldo awal */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 border border-border rounded-xl p-4">
          <p className="text-xs font-medium text-muted-foreground">Tambah / Perbarui Saldo Awal</p>
          <div className="grid grid-cols-2 gap-3">
            <Field data-invalid={!!errors.tahun}>
              <FieldLabel>Tahun</FieldLabel>
              <Controller name="tahun" control={control} render={({ field }) => (
                <Select value={String(field.value)} onValueChange={(v) => field.onChange(parseInt(v))}>
                  <SelectTrigger className="bg-muted/50 border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tahunList.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
              <FieldError errors={[errors.tahun]} />
            </Field>
            <Field data-invalid={!!errors.saldo}>
              <FieldLabel>Saldo Awal</FieldLabel>
              <Controller name="saldo" control={control} render={({ field }) => (
                <CurrencyInput value={field.value} onChange={field.onChange} className="bg-muted/50 border-border text-foreground" aria-invalid={!!errors.saldo} />
              )} />
              <FieldError errors={[errors.saldo]} />
            </Field>
          </div>
          <Button type="submit" size="sm" disabled={pending} className="self-end">
            {pending ? "Menyimpan..." : "Simpan"}
          </Button>
        </form>

        {/* Daftar saldo awal */}
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-4">Memuat...</p>
        ) : saldoList.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Belum ada saldo awal yang diatur</p>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs text-muted-foreground">Tahun</TableHead>
                  <TableHead className="text-xs text-muted-foreground text-right">Saldo Awal</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {saldoList.map((s) => (
                  <TableRow key={s.id} className="border-border/50">
                    <TableCell className="text-sm font-medium text-foreground py-2">{s.tahun}</TableCell>
                    <TableCell className="text-sm text-foreground/80 text-right py-2">{rupiah(Number(s.saldo))}</TableCell>
                    <TableCell className="py-2 text-right">
                      <Button
                        variant="ghost" size="icon-sm"
                        disabled={deletingId === s.id || pending}
                        onClick={() => handleDelete(s.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function RekeningTable({ data }: { data: Row[] }) {
  const [saldoRow, setSaldoRow] = useState<Row | null>(null)

  return (
    <>
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
        extraActions={(row) => (
          <Button
            variant="ghost" size="icon-sm"
            onClick={() => setSaldoRow(row as Row)}
            title="Atur Saldo Awal"
            className="text-muted-foreground hover:text-foreground"
          >
            <Landmark className="h-4 w-4" />
          </Button>
        )}
      />
      {saldoRow && (
        <SaldoAwalDialog
          row={saldoRow}
          open={!!saldoRow}
          onClose={() => setSaldoRow(null)}
        />
      )}
    </>
  )
}
