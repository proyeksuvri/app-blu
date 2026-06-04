"use server"

import { createClient } from "@/lib/supabase/server"

export async function listRoles() {
  const sb = await createClient()
  const { data } = await sb.from("roles").select("id, kode, nama").eq("is_active", true).order("nama")
  return data ?? []
}

export async function listUnitKerja() {
  const sb = await createClient()
  const { data } = await sb.from("unit_kerja").select("id, kode, nama").eq("is_active", true).order("nama")
  return data ?? []
}
