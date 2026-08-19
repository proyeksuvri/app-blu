"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireRole, getCurrentProfile } from "@/lib/session"
import { invalidateDashboardCache, invalidateLaporanCache } from "@/lib/cache"

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; pesan: string }

export type PenerimaanFilter = {
  status?: "draft" | "verified" | "void"
  statuses?: string[]
  tahun?: number
  bulan?: number
  tgl_awal?: string
  tgl_akhir?: string
  jenis_id?: string
  jenis_ids?: string[]
  sub_id?: string
  sub_ids?: string[]
  unit_id?: string
  rekening_id?: string
  q?: string
  page?: number
  limit?: number
  sort?: "tanggal_terima" | "jumlah" | "nomor_bukti"
  order?: "asc" | "desc"
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyDateFilterPenerimaan(query: any, filter: PenerimaanFilter) {
  let q = query
  if (filter.tgl_awal) {
    q = q.gte("tanggal_terima", filter.tgl_awal)
  } else if (filter.tahun && filter.bulan) {
    q = q.gte("tanggal_terima", `${filter.tahun}-${String(filter.bulan).padStart(2, "0")}-01`)
  } else if (filter.bulan) {
    const yr = filter.tahun ?? new Date().getFullYear()
    q = q.gte("tanggal_terima", `${yr}-${String(filter.bulan).padStart(2, "0")}-01`)
  } else if (filter.tahun) {
    q = q.gte("tanggal_terima", `${filter.tahun}-01-01`)
  }

  if (filter.tgl_akhir) {
    q = q.lte("tanggal_terima", filter.tgl_akhir)
  } else if (filter.tahun && filter.bulan) {
    const days = new Date(filter.tahun, filter.bulan, 0).getDate()
    q = q.lte("tanggal_terima", `${filter.tahun}-${String(filter.bulan).padStart(2, "0")}-${String(days).padStart(2, "0")}`)
  } else if (filter.bulan) {
    const yr = filter.tahun ?? new Date().getFullYear()
    const days = new Date(yr, filter.bulan, 0).getDate()
    q = q.lte("tanggal_terima", `${yr}-${String(filter.bulan).padStart(2, "0")}-${String(days).padStart(2, "0")}`)
  } else if (filter.tahun) {
    q = q.lte("tanggal_terima", `${filter.tahun}-12-31`)
  }
  return q
}

export async function listPenerimaan(filter: PenerimaanFilter = {}) {
  const profile = await getCurrentProfile()
  if (!profile) return { data: [], count: 0 }

  const sb = await createClient()
  const limit = [25, 50, 100].includes(filter.limit ?? 0) ? filter.limit! : 25
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

  if (filter.statuses?.length) q = q.in("status", filter.statuses)
  else if (filter.status) q = q.eq("status", filter.status)
  q = applyDateFilterPenerimaan(q, filter)
  if (filter.jenis_ids?.length) q = q.in("jenis_pendapatan_id", filter.jenis_ids)
  else if (filter.jenis_id) q = q.eq("jenis_pendapatan_id", filter.jenis_id)
  if (filter.sub_ids?.length) q = q.in("sub_pendapatan_id", filter.sub_ids)
  else if (filter.sub_id) q = q.eq("sub_pendapatan_id", filter.sub_id)
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
  await invalidateDashboardCache()
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
  await invalidateDashboardCache()
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
  await invalidateDashboardCache()
  revalidatePath("/penerimaan")
  return { ok: true, data: undefined }
}

export async function verifyPenerimaan(id: string): Promise<ActionResult> {
  const profile = await requireRole(["ADMIN"])
  const sb = await createClient()
  const { error } = await sb.rpc("fn_verify_penerimaan", { p_id: id, p_user: profile.id })
  if (error) return { ok: false, pesan: error.message }
  await invalidateDashboardCache()
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
  await invalidateDashboardCache()
  revalidatePath("/penerimaan")
  return { ok: true, data: { berhasil: count ?? ids.length, gagal: 0 } }
}

export async function deleteAllPenerimaan(): Promise<ActionResult<{ berhasil: number }>> {
  await requireRole(["ADMIN"])
  const sb = await createClient()
  const { error, count } = await sb
    .from("penerimaan")
    .delete({ count: "exact" })
    .in("status", ["draft", "verified"])

  if (error) return { ok: false, pesan: error.message }
  await invalidateDashboardCache()
  revalidatePath("/penerimaan")
  revalidatePath("/dashboard")
  return { ok: true, data: { berhasil: count ?? 0 } }
}

export async function bulkVerifyPenerimaan(ids: string[]): Promise<ActionResult<{ berhasil: number; gagal: number }>> {
  const profile = await requireRole(["ADMIN"])
  if (ids.length === 0) return { ok: false, pesan: "Tidak ada transaksi dipilih" }
  if (ids.length > 2000) return { ok: false, pesan: "Maksimal 2000 transaksi sekaligus" }
  const sb = await createClient()
  const { error, count } = await sb
    .from("penerimaan")
    .update({ status: "verified", verified_by: profile.id, verified_at: new Date().toISOString() })
    .in("id", ids)
    .eq("status", "draft")
  if (error) return { ok: false, pesan: error.message }
  await invalidateDashboardCache()
  revalidatePath("/penerimaan")
  return { ok: true, data: { berhasil: count ?? ids.length, gagal: 0 } }
}

export async function exportPenerimaan(filter: Omit<PenerimaanFilter, "page">) {
  await requireRole(["ADMIN", "OPERATOR", "PIMPINAN"])
  const sb = await createClient()

  let q = sb.from("penerimaan").select(`
    tanggal_terima, nomor_referensi, jumlah, uraian,
    jenis:jenis_pendapatan(kode, kategori:kategori_pendapatan(kode)),
    sub:sub_pendapatan(kode),
    unit:unit_kerja(kode),
    rekening:rekening_bank(kode),
    metode:jenis_pemindahan_kas(kode)
  `)

  if (filter.statuses?.length) q = q.in("status", filter.statuses)
  else if (filter.status) q = q.eq("status", filter.status)
  q = applyDateFilterPenerimaan(q, filter as PenerimaanFilter)
  if (filter.jenis_ids?.length) q = q.in("jenis_pendapatan_id", filter.jenis_ids)
  else if (filter.jenis_id) q = q.eq("jenis_pendapatan_id", filter.jenis_id)
  if (filter.unit_id)     q = q.eq("unit_kerja_id", filter.unit_id)
  if (filter.rekening_id) q = q.eq("rekening_bank_id", filter.rekening_id)
  if (filter.q)           q = q.ilike("nomor_bukti", `%${filter.q}%`)

  const sortCol = filter.sort ?? "tanggal_terima"
  q = q.order(sortCol, { ascending: filter.order === "asc" })

  // Fetch semua baris dalam batch 1000 (Supabase default cap)
  const BATCH = 1000
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allData: any[] = []
  let offset = 0
  while (true) {
    const { data: batch, error } = await q.range(offset, offset + BATCH - 1)
    if (error) return { ok: false as const, pesan: error.message }
    if (!batch || batch.length === 0) break
    allData.push(...batch)
    if (batch.length < BATCH) break
    offset += BATCH
  }

  const resolve = <T>(v: T | T[] | null | undefined): T | null =>
    v == null ? null : Array.isArray(v) ? (v[0] ?? null) : v

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = allData.map((r: any) => {
    const jenis    = resolve(r.jenis)    as { kode?: string; kategori?: { kode?: string } | { kode?: string }[] | null } | null
    const kategori = resolve(jenis?.kategori) as { kode?: string } | null
    const sub      = resolve(r.sub)      as { kode?: string } | null
    const unit     = resolve(r.unit)     as { kode?: string } | null
    const rek      = resolve(r.rekening) as { kode?: string } | null
    const met      = resolve(r.metode)   as { kode?: string } | null

    // Format tanggal ke DD-MM-YYYY
    const tgl = r.tanggal_terima
      ? new Date(r.tanggal_terima).toLocaleDateString("id-ID", {
          day: "2-digit", month: "2-digit", year: "numeric",
        })
      : ""

    return {
      tanggal_transaksi: tgl,
      kode_kategori:     kategori?.kode  ?? "",
      kode_jenis:        jenis?.kode     ?? "",
      kode_sub:          sub?.kode       ?? "",
      kode_unit:         unit?.kode      ?? "",
      kode_rekening:     rek?.kode       ?? "",
      kode_metode:       met?.kode       ?? "",
      jumlah:            Number(r.jumlah),
      nomor_bukti:       r.nomor_referensi ?? "",
      uraian:            r.uraian          ?? "",
    }
  })

  return { ok: true as const, rows }
}

export async function countDraft(): Promise<number> {
  const sb = await createClient()
  const { count } = await sb.from("penerimaan").select("id", { count: "exact", head: true }).eq("status", "draft")
  return count ?? 0
}

export async function countDraftAndVerified(): Promise<number> {
  await requireRole(["ADMIN"])
  const sb = await createClient()
  const { count } = await sb
    .from("penerimaan")
    .select("id", { count: "exact", head: true })
    .in("status", ["draft", "verified"])
  return count ?? 0
}

export async function verifyAllDraft(): Promise<ActionResult<{ berhasil: number }>> {
  const profile = await requireRole(["ADMIN"])
  const sb = await createClient()
  const { error, count } = await sb
    .from("penerimaan")
    .update({ status: "verified", verified_by: profile.id, verified_at: new Date().toISOString() })
    .eq("status", "draft")
  if (error) return { ok: false, pesan: error.message }
  await invalidateDashboardCache()
  revalidatePath("/penerimaan")
  return { ok: true, data: { berhasil: count ?? 0 } }
}

export async function voidPenerimaan(id: string, alasan: string): Promise<ActionResult> {
  const profile = await requireRole(["ADMIN"])
  if (!alasan.trim()) return { ok: false, pesan: "Alasan void wajib diisi" }
  const sb = await createClient()
  const { error } = await sb.rpc("fn_void_penerimaan", { p_id: id, p_user: profile.id, p_alasan: alasan })
  if (error) return { ok: false, pesan: error.message }
  await invalidateDashboardCache()
  revalidatePath("/penerimaan")
  revalidatePath(`/penerimaan/${id}`)
  return { ok: true, data: undefined }
}

export async function unverifyPenerimaan(id: string): Promise<ActionResult> {
  const profile = await requireRole(["ADMIN"])
  const sb = await createClient()
  const { data: existing } = await sb.from("penerimaan").select("status").eq("id", id).single()
  if (!existing) return { ok: false, pesan: "Penerimaan tidak ditemukan" }
  if (existing.status !== "verified") return { ok: false, pesan: "Hanya transaksi terverifikasi yang dapat dikembalikan ke draft" }
  const { error } = await sb
    .from("penerimaan")
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
  revalidatePath("/penerimaan")
  revalidatePath(`/penerimaan/${id}`)
  return { ok: true, data: undefined }
}

export async function bulkUnverifyPenerimaan(ids: string[]): Promise<ActionResult<{ berhasil: number; gagal: number }>> {
  const profile = await requireRole(["ADMIN"])
  if (ids.length === 0) return { ok: false, pesan: "Tidak ada transaksi dipilih" }
  if (ids.length > 100) return { ok: false, pesan: "Maksimal 100 transaksi sekaligus" }
  const sb = await createClient()
  const { error, count } = await sb
    .from("penerimaan")
    .update({ status: "draft", verified_by: null, verified_at: null, updated_by: profile.id })
    .in("id", ids)
    .eq("status", "verified")
  if (error) return { ok: false, pesan: error.message }
  await invalidateDashboardCache()
  revalidatePath("/penerimaan")
  return { ok: true, data: { berhasil: count ?? ids.length, gagal: 0 } }
}

export async function exportPenerimaanDetail(filter: Omit<PenerimaanFilter, "page">) {
  await requireRole(["ADMIN", "OPERATOR", "PIMPINAN"])
  const sb = await createClient()

  let q = sb.from("penerimaan").select(`
    nomor_bukti, tanggal_terima, tanggal_setor, jumlah, nomor_referensi, uraian, status, verified_at, voided_at,
    jenis:jenis_pendapatan(kode, nama, kategori:kategori_pendapatan(kode, nama)),
    sub:sub_pendapatan(kode, nama),
    unit:unit_kerja(kode, nama),
    rekening:rekening_bank(kode, nama_bank, nama_rekening, nomor_rekening),
    metode:jenis_pemindahan_kas(kode, nama),
    creator:profiles!penerimaan_created_by_fkey(nama_lengkap),
    verifier:profiles!penerimaan_verified_by_fkey(nama_lengkap),
    voider:profiles!penerimaan_voided_by_fkey(nama_lengkap)
  `)

  if (filter.statuses?.length) q = q.in("status", filter.statuses)
  else if (filter.status) q = q.eq("status", filter.status)
  q = applyDateFilterPenerimaan(q, filter as PenerimaanFilter)
  if (filter.jenis_ids?.length) q = q.in("jenis_pendapatan_id", filter.jenis_ids)
  else if (filter.jenis_id) q = q.eq("jenis_pendapatan_id", filter.jenis_id)
  if (filter.unit_id)     q = q.eq("unit_kerja_id", filter.unit_id)
  if (filter.rekening_id) q = q.eq("rekening_bank_id", filter.rekening_id)
  if (filter.q)           q = q.ilike("nomor_bukti", `%${filter.q}%`)

  const sortCol = filter.sort ?? "tanggal_terima"
  q = q.order(sortCol, { ascending: filter.order === "asc" })

  const BATCH = 1000
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allData: any[] = []
  let offset = 0
  while (true) {
    const { data: batch, error } = await q.range(offset, offset + BATCH - 1)
    if (error) return { ok: false as const, pesan: error.message }
    if (!batch || batch.length === 0) break
    allData.push(...batch)
    if (batch.length < BATCH) break
    offset += BATCH
  }

  const resolve = <T>(v: T | T[] | null | undefined): T | null =>
    v == null ? null : Array.isArray(v) ? (v[0] ?? null) : v

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = allData.map((r: any) => {
    const jenis    = resolve(r.jenis)    as { kode?: string; nama?: string; kategori?: { kode?: string; nama?: string } | { kode?: string; nama?: string }[] | null } | null
    const kategori = resolve(jenis?.kategori) as { kode?: string; nama?: string } | null
    const sub      = resolve(r.sub)      as { kode?: string; nama?: string } | null
    const unit     = resolve(r.unit)     as { kode?: string; nama?: string } | null
    const rek      = resolve(r.rekening) as { kode?: string; nama_bank?: string; nama_rekening?: string; nomor_rekening?: string } | null
    const met      = resolve(r.metode)   as { kode?: string; nama?: string } | null
    const creator  = resolve(r.creator)  as { nama_lengkap?: string } | null
    const verifier = resolve(r.verifier) as { nama_lengkap?: string } | null
    const voider   = resolve(r.voider)   as { nama_lengkap?: string } | null

    const formatDate = (dStr: string | null | undefined) => {
      if (!dStr) return ""
      try {
        return new Date(dStr).toLocaleDateString("id-ID", {
          day: "2-digit", month: "2-digit", year: "numeric",
        })
      } catch {
        return dStr
      }
    }

    const formatDateTime = (dStr: string | null | undefined) => {
      if (!dStr) return ""
      try {
        return new Date(dStr).toLocaleString("id-ID", {
          day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
        })
      } catch {
        return dStr
      }
    }

    return {
      "Nomor Bukti":           r.nomor_bukti ?? "",
      "Tanggal Terima":         formatDate(r.tanggal_terima),
      "Tanggal Setor":          formatDate(r.tanggal_setor),
      "Status":                 r.status === "verified" ? "Terverifikasi" : r.status === "draft" ? "Draft" : r.status === "void" ? "Dibatalkan" : r.status ?? "",
      "Jumlah (Rp)":            Number(r.jumlah),
      "Nomor Referensi":       r.nomor_referensi ?? "",
      "Uraian / Keterangan":   r.uraian          ?? "",
      "Kategori Pendapatan":   kategori ? `[${kategori.kode ?? ""}] ${kategori.nama ?? ""}` : "",
      "Jenis Pendapatan":      jenis ? `[${jenis.kode ?? ""}] ${jenis.nama ?? ""}` : "",
      "Sub Pendapatan":        sub ? `[${sub.kode ?? ""}] ${sub.nama ?? ""}` : "",
      "Unit Kerja":            unit ? `[${unit.kode ?? ""}] ${unit.nama ?? ""}` : "",
      "Bank & Rekening":       rek ? `${rek.nama_bank ?? ""} - ${rek.nomor_rekening ?? ""} (${rek.nama_rekening ?? ""})` : "",
      "Metode Pemindahan Kas": met ? `[${met.kode ?? ""}] ${met.nama ?? ""}` : "",
      "Dibuat Oleh":           creator?.nama_lengkap ?? "",
      "Diverifikasi Oleh":     verifier?.nama_lengkap ?? "",
      "Waktu Verifikasi":      formatDateTime(r.verified_at),
      "Dibatalkan Oleh":       voider?.nama_lengkap ?? "",
      "Waktu Dibatalkan":      formatDateTime(r.voided_at),
    }
  })

  return { ok: true as const, rows }
}




