"use server"

import { revalidatePath } from "next/cache"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/session"

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; pesan: string }

export async function listPengguna() {
  await requireRole(["ADMIN"])
  const sb = await createClient()
  const { data, error } = await sb
    .from("profiles")
    .select("*, role:roles(id, kode, nama), unit_kerja:unit_kerja(id, kode, nama)")
    .order("nama_lengkap")
  if (error) return []
  return data
}

export async function inviteUser(input: {
  email: string
  password: string
  nama_lengkap: string
  no_hp?: string
  role_id: string
  unit_kerja_id?: string
}): Promise<ActionResult> {
  await requireRole(["ADMIN"])

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, pesan: "SUPABASE_SERVICE_ROLE_KEY belum diisi di .env.local" }
  }

  const adminSb = await createAdminClient()

  // Buat user di Supabase Auth
  const { data: authData, error: authError } = await adminSb.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    return { ok: false, pesan: authError?.message ?? "Gagal membuat akun" }
  }

  // Insert profile
  const { error: profileError } = await adminSb.from("profiles").insert({
    id: authData.user.id,
    nama_lengkap: input.nama_lengkap,
    email: input.email,
    no_hp: input.no_hp || null,
    role_id: input.role_id,
    unit_kerja_id: input.unit_kerja_id || null,
  })

  if (profileError) {
    // Rollback: hapus auth user
    await adminSb.auth.admin.deleteUser(authData.user.id)
    return { ok: false, pesan: profileError.message }
  }

  revalidatePath("/pengguna")
  return { ok: true, data: undefined }
}

export async function updatePengguna(id: string, input: {
  nama_lengkap: string
  no_hp?: string
  role_id: string
  unit_kerja_id?: string
  is_active: boolean
}): Promise<ActionResult> {
  await requireRole(["ADMIN"])
  const sb = await createClient()
  const { error } = await sb.from("profiles").update({
    nama_lengkap: input.nama_lengkap,
    no_hp: input.no_hp || null,
    role_id: input.role_id,
    unit_kerja_id: input.unit_kerja_id || null,
    is_active: input.is_active,
  }).eq("id", id)
  if (error) return { ok: false, pesan: error.message }
  revalidatePath("/pengguna")
  return { ok: true, data: undefined }
}

export async function resetPassword(id: string, password: string): Promise<ActionResult> {
  await requireRole(["ADMIN"])

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, pesan: "SUPABASE_SERVICE_ROLE_KEY belum diisi di .env.local" }
  }

  const adminSb = await createAdminClient()
  const { error } = await adminSb.auth.admin.updateUserById(id, { password })
  if (error) return { ok: false, pesan: error.message }
  return { ok: true, data: undefined }
}
