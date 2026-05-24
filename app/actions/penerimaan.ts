"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireRole, getCurrentProfile } from "@/lib/session"

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; pesan: string }

export type PenerimaanFilter = {
  status?: "draft" | "verified" | "void"
  tgl_awal?: string
  tgl_akhir?: string
  jenis_id?: string
  unit_id?: string
  rekening_id?: string
  q?: string
  page?: number
  sort?: "tanggal_terima" | "jumlah" | "nomor_bukti"
  order?: "asc" | "desc"
}

export async function listPenerimaan(filter: PenerimaanFilter = {}) {
  const profile = await getCurrentProfile()
  if (!profile) return { data: [], count: 0 }

  const sb = await createClient()
  const limit = 20
  const offset = ((filter.page ?? 1) - 1) * limit

  let q = sb.from("penerimaan").select(`
    id, nomor_bukti, tanggal_terima, tanggal_setor, jumlah, nomor_referensi, uraian, status,
    jenis:jenis_pendapatan(kode, nama),
    sub:sub_pendapatan(kode, nama),
    unit:unit_kerja(kode, nama),
    rekening:rekening_bank(kode, nama_bank, nama_rekening),
    metode:jenis_pemindahan_kas(kode, nama),
    creator:profiles!penerimaan_created_by_fkey(nama_lengkap),
    verified_at, voided_at
  `, { count: "exact" })

  if (filter.status) q = q.eq("status", filter.status)
  if (filter.tgl_awal) q = q.gte("tanggal_terima", filter.tgl_awal)
  if (filter.tgl_akhir) q = q.lte("tanggal_terima", filter.tgl_akhir)
  if (filter.jenis_id) q = q.eq("jenis_pendapatan_id", filter.jenis_id)
  if (filter.unit_id) q = q.eq("unit_kerja_id", filter.unit_id)
  if (filter.rekening_id) q = q.eq("rekening_bank_id", filter.rekening_id)
  if (filter.q) q = q.ilike("nomor_bukti", `%${filter.q}%`)

  const sortCol = filter.sort ?? "tanggal_terima"
  const ascending = filter.order === "asc"
  q = q.order(sortCol, { ascending }).range(offset, offset + limit - 1)

  const { data, error, count } = await q
  if (error) return { data: [], count: 0 }
  return { data: data ?? [], count: count ?? 0 }
}

export async function getPenerimaan(id: string) {
  const profile = await getCurrentProfile()
  if (!profile) return null

  const sb = await createClient()
  const { data, error } = await sb.from("penerimaan").select(`
    *,
    jenis:jenis_pendapatan(id, kode, nama, kategori:kategori_pendapatan(id, kode, nama)),
    sub:sub_pendapatan(id, kode, nama),
    unit:unit_kerja(id, kode, nama),
    rekening:rekening_bank(id, kode, nama_bank, nama_rekening),
    metode:jenis_pemindahan_kas(id, kode, nama),
    creator:profiles!penerimaan_created_by_fkey(id, nama_lengkap),
    verifier:profiles!penerimaan_verified_by_fkey(nama_lengkap),
    voider:profiles!penerimaan_voided_by_fkey(nama_lengkap)
  `).eq("id", id).single()

  if (error) return null
  return data
}

export type PenerimaanInput = {
  tanggal_terima: string
  tanggal_setor?: string
  jenis_pendapatan_id: string
  sub_pendapatan_id?: string
  unit_kerja_id: string
  rekening_bank_id: string
  jenis_pemindahan_kas_id: string
  jumlah: number
  nomor_referensi?: string
  uraian?: string
}

export async function createPenerimaan(input: PenerimaanInput): Promise<ActionResult> {
  const profile = await requireRole(["OPERATOR", "ADMIN"])
  const sb = await createClient()

  // Generate nomor bukti atomic
  const tahun = new Date(input.tanggal_terima).getFullYear()
  const { data: nomorData, error: nomorError } = await sb.rpc("fn_generate_nomor_bukti", { p_tahun: tahun })
  if (nomorError) return { ok: false, pesan: "Gagal generate nomor bukti" }

  const { error } = await sb.from("penerimaan").insert({
    ...input,
    nomor_bukti: nomorData,
    sub_pendapatan_id: input.sub_pendapatan_id || null,
    tanggal_setor: input.tanggal_setor || null,
    nomor_referensi: input.nomor_referensi || null,
    uraian: input.uraian || null,
    status: "draft",
    created_by: profile.id,
    updated_by: profile.id,
  })

  if (error) return { ok: false, pesan: error.message }
  revalidatePath("/penerimaan")
  return { ok: true, data: undefined }
}

