"use client"

import { useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, UserCheck, UserX } from "lucide-react"
import { toast } from "sonner"
import {
  createMahasiswa,
  updateMahasiswa,
  deleteMahasiswa,
  toggleMahasiswaAktif,
  type MahasiswaRow,
  type MahasiswaInput,
} from "@/app/actions/mahasiswa"

const schema = z.object({
  no_virtual_akun: z.string().min(1, "No. Virtual Akun wajib diisi"),
  nim: z.string().min(1, "NIM wajib diisi"),
  nama_mahasiswa: z.string().min(1, "Nama Mahasiswa wajib diisi"),
  fakultas: z.string().optional(),
  prodi: z.string().optional(),
  periode: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export function MahasiswaTable({
  data,
  count,
  page,
  pageSize,
}: {
  data: MahasiswaRow[]
  count: number
  page: number
  pageSize: number
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<MahasiswaRow | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const totalPages = Math.ceil(count / pageSize)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      no_virtual_akun: "",
      nim: "",
      nama_mahasiswa: "",
      fakultas: "",
      prodi: "",
      periode: "",
    },
  })

  function openCreateDialog() {
    setEditingRow(null)
    reset({
      no_virtual_akun: "",
      nim: "",
      nama_mahasiswa: "",
      fakultas: "",
      prodi: "",
      periode: "",
    })
    setDialogOpen(true)
  }

  function openEditDialog(row: MahasiswaRow) {
    setEditingRow(row)
    reset({
      no_virtual_akun: row.no_virtual_akun,
      nim: row.nim,
      nama_mahasiswa: row.nama_mahasiswa,
      fakultas: row.fakultas ?? "",
      prodi: row.prodi ?? "",
      periode: row.periode ?? "",
    })
    setDialogOpen(true)
  }

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const input: MahasiswaInput = {
        no_virtual_akun: values.no_virtual_akun,
        nim: values.nim,
        nama_mahasiswa: values.nama_mahasiswa,
        fakultas: values.fakultas || undefined,
        prodi: values.prodi || undefined,
        periode: values.periode || undefined,
      }

      const result = editingRow
        ? await updateMahasiswa(editingRow.id, input)
        : await createMahasiswa(input)

      if (!result.ok) {
        toast.error(result.pesan)
        return
      }

      toast.success(editingRow ? "Data mahasiswa diperbarui" : "Mahasiswa berhasil ditambahkan")
      setDialogOpen(false)
      router.refresh()
    })
  }

  function handleDelete(row: MahasiswaRow) {
    if (!confirm(`Hapus data mahasiswa ${row.nama_mahasiswa} (${row.nim})?`)) return
    setLoadingId(row.id)
    startTransition(async () => {
      const result = await deleteMahasiswa(row.id)
      if (!result.ok) toast.error(result.pesan)
      else toast.success("Mahasiswa berhasil dihapus")
      setLoadingId(null)
      router.refresh()
    })
  }

  function handleToggleAktif(id: string, is_active: boolean) {
    setLoadingId(id)
    startTransition(async () => {
      const result = await toggleMahasiswaAktif(id, !is_active)
      if (!result.ok) toast.error(result.pesan)
      else toast.success(is_active ? "Mahasiswa dinonaktifkan" : "Mahasiswa diaktifkan")
      setLoadingId(null)
      router.refresh()
    })
  }

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(p))
    router.push(`?${params.toString()}`)
  }

  return (
    <>
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreateDialog} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Tambah Mahasiswa
        </Button>
      </div>

      {data.length === 0 ? (
        <EmptyState message="Belum ada data mahasiswa. Silakan tambah manual atau import dari Excel." />
      ) : (
        <div className="flex flex-col gap-3">
          <Card className="overflow-hidden p-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground text-xs pl-4">No. Virtual Akun</TableHead>
                    <TableHead className="text-muted-foreground text-xs">NIM</TableHead>
                    <TableHead className="text-muted-foreground text-xs">Nama Mahasiswa</TableHead>
                    <TableHead className="text-muted-foreground text-xs">Fakultas</TableHead>
                    <TableHead className="text-muted-foreground text-xs">Prodi</TableHead>
                    <TableHead className="text-muted-foreground text-xs">Periode</TableHead>
                    <TableHead className="text-muted-foreground text-xs">Status</TableHead>
                    <TableHead className="w-28 text-right pr-4">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row) => (
                    <TableRow key={row.id} className="border-border/50 hover:bg-muted/20">
                      <TableCell className="pl-4 py-2.5 font-mono text-xs font-semibold text-primary">
                        {row.no_virtual_akun}
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-foreground/70 font-mono">{row.nim}</TableCell>
                      <TableCell className="py-2.5 text-sm font-medium text-foreground">{row.nama_mahasiswa}</TableCell>
                      <TableCell className="py-2.5 text-xs text-foreground/60">{row.fakultas ?? "—"}</TableCell>
                      <TableCell className="py-2.5 text-xs text-foreground/60">{row.prodi ?? "—"}</TableCell>
                      <TableCell className="py-2.5 text-xs text-foreground/60">{row.periode ?? "—"}</TableCell>
                      <TableCell className="py-2.5">
                        <Badge variant={row.is_active ? "default" : "secondary"} className="text-xs">
                          {row.is_active ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2.5 text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditDialog(row)}
                            className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleAktif(row.id, row.is_active)}
                            disabled={pending && loadingId === row.id}
                            className={`p-1 rounded transition-colors ${
                              row.is_active
                                ? "text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            }`}
                            title={row.is_active ? "Nonaktifkan" : "Aktifkan"}
                          >
                            {row.is_active ? <UserCheck className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(row)}
                            disabled={pending && loadingId === row.id}
                            className="p-1 text-muted-foreground hover:text-destructive rounded hover:bg-destructive/10 transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{count} mahasiswa · Halaman {page} dari {totalPages}</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon-sm" onClick={() => goToPage(page - 1)} disabled={page <= 1}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => goToPage(page + 1)} disabled={page >= totalPages}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dialog Form Tambah / Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRow ? "Edit Data Mahasiswa" : "Tambah Mahasiswa Baru"}</DialogTitle>
            <DialogDescription>
              {editingRow ? "Perbarui informasi mahasiswa." : "Masukkan data mahasiswa baru ke sistem."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 py-2">
            <Field data-invalid={!!errors.no_virtual_akun}>
              <FieldLabel>No. Virtual Akun <span className="text-destructive">*</span></FieldLabel>
              <Input
                {...register("no_virtual_akun")}
                placeholder="Contoh: 7199823020100950"
                className="bg-muted/50 border-border text-foreground"
              />
              <FieldError errors={[errors.no_virtual_akun]} />
            </Field>

            <Field data-invalid={!!errors.nim}>
              <FieldLabel>NIM <span className="text-destructive">*</span></FieldLabel>
              <Input
                {...register("nim")}
                placeholder="Contoh: 2302010095"
                className="bg-muted/50 border-border text-foreground"
              />
              <FieldError errors={[errors.nim]} />
            </Field>

            <Field data-invalid={!!errors.nama_mahasiswa}>
              <FieldLabel>Nama Mahasiswa <span className="text-destructive">*</span></FieldLabel>
              <Input
                {...register("nama_mahasiswa")}
                placeholder="Nama lengkap mahasiswa"
                className="bg-muted/50 border-border text-foreground"
              />
              <FieldError errors={[errors.nama_mahasiswa]} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Fakultas</FieldLabel>
                <Input
                  {...register("fakultas")}
                  placeholder="Fakultas Tarbiyah..."
                  className="bg-muted/50 border-border text-foreground"
                />
              </Field>

              <Field>
                <FieldLabel>Program Studi</FieldLabel>
                <Input
                  {...register("prodi")}
                  placeholder="S1 - Pendidikan..."
                  className="bg-muted/50 border-border text-foreground"
                />
              </Field>
            </div>

            <Field>
              <FieldLabel>Periode</FieldLabel>
              <Input
                {...register("periode")}
                placeholder="Contoh: 2025 Genap"
                className="bg-muted/50 border-border text-foreground"
              />
            </Field>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)} disabled={pending}>
                Batal
              </Button>
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Menyimpan..." : editingRow ? "Simpan Perubahan" : "Tambah Mahasiswa"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
