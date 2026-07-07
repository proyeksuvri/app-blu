"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/session"
import { invalidateImportCache } from "@/lib/cache"

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; pesan: string }

// ─── Kategori Pendapatan ──────────────────────────────────────────────────────

export async function listKategori() {
  const sb = await createClient()
  const { data, error } = await sb
    .from("kategori_pendapatan")
    .select("*")
    .order("kode")
  if (error) return []
  return data
}

export async function createKategori(input: { kode: string; nama: string; keterangan?: string }): Promise<ActionResult> {
  await requireRole(["ADMIN"])
  const sb = await createClient()
  const { error } = await sb.from("kategori_pendapatan").insert({
    kode: input.kode.toUpperCase(),
    nama: input.nama,
    keterangan: input.keterangan || null,
  })
  if (error) return { ok: false, pesan: error.message }
  await invalidateImportCache()
  revalidatePath("/kategori-pendapatan")
  return { ok: true, data: undefined }
}

export async function updateKategori(id: string, input: { kode: string; nama: string; keterangan?: string }): Promise<ActionResult> {
  await requireRole(["ADMIN"])
  const sb = await createClient()
  const { error } = await sb.from("kategori_pendapatan").update({
    kode: input.kode.toUpperCase(),
    nama: input.nama,
    keterangan: input.keterangan || null,
  }).eq("id", id)
  if (error) return { ok: false, pesan: error.message }
  await invalidateImportCache()
  revalidatePath("/kategori-pendapatan")
  return { ok: true, data: undefined }
}

export async function toggleKategoriAktif(id: string, is_active: boolean): Promise<ActionResult> {
  await requireRole(["ADMIN"])
  const sb = await createClient()
  const { error } = await sb.from("kategori_pendapatan").update({ is_active }).eq("id", id)
  if (error) return { ok: false, pesan: error.message }
  await invalidateImportCache()
  revalidatePath("/kategori-pendapatan")
  return { ok: true, data: undefined }
}

// ─── Jenis Pendapatan ─────────────────────────────────────────────────────────

export async function listJenis(kategoriId?: string) {
  const sb = await createClient()
  let q = sb.from("jenis_pendapatan").select("*, kategori:kategori_pendapatan(kode, nama)").order("kode")
  if (kategoriId) q = q.eq("kategori_pendapatan_id", kategoriId)
  const { data, error } = await q
  if (error) return []
  return data
}

export async function createJenis(input: {
  kategori_pendapatan_id: string; kode: string; nama: string
  akun_pendapatan?: string; keterangan?: string
}): Promise<ActionResult> {
  await requireRole(["ADMIN"])
  const sb = await createClient()
  const { error } = await sb.from("jenis_pendapatan").insert({
    kategori_pendapatan_id: input.kategori_pendapatan_id,
    kode: input.kode.toUpperCase(),
    nama: input.nama,
    akun_pendapatan: input.akun_pendapatan || null,
    keterangan: input.keterangan || null,
  })
  if (error) return { ok: false, pesan: error.message }
  await invalidateImportCache()
  revalidatePath("/jenis-pendapatan")
  return { ok: true, data: undefined }
}

export async function updateJenis(id: string, input: {
  kategori_pendapatan_id: string; kode: string; nama: string
  akun_pendapatan?: string; keterangan?: string
}): Promise<ActionResult> {
  await requireRole(["ADMIN"])
  const sb = await createClient()
  const { error } = await sb.from("jenis_pendapatan").update({
    kategori_pendapatan_id: input.kategori_pendapatan_id,
    kode: input.kode.toUpperCase(),
    nama: input.nama,
    akun_pendapatan: input.akun_pendapatan || null,
    keterangan: input.keterangan || null,
  }).eq("id", id)
  if (error) return { ok: false, pesan: error.message }
  await invalidateImportCache()
  revalidatePath("/jenis-pendapatan")
  return { ok: true, data: undefined }
}

export async function toggleJenisAktif(id: string, is_active: boolean): Promise<ActionResult> {
  await requireRole(["ADMIN"])
  const sb = await createClient()
  const { error } = await sb.from("jenis_pendapatan").update({ is_active }).eq("id", id)
  if (error) return { ok: false, pesan: error.message }
  await invalidateImportCache()
  revalidatePath("/jenis-pendapatan")
  return { ok: true, data: undefined }
}

// ─── Sub Pendapatan ───────────────────────────────────────────────────────────