export async function updatePenerimaan(id: string, input: PenerimaanInput): Promise<ActionResult> {
  const profile = await requireRole(["OPERATOR", "ADMIN"])
  const sb = await createClient()

  if (profile.role.kode !== "ADMIN") {
    const { data: existing } = await sb.from("penerimaan").select("status, created_by").eq("id", id).single()
    if (!existing) return { ok: false, pesan: "Penerimaan tidak ditemukan" }
    if (existing.status !== "draft") return { ok: false, pesan: "Hanya draft yang dapat diubah" }
    if (existing.created_by !== profile.id) return { ok: false, pesan: "Tidak diizinkan mengubah data milik pengguna lain" }
  }

  const { error } = await sb.from("penerimaan").update({
    ...input,
    sub_pendapatan_id: input.sub_pendapatan_id || null,
    tanggal_setor: input.tanggal_setor || null,
    nomor_referensi: input.nomor_referensi || null,
    uraian: input.uraian || null,
    updated_by: profile.id,
  }).eq("id", id).eq("status", "draft")

  if (error) return { ok: false, pesan: error.message }
  revalidatePath("/penerimaan")
  revalidatePath(`/penerimaan/${id}`)
  return { ok: true, data: undefined }
}

export async function deletePenerimaan(id: string): Promise<ActionResult> {
  const profile = await requireRole(["OPERATOR", "ADMIN"])
  const sb = await createClient()
  let q = sb.from("penerimaan").delete().eq("id", id)
  if (profile.role.kode !== "ADMIN") {
    q = q.eq("status", "draft").eq("created_by", profile.id)
  }
  const { error } = await q
  if (error) return { ok: false, pesan: error.message }
  revalidatePath("/penerimaan")
  return { ok: true, data: undefined }
}

export async function verifyPenerimaan(id: string): Promise<ActionResult> {
  const profile = await requireRole(["ADMIN"])
  const sb = await createClient()
  const { error } = await sb.rpc("fn_verify_penerimaan", { p_id: id, p_user: profile.id })
  if (error) return { ok: false, pesan: error.message }
  revalidatePath("/penerimaan")
  revalidatePath(`/penerimaan/${id}`)
  return { ok: true, data: undefined }
}

export async function bulkDeletePenerimaan(ids: string[]): Promise<ActionResult<{ berhasil: number; gagal: number }>> {
  await requireRole(["ADMIN"])
  if (ids.length === 0) return { ok: false, pesan: "Tidak ada transaksi dipilih" }
  if (ids.length > 100) return { ok: false, pesan: "Maksimal 100 transaksi sekaligus" }
  const sb = await createClient()
  const { error, count } = await sb.from("penerimaan").delete({ count: "exact" }).in("id", ids)
  if (error) return { ok: false, pesan: error.message }
  revalidatePath("/penerimaan")
  return { ok: true, data: { berhasil: count ?? ids.length, gagal: 0 } }
}

export async function bulkVerifyPenerimaan(ids: string[]): Promise<ActionResult<{ berhasil: number; gagal: number }>> {
  const profile = await requireRole(["ADMIN"])
  if (ids.length === 0) return { ok: false, pesan: "Tidak ada transaksi dipilih" }
  if (ids.length > 100) return { ok: false, pesan: "Maksimal 100 transaksi sekaligus" }
  const sb = await createClient()
  const results = await Promise.all(
    ids.map((id) => sb.rpc("fn_verify_penerimaan", { p_id: id, p_user: profile.id }))
  )
  const berhasil = results.filter((r) => !r.error).length
  const gagal = results.filter((r) => !!r.error).length
  revalidatePath("/penerimaan")
  return { ok: true, data: { berhasil, gagal } }
}

export async function voidPenerimaan(id: string, alasan: string): Promise<ActionResult> {
  const profile = await requireRole(["ADMIN"])
  if (!alasan.trim()) return { ok: false, pesan: "Alasan void wajib diisi" }
  const sb = await createClient()
  const { error } = await sb.rpc("fn_void_penerimaan", { p_id: id, p_user: profile.id, p_alasan: alasan })
  if (error) return { ok: false, pesan: error.message }
  revalidatePath("/penerimaan")
  revalidatePath(`/penerimaan/${id}`)
  return { ok: true, data: undefined }
}
