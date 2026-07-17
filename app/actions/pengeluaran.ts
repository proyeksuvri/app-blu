"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireRole, getCurrentProfile } from "@/lib/session"
import { invalidateDashboardCache } from "@/lib/cache"

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; pesan: string }

export type PengeluaranFilter = {
  status?: "draft" | "verified" | "void"
  statuses?: string[]
  tgl_awal?: string
  tgl_akhir?: string
  unit_id?: string
  rekening_id?: string
  q?: string
  page?: number
  limit?: number
  sort?: "tanggal" | "jumlah" | "nomor_bukti"
  order?: "asc" | "desc"
}

export async function listPengeluaran(filter: PengeluaranFilter = {}) {
  const profile = await getCurrentProfile()
  if (!profile) return { data: [], count: 0 }

  const sb = await createClient()
  const limit = [25, 50, 100].includes(filter.limit ?? 0) ? filter.limit! : 25
  const offset = ((filter.page ?? 1) - 1) * limit

  let q = sb.from("pengeluaran").select(`
    id, nomor_bukti, tanggal, jumlah, uraian, status,
    unit:unit_kerja(kode, nama),
    rekening:rekening_bank(kode, nama_bank, nama_rekening),
    jenis:jenis_pengeluaran(kode, nama, kategori:kategori_pengeluaran(nama)),
    creator:profiles!pengeluaran_created_by_fkey(nama_lengkap),
    verified_at, voided_at
  `, { count: "exact" })

  if (filter.statuses?.length) q = q.in("status", filter.statuses)
  else if (filter.status) q = q.eq("status", filter.status)
  if (filter.tgl_awal) q = q.gte("tanggal", filter.tgl_awal)
  if (filter.tgl_akhir) q = q.lte("tanggal", filter.tgl_akhir)
  if (filter.unit_id) q = q.eq("unit_kerja_id", filter.unit_id)
  if (filter.rekening_id) q = q.eq("rekening_bank_id", filter.rekening_id)
  if (filter.q) q = q.ilike("nomor_bukti", `%${filter.q}%`)

  const sortCol = filter.sort ?? "tanggal"
  const ascending = filter.order === "asc"
  q = q.order(sortCol, { ascending }).range(offset, offset + limit - 1)

  const { data, error, count } = await q
  if (error) return { data: [], count: 0 }
  return { data: data ?? [], count: count ?? 0 }
}

export async function getPengeluaran(id: string) {
  const profile = await getCurrentProfile()
  if (!profile) return null

  const sb = await createClient()
  const { data, error } = await sb.from("pengeluaran").select(`
    *,
    unit:unit_kerja(id, kode, nama),
    rekening:rekening_bank(id, kode, nama_bank, nama_rekening),
    jenis:jenis_pengeluaran(id, kode, nama, kategori:kategori_pengeluaran(id, nama)),
    creator:profiles!pengeluaran_created_by_fkey(id, nama_lengkap),
    verifier:profiles!pengeluaran_verified_by_fkey(nama_lengkap),
    voider:profiles!pengeluaran_voided_by_fkey(nama_lengkap)
  `).eq("id", id).single()

  if (error) return null
  return data
}

export type PengeluaranInput = {
  tanggal: string
  unit_kerja_id?: string
  rekening_bank_id: string
  jenis_pengeluaran_id?: string
  jumlah: number
  uraian: string
}

export async function createPengeluaran(input: PengeluaranInput): Promise<ActionResult> {
  const profile = await requireRole(["OPERATOR", "ADMIN"])
  const sb = await createClient()

  // Generate nomor bukti
  const tahun = new Date(input.tanggal).getFullYear()
  const { data: nomorData, error: nomorError } = await sb.rpc("fn_generate_nomor_bukti_pengeluaran", { p_tahun: tahun })
  if (nomorError) return { ok: false, pesan: "Gagal generate nomor bukti: " + nomorError.message }

  const { error } = await sb.from("pengeluaran").insert({
    ...input,
    nomor_bukti: nomorData,
    unit_kerja_id: input.unit_kerja_id || null,
    status: "draft",
    created_by: profile.id,
    updated_by: profile.id,
  })

  if (error) return { ok: false, pesan: error.message }
  await invalidateDashboardCache()
  revalidatePath("/pengeluaran")
  return { ok: true, data: undefined }
}

export async function updatePengeluaran(id: string, input: PengeluaranInput): Promise<ActionResult> {
  const profile = await requireRole(["OPERATOR", "ADMIN"])
  const sb = await createClient()

  if (profile.role.kode !== "ADMIN") {
    const { data: existing } = await sb.from("pengeluaran").select("status, created_by").eq("id", id).single()
    if (!existing) return { ok: false, pesan: "Pengeluaran tidak ditemukan" }
    if (existing.status !== "draft") return { ok: false, pesan: "Hanya draft yang dapat diubah" }
    if (existing.created_by !== profile.id) return { ok: false, pesan: "Tidak diizinkan mengubah data milik pengguna lain" }
  }

  const { error } = await sb.from("pengeluaran").update({
    ...input,
    unit_kerja_id: input.unit_kerja_id || null,
    updated_by: profile.id,
  }).eq("id", id).eq("status", "draft")

  if (error) return { ok: false, pesan: error.message }
  await invalidateDashboardCache()
  revalidatePath("/pengeluaran")
  revalidatePath(`/pengeluaran/${id}`)
  return { ok: true, data: undefined }
}

