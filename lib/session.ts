import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export type Profile = {
  id: string
  nama_lengkap: string
  email: string | null
  no_hp: string | null
  is_active: boolean
  unit_kerja_id: string | null
  role: {
    id: string
    kode: string
    nama: string
  }
  unit_kerja?: {
    id: string
    kode: string
    nama: string
  } | null
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id, nama_lengkap, email, no_hp, is_active, unit_kerja_id,
      role:roles!profiles_role_id_fkey(id, kode, nama),
      unit_kerja:unit_kerja!profiles_unit_kerja_id_fkey(id, kode, nama)
    `)
    .eq("id", user.id)
    .single()

  if (error || !data) return null

  const row = data as unknown as {
    id: string; nama_lengkap: string; email: string | null; no_hp: string | null
    is_active: boolean; unit_kerja_id: string | null
    role: { id: string; kode: string; nama: string } | { id: string; kode: string; nama: string }[] | null
    unit_kerja: { id: string; kode: string; nama: string } | { id: string; kode: string; nama: string }[] | null
  }

  const resolveOne = <T>(v: T | T[] | null): T | null =>
    v == null ? null : Array.isArray(v) ? (v[0] ?? null) : v

  const role = resolveOne(row.role)
  if (!role) return null

  return {
    id: row.id,
    nama_lengkap: row.nama_lengkap,
    email: row.email,
    no_hp: row.no_hp,
    is_active: row.is_active,
    unit_kerja_id: row.unit_kerja_id,
    role,
    unit_kerja: resolveOne(row.unit_kerja),
  }
}

export async function requireRole(roles: string[]): Promise<Profile> {
  const profile = await getCurrentProfile()
  if (!profile || !profile.is_active) redirect("/")
  if (!roles.includes(profile.role.kode)) redirect("/dashboard")
  return profile
}