export async function listSub(jenisId?: string) {
  const sb = await createClient()
  let q = sb.from("sub_pendapatan").select("*, jenis:jenis_pendapatan(kode, nama)").order("kode")
  if (jenisId) q = q.eq("jenis_pendapatan_id", jenisId)
  const { data, error } = await q
  if (error) return []
  return data
}

export async function createSub(input: {
  jenis_pendapatan_id: string; kode: string; nama: string; keterangan?: string
}): Promise<ActionResult> {
  await requireRole(["ADMIN"])
  const sb = await createClient()
  const { error } = await sb.from("sub_pendapatan").insert({
    jenis_pendapatan_id: input.jenis_pendapatan_id,
    kode: input.kode.toUpperCase(),
    nama: input.nama,
    keterangan: input.keterangan || null,
  })
  if (error) return { ok: false, pesan: error.message }
  await invalidateImportCache()
  revalidatePath("/sub-pendapatan")
  return { ok: true, data: undefined }
}

export async function updateSub(id: string, input: {
  jenis_pendapatan_id: string; kode: string; nama: string; keterangan?: string
}): Promise<ActionResult> {
  await requireRole(["ADMIN"])
  const sb = await createClient()
  const { error } = await sb.from("sub_pendapatan").update({
    jenis_pendapatan_id: input.jenis_pendapatan_id,
    kode: input.kode.toUpperCase(),
    nama: input.nama,
    keterangan: input.keterangan || null,
  }).eq("id", id)
  if (error) return { ok: false, pesan: error.message }
  await invalidateImportCache()
  revalidatePath("/sub-pendapatan")
  return { ok: true, data: undefined }
}

export async function toggleSubAktif(id: string, is_active: boolean): Promise<ActionResult> {
  await requireRole(["ADMIN"])
  const sb = await createClient()
  const { error } = await sb.from("sub_pendapatan").update({ is_active }).eq("id", id)
  if (error) return { ok: false, pesan: error.message }
  await invalidateImportCache()
  revalidatePath("/sub-pendapatan")
  return { ok: true, data: undefined }
}

// ─── Unit Kerja ───────────────────────────────────────────────────────────────

export async function listUnitKerja() {
  const sb = await createClient()
  const { data, error } = await sb.from("unit_kerja").select("*").order("kode")
  if (error) return []
  return data
}

export async function createUnitKerja(input: { kode: string; nama: string; keterangan?: string }): Promise<ActionResult> {
  await requireRole(["ADMIN"])
  const sb = await createClient()
  const { error } = await sb.from("unit_kerja").insert({
    kode: input.kode.toUpperCase(), nama: input.nama, keterangan: input.keterangan || null,
  })
  if (error) return { ok: false, pesan: error.message }
  await invalidateImportCache()
  revalidatePath("/unit-kerja")
  return { ok: true, data: undefined }
}

export async function updateUnitKerja(id: string, input: { kode: string; nama: string; keterangan?: string }): Promise<ActionResult> {
  await requireRole(["ADMIN"])
  const sb = await createClient()
  const { error } = await sb.from("unit_kerja").update({
    kode: input.kode.toUpperCase(), nama: input.nama, keterangan: input.keterangan || null,
  }).eq("id", id)
  if (error) return { ok: false, pesan: error.message }
  await invalidateImportCache()
  revalidatePath("/unit-kerja")
  return { ok: true, data: undefined }
}

export async function toggleUnitKerjaAktif(id: string, is_active: boolean): Promise<ActionResult> {
  await requireRole(["ADMIN"])
  const sb = await createClient()
  const { error } = await sb.from("unit_kerja").update({ is_active }).eq("id", id)
  if (error) return { ok: false, pesan: error.message }
  await invalidateImportCache()
  revalidatePath("/unit-kerja")
  return { ok: true, data: undefined }
}

// ─── Rekening Bank ────────────────────────────────────────────────────────────

export async function listRekening() {
  const sb = await createClient()
  const { data, error } = await sb.from("rekening_bank").select("*").order("kode")
  if (error) return []
  return data
}

export async function createRekening(input: {
  kode: string; nama_bank: string; nama_rekening: string
  nomor_rekening: string; keterangan?: string
}): Promise<ActionResult> {
  await requireRole(["ADMIN"])
  const sb = await createClient()
  const { error } = await sb.from("rekening_bank").insert({
    kode: input.kode.toUpperCase(),
    nama_bank: input.nama_bank,
    nama_rekening: input.nama_rekening,
    nomor_rekening: input.nomor_rekening,
    keterangan: input.keterangan || null,
  })
  if (error) return { ok: false, pesan: error.message }
  await invalidateImportCache()
  revalidatePath("/rekening-bank")
  return { ok: true, data: undefined }
}