export async function deletePengeluaran(id: string): Promise<ActionResult> {
  const profile = await requireRole(["OPERATOR", "ADMIN"])
  const sb = await createClient()
  let q = sb.from("pengeluaran").delete().eq("id", id)
  if (profile.role.kode !== "ADMIN") {
    q = q.eq("status", "draft").eq("created_by", profile.id)
  }
  const { error } = await q
  if (error) return { ok: false, pesan: error.message }
  await invalidateDashboardCache()
  revalidatePath("/pengeluaran")
  return { ok: true, data: undefined }
}

export async function verifyPengeluaran(id: string): Promise<ActionResult> {
  const profile = await requireRole(["ADMIN"])
  const sb = await createClient()
  
  const { error } = await sb
    .from("pengeluaran")
    .update({ 
      status: "verified", 
      verified_by: profile.id, 
      verified_at: new Date().toISOString() 
    })
    .eq("id", id)
    .eq("status", "draft")
    
  if (error) return { ok: false, pesan: error.message }
  
  await invalidateDashboardCache()
  revalidatePath("/pengeluaran")
  revalidatePath(`/pengeluaran/${id}`)
  return { ok: true, data: undefined }
}

export async function unverifyPengeluaran(id: string): Promise<ActionResult> {
  const profile = await requireRole(["ADMIN"])
  const sb = await createClient()
  const { data: existing } = await sb.from("pengeluaran").select("status").eq("id", id).single()
  if (!existing) return { ok: false, pesan: "Pengeluaran tidak ditemukan" }
  if (existing.status !== "verified") return { ok: false, pesan: "Hanya transaksi terverifikasi yang dapat dikembalikan ke draft" }
  const { error } = await sb
    .from("pengeluaran")
    .update({
      status: "draft",
      verified_by: null,
      verified_at: null,
      updated_by: profile.id,
    })
    .eq("id", id)
    .eq("status", "verified")
  if (error) return { ok: false, pesan: error.message }
  await invalidateDashboardCache()
  revalidatePath("/pengeluaran")
  revalidatePath(`/pengeluaran/${id}`)
  return { ok: true, data: undefined }
}

export async function voidPengeluaran(id: string, alasan: string): Promise<ActionResult> {
  const profile = await requireRole(["ADMIN"])
  if (!alasan.trim()) return { ok: false, pesan: "Alasan void wajib diisi" }
  const sb = await createClient()

  // Ambil data lama
  const { data: existing } = await sb.from("pengeluaran").select("uraian").eq("id", id).single()
  const oldUraian = existing?.uraian || ""
  const newUraian = `[VOID: ${alasan}] ${oldUraian}`.trim()
  
  // Update status ke void
  const { error } = await sb
    .from("pengeluaran")
    .update({ 
      status: "void", 
      voided_by: profile.id, 
      voided_at: new Date().toISOString(),
      uraian: newUraian
    })
    .eq("id", id)
    .in("status", ["draft", "verified"])
    
  if (error) return { ok: false, pesan: error.message }
  
  await invalidateDashboardCache()
  revalidatePath("/pengeluaran")
  revalidatePath(`/pengeluaran/${id}`)
  return { ok: true, data: undefined }
}

export async function bulkDeletePengeluaran(ids: string[]): Promise<ActionResult<{ berhasil: number; gagal: number }>> {
  await requireRole(["ADMIN"])
  if (ids.length === 0) return { ok: false, pesan: "Tidak ada transaksi dipilih" }
  if (ids.length > 100) return { ok: false, pesan: "Maksimal 100 transaksi sekaligus" }
  const sb = await createClient()
  const { error, count } = await sb.from("pengeluaran").delete({ count: "exact" }).in("id", ids)
  if (error) return { ok: false, pesan: error.message }
  await invalidateDashboardCache()
  revalidatePath("/pengeluaran")
  return { ok: true, data: { berhasil: count ?? ids.length, gagal: 0 } }
}

export async function bulkVerifyPengeluaran(ids: string[]): Promise<ActionResult<{ berhasil: number; gagal: number }>> {
  const profile = await requireRole(["ADMIN"])
  if (ids.length === 0) return { ok: false, pesan: "Tidak ada transaksi dipilih" }
  if (ids.length > 2000) return { ok: false, pesan: "Maksimal 2000 transaksi sekaligus" }
  const sb = await createClient()
  const { error, count } = await sb
    .from("pengeluaran")
    .update({ status: "verified", verified_by: profile.id, verified_at: new Date().toISOString() })
    .in("id", ids)
    .eq("status", "draft")
  if (error) return { ok: false, pesan: error.message }
  await invalidateDashboardCache()
  revalidatePath("/pengeluaran")
  return { ok: true, data: { berhasil: count ?? ids.length, gagal: 0 } }
}

export async function bulkUnverifyPengeluaran(ids: string[]): Promise<ActionResult<{ berhasil: number; gagal: number }>> {
  const profile = await requireRole(["ADMIN"])
  if (ids.length === 0) return { ok: false, pesan: "Tidak ada transaksi dipilih" }
  if (ids.length > 100) return { ok: false, pesan: "Maksimal 100 transaksi sekaligus" }
  const sb = await createClient()
  const { error, count } = await sb
    .from("pengeluaran")
    .update({ status: "draft", verified_by: null, verified_at: null, updated_by: profile.id })
    .in("id", ids)
    .eq("status", "verified")
  if (error) return { ok: false, pesan: error.message }
  await invalidateDashboardCache()
  revalidatePath("/pengeluaran")
  return { ok: true, data: { berhasil: count ?? ids.length, gagal: 0 } }
}
