"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireRole, getCurrentProfile } from "@/lib/session"
import { invalidateDashboardCache, invalidateLaporanCache } from "@/lib/cache"

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

async function generateUniqueNomorBuktiPengeluaranSingle(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  tahun: number
): Promise<string> {
  const prefix = `K-${tahun}-`
  const { data: existing } = await sb
    .from("pengeluaran")
    .select("nomor_bukti")
    .ilike("nomor_bukti", `${prefix}%`)

  const existingSet = new Set<string>()
  let maxSeq = 0

  if (existing) {
    for (const r of existing) {
      if (r.nomor_bukti) {
        existingSet.add(r.nomor_bukti)
        if (r.nomor_bukti.startsWith(prefix)) {
          const num = parseInt(r.nomor_bukti.slice(prefix.length), 10)
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num
          }
        }
      }
    }
  }

  let nextSeq = maxSeq + 1
  let candidate = `${prefix}${String(nextSeq).padStart(5, "0")}`
  while (existingSet.has(candidate)) {
    nextSeq++
    candidate = `${prefix}${String(nextSeq).padStart(5, "0")}`
  }
  return candidate
}

export async function createPengeluaran(input: PengeluaranInput): Promise<ActionResult> {
  const profile = await requireRole(["OPERATOR", "ADMIN"])
  const sb = await createClient()

  // Generate nomor bukti unik
  const tahun = new Date(input.tanggal).getFullYear()
  const nomorData = await generateUniqueNomorBuktiPengeluaranSingle(sb, tahun)

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

export async function countDraftPengeluaran(): Promise<number> {
  await requireRole(["ADMIN"])
  const sb = await createClient()
  const { count } = await sb.from("pengeluaran").select("id", { count: "exact", head: true }).eq("status", "draft")
  return count ?? 0
}

export async function countDraftAndVerifiedPengeluaran(): Promise<number> {
  await requireRole(["ADMIN"])
  const sb = await createClient()
  const { count } = await sb
    .from("pengeluaran")
    .select("id", { count: "exact", head: true })
    .in("status", ["draft", "verified"])
  return count ?? 0
}

export async function verifyAllDraftPengeluaran(): Promise<ActionResult<{ berhasil: number }>> {
  const profile = await requireRole(["ADMIN"])
  const sb = await createClient()
  const { error, count } = await sb
    .from("pengeluaran")
    .update({ status: "verified", verified_by: profile.id, verified_at: new Date().toISOString() })
    .eq("status", "draft")
  if (error) return { ok: false, pesan: error.message }
  await invalidateDashboardCache()
  revalidatePath("/pengeluaran")
  return { ok: true, data: { berhasil: count ?? 0 } }
}

export async function deleteAllPengeluaran(): Promise<ActionResult<{ berhasil: number }>> {
  await requireRole(["ADMIN"])
  const sb = await createClient()
  const { error, count } = await sb
    .from("pengeluaran")
    .delete({ count: "exact" })
    .in("status", ["draft", "verified"])

  if (error) return { ok: false, pesan: error.message }
  await invalidateDashboardCache()
  revalidatePath("/pengeluaran")
  revalidatePath("/dashboard")
  return { ok: true, data: { berhasil: count ?? 0 } }
}

export async function exportPengeluaran(filter: Omit<PengeluaranFilter, "page">) {
  await requireRole(["ADMIN", "OPERATOR", "PIMPINAN"])
  const sb = await createClient()

  let q = sb.from("pengeluaran").select(`
    tanggal, jumlah, uraian, nomor_bukti,
    unit:unit_kerja(kode),
    rekening:rekening_bank(kode),
    jenis:jenis_pengeluaran(kode)
  `)

  if (filter.statuses?.length) q = q.in("status", filter.statuses)
  else if (filter.status) q = q.eq("status", filter.status)
  if (filter.tgl_awal)    q = q.gte("tanggal", filter.tgl_awal)
  if (filter.tgl_akhir)   q = q.lte("tanggal", filter.tgl_akhir)
  if (filter.unit_id)     q = q.eq("unit_kerja_id", filter.unit_id)
  if (filter.rekening_id) q = q.eq("rekening_bank_id", filter.rekening_id)
  if (filter.q)           q = q.ilike("nomor_bukti", `%${filter.q}%`)

  const sortCol = filter.sort ?? "tanggal"
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
    const unit  = resolve(r.unit)     as { kode?: string } | null
    const rek   = resolve(r.rekening) as { kode?: string } | null
    const jenis = resolve(r.jenis)    as { kode?: string } | null

    return {
      tanggal:       r.tanggal ?? "",
      kode_unit:     unit?.kode ?? "",
      kode_rekening: rek?.kode ?? "",
      kode_jenis:    jenis?.kode ?? "",
      jumlah:        Number(r.jumlah),
      nomor_bukti:   r.nomor_bukti ?? "",
      uraian:        r.uraian ?? "",
    }
  })

  return { ok: true as const, rows }
}