export async function updateRekening(id: string, input: {
  kode: string; nama_bank: string; nama_rekening: string
  nomor_rekening: string; keterangan?: string
}): Promise<ActionResult> {
  await requireRole(["ADMIN"])
  const sb = await createClient()
  const { error } = await sb.from("rekening_bank").update({
    kode: input.kode.toUpperCase(),
    nama_bank: input.nama_bank,
    nama_rekening: input.nama_rekening,
    nomor_rekening: input.nomor_rekening,
    keterangan: input.keterangan || null,
  }).eq("id", id)
  if (error) return { ok: false, pesan: error.message }
  await invalidateImportCache()
  revalidatePath("/rekening-bank")
  return { ok: true, data: undefined }
}

export async function toggleRekeningAktif(id: string, is_active: boolean): Promise<ActionResult> {
  await requireRole(["ADMIN"])
  const sb = await createClient()
  const { error } = await sb.from("rekening_bank").update({ is_active }).eq("id", id)
  if (error) return { ok: false, pesan: error.message }
  await invalidateImportCache()
  revalidatePath("/rekening-bank")
  return { ok: true, data: undefined }
}

export async function listSaldoAwal(rekeningId?: string) {
  const sb = await createClient()
  let q = sb
    .from("saldo_awal_rekening")
    .select("id, rekening_bank_id, tahun, saldo, keterangan")
    .order("tahun", { ascending: false })
  if (rekeningId) q = q.eq("rekening_bank_id", rekeningId)
  const { data, error } = await q
  if (error) return []
  return data
}

export async function upsertSaldoAwal(input: {
  rekening_bank_id: string
  tahun: number
  saldo: number
  keterangan?: string
}): Promise<ActionResult> {
  const profile = await requireRole(["ADMIN"])
  const sb = await createClient()
  const { error } = await sb.from("saldo_awal_rekening").upsert(
    {
      rekening_bank_id: input.rekening_bank_id,
      tahun: input.tahun,
      saldo: input.saldo,
      keterangan: input.keterangan || null,
      created_by: profile.id,
      updated_by: profile.id,
    },
    { onConflict: "rekening_bank_id,tahun" }
  )
  if (error) return { ok: false, pesan: error.message }
  revalidatePath("/rekening-bank")
  return { ok: true, data: undefined }
}

export async function deleteSaldoAwal(id: string): Promise<ActionResult> {
  await requireRole(["ADMIN"])
  const sb = await createClient()
  const { error } = await sb.from("saldo_awal_rekening").delete().eq("id", id)
  if (error) return { ok: false, pesan: error.message }
  revalidatePath("/rekening-bank")
  return { ok: true, data: undefined }
}

// ─── Jenis Pemindahan Kas ─────────────────────────────────────────────────────

export async function listJenisPemindahan() {
  const sb = await createClient()
  const { data, error } = await sb.from("jenis_pemindahan_kas").select("*").order("kode")
  if (error) return []
  return data
}

export async function createJenisPemindahan(input: { kode: string; nama: string; keterangan?: string }): Promise<ActionResult> {
  await requireRole(["ADMIN"])
  const sb = await createClient()
  const { error } = await sb.from("jenis_pemindahan_kas").insert({
    kode: input.kode.toUpperCase(), nama: input.nama, keterangan: input.keterangan || null,
  })
  if (error) return { ok: false, pesan: error.message }
  await invalidateImportCache()
  revalidatePath("/jenis-pemindahan-kas")
  return { ok: true, data: undefined }
}

export async function updateJenisPemindahan(id: string, input: { kode: string; nama: string; keterangan?: string }): Promise<ActionResult> {
  await requireRole(["ADMIN"])
  const sb = await createClient()
  const { error } = await sb.from("jenis_pemindahan_kas").update({
    kode: input.kode.toUpperCase(), nama: input.nama, keterangan: input.keterangan || null,
  }).eq("id", id)
  if (error) return { ok: false, pesan: error.message }
  await invalidateImportCache()
  revalidatePath("/jenis-pemindahan-kas")
  return { ok: true, data: undefined }
}

export async function toggleJenisPemindahanAktif(id: string, is_active: boolean): Promise<ActionResult> {
  await requireRole(["ADMIN"])
  const sb = await createClient()
  const { error } = await sb.from("jenis_pemindahan_kas").update({ is_active }).eq("id", id)
  if (error) return { ok: false, pesan: error.message }
  await invalidateImportCache()
  revalidatePath("/jenis-pemindahan-kas")
  return { ok: true, data: undefined }
}
