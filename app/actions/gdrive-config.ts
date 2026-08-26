"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/session"

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; pesan: string }

// ─── Types ────────────────────────────────────────────────────────────────────

export type GDriveConfigRow = {
  id: string
  nama: string
  url: string
  sheet_name: string | null
  keterangan: string | null
  urutan: number
  created_at: string
  updated_at: string
}

export type GDriveConfigInput = {
  nama: string
  url: string
  sheet_name?: string
  keterangan?: string
  urutan?: number
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function getGDriveConfigs(): Promise<GDriveConfigRow[]> {
  const sb = await createClient()
  const { data, error } = await sb
    .from("gdrive_config")
    .select("*")
    .order("urutan", { ascending: true })
    .order("nama", { ascending: true })

  if (error) {
    console.error("[getGDriveConfigs]", error.message || error.code || JSON.stringify(error))
    return []
  }
  return (data ?? []) as GDriveConfigRow[]
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createGDriveConfig(
  input: GDriveConfigInput,
): Promise<ActionResult<GDriveConfigRow>> {
  await requireRole(["ADMIN"])
  const sb = await createClient()

  const nama = input.nama?.trim()
  const url  = input.url?.trim()

  if (!nama) return { ok: false, pesan: "Nama konfigurasi tidak boleh kosong" }
  if (!url)  return { ok: false, pesan: "URL Google Drive tidak boleh kosong" }

  const { data, error } = await sb
    .from("gdrive_config")
    .insert({
      nama,
      url,
      sheet_name:  input.sheet_name?.trim() || null,
      keterangan:  input.keterangan?.trim() || null,
      urutan:      input.urutan ?? 0,
    })
    .select()
    .single()

  if (error) {
    console.error("[createGDriveConfig]", error)
    const detail = error.code === "42P01"
      ? "Tabel belum dibuat. Jalankan migration SQL di Supabase terlebih dahulu."
      : error.code === "42501" || error.message?.includes("row-level security")
      ? "Akses ditolak (RLS). Pastikan kamu login sebagai ADMIN."
      : `Gagal menyimpan konfigurasi: ${error.message ?? error.code}`
    return { ok: false, pesan: detail }
  }

  revalidatePath("/realisasi-pengesahan")
  return { ok: true, data: data as GDriveConfigRow }
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateGDriveConfig(
  id: string,
  input: Partial<GDriveConfigInput>,
): Promise<ActionResult<GDriveConfigRow>> {
  await requireRole(["ADMIN"])
  const sb = await createClient()

  const patch: Record<string, unknown> = {}
  if (input.nama       !== undefined) patch.nama        = input.nama.trim()
  if (input.url        !== undefined) patch.url         = input.url.trim()
  if (input.sheet_name !== undefined) patch.sheet_name  = input.sheet_name?.trim() || null
  if (input.keterangan !== undefined) patch.keterangan  = input.keterangan?.trim() || null
  if (input.urutan     !== undefined) patch.urutan      = input.urutan

  if (Object.keys(patch).length === 0)
    return { ok: false, pesan: "Tidak ada perubahan" }

  const { data, error } = await sb
    .from("gdrive_config")
    .update(patch)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("[updateGDriveConfig]", error.message || error.code || JSON.stringify(error))
    return { ok: false, pesan: `Gagal memperbarui konfigurasi: ${error.message || error.code}` }
  }

  revalidatePath("/realisasi-pengesahan")
  return { ok: true, data: data as GDriveConfigRow }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteGDriveConfig(id: string): Promise<ActionResult> {
  await requireRole(["ADMIN"])
  const sb = await createClient()

  const { error } = await sb.from("gdrive_config").delete().eq("id", id)

  if (error) {
    console.error("[deleteGDriveConfig]", error.message || error.code || JSON.stringify(error))
    return { ok: false, pesan: `Gagal menghapus konfigurasi: ${error.message || error.code}` }
  }

  revalidatePath("/realisasi-pengesahan")
  return { ok: true, data: undefined }
}
