"use server"

import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/session"
import { getRedis } from "@/lib/redis"
import { invalidateDashboardCache } from "@/lib/cache"
import { revalidatePath } from "next/cache"

export type ImportPengeluaranRow = {
  baris: number
  tanggal: string
  kode_unit: string
  kode_rekening: string
  kode_jenis?: string
  jumlah: number
  uraian?: string
}

export type ImportPengeluaranPreviewRow = ImportPengeluaranRow & {
  valid: boolean
  errors: string[]
  unit_id?: string
  rekening_id?: string
  jenis_id?: string
}

type MasterMaps = {
  unit: Record<string, string>
  rek: Record<string, string>
  jenis: Record<string, string>
}

const MASTER_CACHE_KEY = "import:pengeluaran:master_maps"
const MASTER_CACHE_TTL = 3600

async function getMasterMaps(): Promise<MasterMaps> {
  const redis = getRedis()
  if (redis) {
    const cached = await redis.get<MasterMaps>(MASTER_CACHE_KEY)
    if (cached) return cached
  }

  const sb = await createClient()
  const [unit, rekening, jenis] = await Promise.all([
    sb.from("unit_kerja").select("id, kode").eq("is_active", true),
    sb.from("rekening_bank").select("id, kode").eq("is_active", true),
    sb.from("jenis_pengeluaran").select("id, kode").eq("is_active", true),
  ])

  const maps: MasterMaps = {
    unit:  Object.fromEntries((unit.data ?? []).map((r) => [r.kode, r.id])),
    rek:   Object.fromEntries((rekening.data ?? []).map((r) => [r.kode, r.id])),
    jenis: Object.fromEntries((jenis.data ?? []).map((r) => [r.kode, r.id])),
  }

  if (redis) await redis.setex(MASTER_CACHE_KEY, MASTER_CACHE_TTL, maps)
  return maps
}

export async function parseImportPengeluaranData(
  rows: ImportPengeluaranRow[]
): Promise<ImportPengeluaranPreviewRow[]> {
  await requireRole(["OPERATOR", "ADMIN"])
  const { unit, rek, jenis } = await getMasterMaps()

  const ISO_DATE_RE = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/

  return rows.map((row) => {
    const errors: string[] = []

    if (!row.tanggal || !ISO_DATE_RE.test(row.tanggal)) {
      errors.push("tanggal tidak valid (format: YYYY-MM-DD)")
    }
    if (!row.jumlah || isNaN(row.jumlah) || row.jumlah <= 0) {
      errors.push("jumlah harus angka positif")
    }

    const unit_id     = unit[row.kode_unit?.toUpperCase()]
    const rekening_id = rek[row.kode_rekening?.toUpperCase()]
    const jenis_id    = row.kode_jenis ? jenis[row.kode_jenis.toUpperCase()] : undefined

    if (!unit_id)     errors.push(`kode_unit "${row.kode_unit}" tidak ditemukan`)
    if (!rekening_id) errors.push(`kode_rekening "${row.kode_rekening}" tidak ditemukan`)
    if (row.kode_jenis && !jenis_id) errors.push(`kode_jenis "${row.kode_jenis}" tidak ditemukan`)

    return { ...row, valid: errors.length === 0, errors, unit_id, rekening_id, jenis_id }
  })
}

const CHUNK_SIZE = 500

export async function commitImportPengeluaran(
  rows: ImportPengeluaranPreviewRow[]
): Promise<{ ok: boolean; pesan?: string; jumlah?: number }> {
  const profile = await requireRole(["OPERATOR", "ADMIN"])
  const sb = await createClient()

  const validRows = rows.filter((r) => r.valid)
  if (validRows.length === 0) return { ok: false, pesan: "Tidak ada baris valid untuk diimpor" }
  if (validRows.length > 2000) return { ok: false, pesan: "Maksimal 2000 baris per import" }

  // Generate nomor bukti per tahun
  const tahunGroups = new Map<number, number[]>()
  validRows.forEach((row, i) => {
    const tahun = new Date(row.tanggal).getFullYear()
    if (!tahunGroups.has(tahun)) tahunGroups.set(tahun, [])
    tahunGroups.get(tahun)!.push(i)
  })

  const nomorMap = new Map<number, string>()
  for (const [tahun, indices] of tahunGroups) {
    const { data: nomorList, error: nomorError } = await sb.rpc("fn_generate_nomor_bukti_pengeluaran_batch", {
      p_tahun: tahun,
      p_count: indices.length,
    })
    if (nomorError || !nomorList) return { ok: false, pesan: "Gagal generate nomor bukti" }
    indices.forEach((rowIdx, i) => nomorMap.set(rowIdx, (nomorList as string[])[i]))
  }

  const inserts = validRows.map((row, i) => ({
    nomor_bukti:          nomorMap.get(i)!,
    tanggal:              row.tanggal,
    unit_kerja_id:        row.unit_id || null,
    rekening_bank_id:     row.rekening_id!,
    jenis_pengeluaran_id: row.jenis_id || null,
    jumlah:               row.jumlah,
    uraian:               row.uraian || null,
    status:               "draft" as const,
    created_by:           profile.id,
    updated_by:           profile.id,
  }))

  for (let i = 0; i < inserts.length; i += CHUNK_SIZE) {
    const chunk = inserts.slice(i, i + CHUNK_SIZE)
    const { error } = await sb.from("pengeluaran").insert(chunk)
    if (error) return { ok: false, pesan: error.message }
  }

  await invalidateDashboardCache()
  revalidatePath("/pengeluaran")
  return { ok: true, jumlah: inserts.length }
}