export async function exportPengeluaranDetail(filter: Omit<PengeluaranFilter, "page">) {
  await requireRole(["ADMIN", "OPERATOR", "PIMPINAN"])
  const sb = await createClient()

  let q = sb.from("pengeluaran").select(`
    nomor_bukti, tanggal, jumlah, uraian, status, verified_at, voided_at,
    jenis:jenis_pengeluaran(kode, nama, kategori:kategori_pengeluaran(kode, nama)),
    unit:unit_kerja(kode, nama),
    rekening:rekening_bank(kode, nama_bank, nama_rekening, nomor_rekening),
    creator:profiles!pengeluaran_created_by_fkey(nama_lengkap),
    verifier:profiles!pengeluaran_verified_by_fkey(nama_lengkap),
    voider:profiles!pengeluaran_voided_by_fkey(nama_lengkap)
  `)

  if (filter.statuses?.length) q = q.in("status", filter.statuses)
  else if (filter.status) q = q.eq("status", filter.status)
  if (filter.tgl_awal)    q = q.gte("tanggal", filter.tgl_awal)
  if (filter.tgl_akhir)   q = q.lte("tanggal", filter.tgl_akhir)
  if (filter.unit_id)     q = q.eq("unit_kerja_id", filter.unit_id)
  if (filter.rekening_id) q = q.eq("rekening_bank_id", filter.rekening_id)
  if (filter.q)           q = q.ilike("nomor_bukti", `%${filter.q}%`)

  const sortCol = filter.sort ?? "tanggal"
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = allData.map((r: any) => {
    const jenis    = resolve(r.jenis)    as { kode?: string; nama?: string; kategori?: { kode?: string; nama?: string } | { kode?: string; nama?: string }[] | null } | null
    const kategori = resolve(jenis?.kategori) as { kode?: string; nama?: string } | null
    const unit     = resolve(r.unit)     as { kode?: string; nama?: string } | null
    const rek      = resolve(r.rekening) as { kode?: string; nama_bank?: string; nama_rekening?: string; nomor_rekening?: string } | null
    const creator  = resolve(r.creator)  as { nama_lengkap?: string } | null
    const verifier = resolve(r.verifier) as { nama_lengkap?: string } | null
    const voider   = resolve(r.voider)   as { nama_lengkap?: string } | null

    return {
      "Nomor Bukti":           r.nomor_bukti ?? "",
      "Tanggal":               formatDate(r.tanggal),
      "Status":                r.status === "verified" ? "Terverifikasi" : r.status === "draft" ? "Draft" : r.status === "void" ? "Dibatalkan" : r.status ?? "",
      "Jumlah (Rp)":           Number(r.jumlah),
      "Uraian / Keterangan":   r.uraian          ?? "",
      "Kategori Pengeluaran":  kategori ? `[${kategori.kode ?? ""}] ${kategori.nama ?? ""}` : "",
      "Jenis Pengeluaran":     jenis ? `[${jenis.kode ?? ""}] ${jenis.nama ?? ""}` : "",
      "Unit Kerja":            unit ? `[${unit.kode ?? ""}] ${unit.nama ?? ""}` : "",
      "Bank & Rekening":       rek ? `${rek.nama_bank ?? ""} - ${rek.nomor_rekening ?? ""} (${rek.nama_rekening ?? ""})` : "",
      "Dibuat Oleh":           creator?.nama_lengkap ?? "",
      "Diverifikasi Oleh":     verifier?.nama_lengkap ?? "",
      "Waktu Verifikasi":      formatDateTime(r.verified_at),
      "Dibatalkan Oleh":       voider?.nama_lengkap ?? "",
      "Waktu Dibatalkan":      formatDateTime(r.voided_at),
    }
  })

  return { ok: true as const, rows }
}

