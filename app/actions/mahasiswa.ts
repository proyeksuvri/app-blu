"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/session"

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; pesan: string }

// ─── Types ────────────────────────────────────────────────────────────────────

export type MahasiswaRow = {
  id: string
  no_virtual_akun: string
  nim: string
  nama_mahasiswa: string
  fakultas: string | null
  prodi: string | null
  periode: string | null
  is_active: boolean
  created_at: string
}

export type MahasiswaInput = {
  no_virtual_akun: string
  nim: string
  nama_mahasiswa: string
  fakultas?: string
  prodi?: string
  periode?: string
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listMahasiswa(opts: {
  q?: string
  is_active?: boolean
  page?: number
  limit?: number
} = {}) {
  const sb = await createClient()
  const limit = [25, 50, 100].includes(opts.limit ?? 0) ? opts.limit! : 25
  const offset = ((opts.page ?? 1) - 1) * limit

  let q = sb
    .from("mahasiswa")
    .select("*", { count: "exact" })
    .order("nama_mahasiswa")

  if (opts.q?.trim()) {
    const term = `%${opts.q.trim()}%`
    q = q.or(`nama_mahasiswa.ilike.${term},nim.ilike.${term},no_virtual_akun.ilike.${term}`)
  }
  if (typeof opts.is_active === "boolean") {
    q = q.eq("is_active", opts.is_active)
  }

  q = q.range(offset, offset + limit - 1)

  const { data, error, count } = await q
  if (error) return { data: [], count: 0 }
  return { data: data as MahasiswaRow[], count: count ?? 0 }
}

// ─── Lookup by Virtual Akun (untuk autocomplete) ─────────────────────────────

export async function searchMahasiswaByVirtualAkun(term: string, limit = 10) {
  if (!term || term.length < 3) return []
  const sb = await createClient()
  const { data } = await sb
    .from("mahasiswa")
    .select("no_virtual_akun, nim, nama_mahasiswa, prodi")
    .eq("is_active", true)
    .or(`no_virtual_akun.ilike.%${term}%,nim.ilike.%${term}%,nama_mahasiswa.ilike.%${term}%`)
    .limit(limit)
  return data ?? []
}

// ─── Get by Virtual Akun ──────────────────────────────────────────────────────

export async function getMahasiswaByVirtualAkun(virtualAkun: string) {
  if (!virtualAkun) return null
  const sb = await createClient()
  const { data } = await sb
    .from("mahasiswa")
    .select("*")
    .eq("no_virtual_akun", virtualAkun)
    .single()
  return data ?? null
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createMahasiswa(input: MahasiswaInput): Promise<ActionResult> {
  await requireRole(["ADMIN"])
  const sb = await createClient()
  const { error } = await sb.from("mahasiswa").insert({
    no_virtual_akun: input.no_virtual_akun.trim(),
    nim: input.nim.trim(),
    nama_mahasiswa: input.nama_mahasiswa.trim(),
    fakultas: input.fakultas?.trim() || null,
    prodi: input.prodi?.trim() || null,
    periode: input.periode?.trim() || null,
  })
  if (error) {
    if (error.code === "23505") return { ok: false, pesan: "No. virtual akun sudah terdaftar" }
    return { ok: false, pesan: error.message }
  }
  revalidatePath("/mahasiswa")
  return { ok: true, data: undefined }
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateMahasiswa(id: string, input: MahasiswaInput): Promise<ActionResult> {
  await requireRole(["ADMIN"])
  const sb = await createClient()
  const { error } = await sb.from("mahasiswa").update({
    no_virtual_akun: input.no_virtual_akun.trim(),
    nim: input.nim.trim(),
    nama_mahasiswa: input.nama_mahasiswa.trim(),
    fakultas: input.fakultas?.trim() || null,
    prodi: input.prodi?.trim() || null,
    periode: input.periode?.trim() || null,
  }).eq("id", id)
  if (error) {
    if (error.code === "23505") return { ok: false, pesan: "No. virtual akun sudah terdaftar" }
    return { ok: false, pesan: error.message }
  }
  revalidatePath("/mahasiswa")
  return { ok: true, data: undefined }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteMahasiswa(id: string): Promise<ActionResult> {
  await requireRole(["ADMIN"])
  const sb = await createClient()
  const { error } = await sb.from("mahasiswa").delete().eq("id", id)
  if (error) return { ok: false, pesan: error.message }
  revalidatePath("/mahasiswa")
  return { ok: true, data: undefined }
}

// ─── Toggle Aktif ─────────────────────────────────────────────────────────────

export async function toggleMahasiswaAktif(id: string, is_active: boolean): Promise<ActionResult> {
  await requireRole(["ADMIN"])
  const sb = await createClient()
  const { error } = await sb.from("mahasiswa").update({ is_active }).eq("id", id)
  if (error) return { ok: false, pesan: error.message }
  revalidatePath("/mahasiswa")
  return { ok: true, data: undefined }
}

// ─── Import Bulk ──────────────────────────────────────────────────────────────

export type MahasiswaImportRow = {
  no_virtual_akun: string
  nim: string
  nama_mahasiswa: string
  fakultas?: string
  prodi?: string
  periode?: string
}

export async function importMahasiswa(
  rows: MahasiswaImportRow[]
): Promise<ActionResult<{ diperbarui: number; dibuat: number; gagal: number }>> {
  await requireRole(["ADMIN"])
  if (rows.length === 0) return { ok: false, pesan: "Tidak ada data untuk diimpor" }
  if (rows.length > 10000) return { ok: false, pesan: "Maksimal 10.000 baris per import" }

  const sb = await createClient()

  // Deduplikasi by no_virtual_akun (ambil yang terakhir jika duplikat dalam file yang sama)
  const mapByVa = new Map<string, typeof rows[0]>()
  for (const r of rows) {
    const va = r.no_virtual_akun.trim()
    if (va) {
      mapByVa.set(va, r)
    }
  }

  const uniqueRecords = Array.from(mapByVa.values()).map((r) => ({
    no_virtual_akun: r.no_virtual_akun.trim(),
    nim: r.nim.trim(),
    nama_mahasiswa: r.nama_mahasiswa.trim(),
    fakultas: r.fakultas?.trim() || null,
    prodi: r.prodi?.trim() || null,
    periode: r.periode?.trim() || null,
  }))

  const CHUNK_SIZE = 500
  let totalInserted = 0

  for (let i = 0; i < uniqueRecords.length; i += CHUNK_SIZE) {
    const chunk = uniqueRecords.slice(i, i + CHUNK_SIZE)
    const { error, count } = await sb
      .from("mahasiswa")
      .upsert(chunk, { onConflict: "no_virtual_akun", count: "exact" })

    if (error) return { ok: false, pesan: error.message }
    totalInserted += (count ?? chunk.length)
  }

  revalidatePath("/mahasiswa")
  return {
    ok: true,
    data: { dibuat: totalInserted, diperbarui: 0, gagal: 0 },
  }
}
