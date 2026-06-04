"use server"

import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/session"
import { getRedis } from "@/lib/redis"
import { revalidatePath } from "next/cache"

export type ImportRow = {
  baris: number
  tanggal_terima: string
  kode_jenis: string
  kode_sub?: string
  kode_unit: string
  kode_rekening: string
  kode_metode: string
  jumlah: number
  nomor_referensi?: string
  uraian?: string
}

export type ImportPreviewRow = ImportRow & {
  valid: boolean
  errors: string[]
  jenis_id?: string
  sub_id?: string
  unit_id?: string
  rekening_id?: string
  metode_id?: string
}

type MasterMaps = {
  jenis: Record<string, string>
  sub: Record<string, string>
  unit: Record<string, string>
  rek: Record<string, string>
  metode: Record<string, string>
}

const MASTER_CACHE_KEY = "import:master_maps"
const MASTER_CACHE_TTL = 3600 // 1 jam

async function getMasterMaps(): Promise<MasterMaps> {
  const redis = getRedis()
  if (redis) {
    const cached = await redis.get<MasterMaps>(MASTER_CACHE_KEY)
    if (cached) return cached
  }

  const sb = await createClient()
  const [jenis, sub, unit, rekening, metode] = await Promise.all([
    sb.from("jenis_pendapatan").select("id, kode").eq("is_active", true),
    sb.from("sub_pendapatan").select("id, kode").eq("is_active", true),
    sb.from("unit_kerja").select("id, kode").eq("is_active", true),
    sb.from("rekening_bank").select("id, kode").eq("is_active", true),
    sb.from("jenis_pemindahan_kas").select("id, kode").eq("is_active", true),
  ])

  const maps: MasterMaps = {
    jenis:  Object.fromEntries((jenis.data   ?? []).map((r) => [r.kode, r.id])),
    sub:    Object.fromEntries((sub.data     ?? []).map((r) => [r.kode, r.id])),
    unit:   Object.fromEntries((unit.data    ?? []).map((r) => [r.kode, r.id])),
    rek:    Object.fromEntries((rekening.data ?? []).map((r) => [r.kode, r.id])),
    metode: Object.fromEntries((metode.data  ?? []).map((r) => [r.kode, r.id])),
  }

  if (redis) await redis.setex(MASTER_CACHE_KEY, MASTER_CACHE_TTL, maps)
  return maps
}

export async function parseImportData(rows: ImportRow[]): Promise<ImportPreviewRow[]> {
  await requireRole(["OPERATOR", "ADMIN"])
  const { jenis, sub, unit, rek, metode } = await getMasterMaps()

  const ISO_DATE_RE = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/

  return rows.map((row) => {
    const errors: string[] = []

    if (!row.tanggal_terima || !ISO_DATE_RE.test(row.tanggal_terima)) {
      errors.push("tanggal_terima tidak valid (format: YYYY-MM-DD)")
    }
    if (!row.jumlah || isNaN(row.jumlah) || row.jumlah <= 0) {
      errors.push("jumlah harus angka positif")
    }

    const jenis_id    = jenis[row.kode_jenis?.toUpperCase()]
    const sub_id      = row.kode_sub ? sub[row.kode_sub.toUpperCase()] : undefined
    const unit_id     = unit[row.kode_unit?.toUpperCase()]
    const rekening_id = rek[row.kode_rekening?.toUpperCase()]
    const metode_id   = metode[row.kode_metode?.toUpperCase()]

    if (!jenis_id)    errors.push(`kode_jenis "${row.kode_jenis}" tidak ditemukan`)
    if (row.kode_sub && !sub_id) errors.push(`kode_sub "${row.kode_sub}" tidak ditemukan`)
    if (!unit_id)     errors.push(`kode_unit "${row.kode_unit}" tidak ditemukan`)
    if (!rekening_id) errors.push(`kode_rekening "${row.kode_rekening}" tidak ditemukan`)
    if (!metode_id)   errors.push(`kode_metode "${row.kode_metode}" tidak ditemukan`)

    return { ...row, valid: errors.length === 0, errors, jenis_id, sub_id, unit_id, rekening_id, metode_id }
  })
}

const CHUNK_SIZE = 500

export async function commitImport(rows: ImportPreviewRow[]): Promise<{ ok: boolean; pesan?: string; jumlah?: number }> {
  const profile = await requireRole(["OPERATOR", "ADMIN"])
  const sb = await createClient()

  const validRows = rows.filter((r) => r.valid)
  if (validRows.length === 0) return { ok: false, pesan: "Tidak ada baris valid untuk diimpor" }
  if (validRows.length > 2000) return { ok: false, pesan: "Maksimal 2000 baris per import" }

  // Generate nomor bukti per tahun
  const tahunGroups = new Map<number, number[]>()
  validRows.forEach((row, i) => {
    const tahun = new Date(row.tanggal_terima).getFullYear()
    if (!tahunGroups.has(tahun)) tahunGroups.set(tahun, [])
    tahunGroups.get(tahun)!.push(i)
  })

  const nomorMap = new Map<number, string>()
  for (const [tahun, indices] of tahunGroups) {
    const { data: nomorList, error: nomorError } = await sb.rpc("fn_generate_nomor_bukti_batch", {
      p_tahun: tahun,
      p_count: indices.length,
    })
    if (nomorError || !nomorList) return { ok: false, pesan: "Gagal generate nomor bukti" }
    indices.forEach((rowIdx, i) => nomorMap.set(rowIdx, (nomorList as string[])[i]))
  }

  const inserts = validRows.map((row, i) => ({
    nomor_bukti: nomorMap.get(i)!,
    tanggal_terima: row.tanggal_terima,
    jenis_pendapatan_id: row.jenis_id!,
    sub_pendapatan_id: row.sub_id || null,
    unit_kerja_id: row.unit_id!,
    rekening_bank_id: row.rekening_id!,
    jenis_pemindahan_kas_id: row.metode_id!,
    jumlah: row.jumlah,
    nomor_referensi: row.nomor_referensi || null,
    uraian: row.uraian || null,
    status: "draft" as const,
    created_by: profile.id,
    updated_by: profile.id,
  }))

  // Insert dalam chunk agar tidak melebihi batas payload Supabase
  for (let i = 0; i < inserts.length; i += CHUNK_SIZE) {
    const chunk = inserts.slice(i, i + CHUNK_SIZE)
    const { error } = await sb.from("penerimaan").insert(chunk)
    if (error) return { ok: false, pesan: error.message }
  }

  revalidatePath("/penerimaan")
  return { ok: true, jumlah: inserts.length }
}
