"use client"

import { useState, useTransition } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Pencil, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { StatusBadge } from "@/components/status-badge"
import { EmptyState } from "@/components/empty-state"
import { toast } from "sonner"
import { inviteUser, updatePengguna, resetPassword } from "@/app/actions/pengguna"

type Role = { id: string; kode: string; nama: string }
type Unit = { id: string; kode: string; nama: string }
type Pengguna = {
  id: string; nama_lengkap: string; email: string | null; no_hp: string | null
  is_active: boolean
  role: Role | null
  unit_kerja: Unit | null
}

const inviteSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  nama_lengkap: z.string().min(1),
  no_hp: z.string().optional(),
  role_id: z.string().uuid(),
  unit_kerja_id: z.string().optional(),
})
type InviteValues = z.infer<typeof inviteSchema>

const editSchema = z.object({
  nama_lengkap: z.string().min(1),
  no_hp: z.string().optional(),
  role_id: z.string().uuid(),
  unit_kerja_id: z.string().optional(),
  is_active: z.boolean(),
})
type EditValues = z.infer<typeof editSchema>

const pwSchema = z.object({ password: z.string().min(6) })
type PwValues = z.infer<typeof pwSchema>

function InviteForm({ roles, unitKerja, onDone }: { roles: Role[]; unitKerja: Unit[]; onDone: () => void }) {
  const [pending, startTransition] = useTransition()
  const { register, handleSubmit, control, formState: { errors } } = useForm<InviteValues>({ resolver: zodResolver(inviteSchema) })

  function onSubmit(values: InviteValues) {
    startTransition(async () => {
      const result = await inviteUser(values)
      if (!result.ok) { toast.error(result.pesan); return }
      toast.success("Pengguna berhasil ditambahkan")
      onDone()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-foreground/60 text-xs">Email</Label>
          <Input {...register("email")} type="email" placeholder="nama@uinpalopo.ac.id" className="bg-muted/50 border-border text-foreground" />
          {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-foreground/60 text-xs">Password Awal</Label>
          <Input {...register("password")} type="password" placeholder="Min. 6 karakter" className="bg-muted/50 border-border text-foreground" />
          {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-foreground/60 text-xs">Nama Lengkap</Label>
        <Input {...register("nama_lengkap")} placeholder="Nama lengkap" className="bg-muted/50 border-border text-foreground" />
        {errors.nama_lengkap && <p className="text-xs text-red-400">{errors.nama_lengkap.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-foreground/60 text-xs">Role</Label>
          <Controller name="role_id" control={control} render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger className="bg-muted/50 border-border text-foreground w-full">
                <span className={`flex flex-1 text-left text-sm truncate${!field.value ? " text-muted-foreground" : ""}`}>
                  {field.value ? (roles.find((r) => r.id === field.value)?.nama ?? "Pilih role") : "Pilih role"}
                </span>
              </SelectTrigger>
              <SelectContent className="border-border">
                {roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.nama}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
          {errors.role_id && <p className="text-xs text-red-400">Wajib dipilih</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-foreground/60 text-xs">Unit Kerja (opsional)</Label>
          <Controller name="unit_kerja_id" control={control} render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger className="bg-muted/50 border-border text-foreground w-full">
                <span className={`flex flex-1 text-left text-sm truncate${!field.value ? " text-muted-foreground" : ""}`}>
                  {field.value ? (unitKerja.find((u) => u.id === field.value)?.nama ?? "— Semua unit —") : "— Semua unit —"}
                </span>
              </SelectTrigger>
              <SelectContent className="border-border">
                {unitKerja.map((u) => <SelectItem key={u.id} value={u.id}>{u.nama}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-foreground/60 text-xs">No HP (opsional)</Label>
        <Input {...register("no_hp")} placeholder="08xx" className="bg-muted/50 border-border text-foreground" />
      </div>
      <Button type="submit" disabled={pending} className="w-full mt-1">
        {pending ? "Menyimpan..." : "Tambah Pengguna"}
      </Button>
    </form>
  )
}

function EditForm({ row, roles, unitKerja, onDone }: { row: Pengguna; roles: Role[]; unitKerja: Unit[]; onDone: () => void }) {
  const [pending, startTransition] = useTransition()
  const { register, handleSubmit, control, formState: { errors } } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      nama_lengkap: row.nama_lengkap,
      no_hp: row.no_hp ?? "",
      role_id: row.role?.id ?? "",
      unit_kerja_id: row.unit_kerja?.id ?? "",
      is_active: row.is_active,
    },
  })

  function onSubmit(values: EditValues) {
    startTransition(async () => {
      const result = await updatePengguna(row.id, values)
      if (!result.ok) { toast.error(result.pesan); return }
      toast.success("Berhasil diperbarui")
      onDone()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label className="text-foreground/60 text-xs">Nama Lengkap</Label>
        <Input {...register("nama_lengkap")} className="bg-muted/50 border-border text-foreground" />
        {errors.nama_lengkap && <p className="text-xs text-red-400">{errors.nama_lengkap.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-foreground/60 text-xs">Role</Label>
          <Controller name="role_id" control={control} render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger className="bg-muted/50 border-border text-foreground w-full">
                <span className={`flex flex-1 text-left text-sm truncate${!field.value ? " text-muted-foreground" : ""}`}>
                  {field.value ? (roles.find((r) => r.id === field.value)?.nama ?? "Pilih role") : "Pilih role"}
                </span>
              </SelectTrigger>
              <SelectContent className="border-border">
                {roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.nama}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-foreground/60 text-xs">Unit Kerja</Label>
          <Controller name="unit_kerja_id" control={control} render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger className="bg-muted/50 border-border text-foreground w-full">
                <span className={`flex flex-1 text-left text-sm truncate${!field.value ? " text-muted-foreground" : ""}`}>
                  {field.value ? (unitKerja.find((u) => u.id === field.value)?.nama ?? "— Semua —") : "— Semua —"}
                </span>
              </SelectTrigger>
              <SelectContent className="border-border">
                {unitKerja.map((u) => <SelectItem key={u.id} value={u.id}>{u.nama}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-foreground/60 text-xs">No HP</Label>
        <Input {...register("no_hp")} className="bg-muted/50 border-border text-foreground" />
      </div>
      <div className="flex items-center gap-2">
        <Controller name="is_active" control={control} render={({ field }) => (
          <Checkbox id="is_active" checked={field.value} onCheckedChange={field.onChange} />
        )} />
        <Label htmlFor="is_active" className="text-xs text-foreground/60">Akun aktif</Label>
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Menyimpan..." : "Simpan"}
      </Button>
    </form>
  )
}

function ResetPwForm({ id, onDone }: { id: string; onDone: () => void }) {
  const [pending, startTransition] = useTransition()
  const { register, handleSubmit, formState: { errors } } = useForm<PwValues>({ resolver: zodResolver(pwSchema) })

  function onSubmit(values: PwValues) {
    startTransition(async () => {
      const result = await resetPassword(id, values.password)
      if (!result.ok) { toast.error(result.pesan); return }
      toast.success("Password berhasil direset")
      onDone()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label className="text-foreground/60 text-xs">Password Baru</Label>
        <Input {...register("password")} type="password" placeholder="Min. 6 karakter" className="bg-muted/50 border-border text-foreground" />
        {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Menyimpan..." : "Reset Password"}
      </Button>
    </form>
  )
}

type ModalState =
  | { type: "invite" }
  | { type: "edit"; row: Pengguna }
  | { type: "reset_pw"; row: Pengguna }
  | null

export function PenggunaTable({ data, roles, unitKerja }: { data: Pengguna[]; roles: Role[]; unitKerja: Unit[] }) {
  const [modal, setModal] = useState<ModalState>(null)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setModal({ type: "invite" })} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Tambah Pengguna
        </Button>
      </div>

      {data.length === 0 ? (
        <EmptyState message="Belum ada pengguna" />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground text-xs">Nama</TableHead>
                <TableHead className="text-muted-foreground text-xs">Email</TableHead>
                <TableHead className="text-muted-foreground text-xs">Role</TableHead>
                <TableHead className="text-muted-foreground text-xs">Unit Kerja</TableHead>
                <TableHead className="text-muted-foreground text-xs">Status</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.id} className="border-border/50 hover:bg-muted/20">
                  <TableCell className="text-sm text-foreground/80 py-3 font-medium">{row.nama_lengkap}</TableCell>
                  <TableCell className="text-sm text-foreground/50 py-3">{row.email ?? "—"}</TableCell>
                  <TableCell className="text-sm text-foreground/60 py-3">{row.role?.nama ?? "—"}</TableCell>
                  <TableCell className="text-sm text-foreground/50 py-3">{row.unit_kerja?.nama ?? "—"}</TableCell>
                  <TableCell className="py-3"><StatusBadge aktif={row.is_active} /></TableCell>
                  <TableCell className="py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setModal({ type: "edit", row })}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setModal({ type: "reset_pw", row })}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                        <KeyRound className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!modal} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {modal?.type === "invite" && "Tambah Pengguna"}
              {modal?.type === "edit" && "Edit Pengguna"}
              {modal?.type === "reset_pw" && "Reset Password"}
            </DialogTitle>
          </DialogHeader>
          {modal?.type === "invite" && (
            <InviteForm roles={roles} unitKerja={unitKerja} onDone={() => setModal(null)} />
          )}
          {modal?.type === "edit" && (
            <EditForm row={modal.row} roles={roles} unitKerja={unitKerja} onDone={() => setModal(null)} />
          )}
          {modal?.type === "reset_pw" && (
            <ResetPwForm id={modal.row.id} onDone={() => setModal(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
