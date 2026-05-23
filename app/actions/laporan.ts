"use server"

import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/session"

export async function rekapHarian(tanggal: string) {
  await requireRole(["ADMIN", "PIMPINAN"])
  const sb = await createClient()

  const { data, error } = await sb
    .from("penerimaan")
    .select(`
      id, nomor_bukti, tanggal_terima, jumlah, status, nomor_referensi,
      jenis:jenis_pendapatan(kode, nama, kategori:kategori_pendapatan(nama)),
      unit:unit_kerja(kode, nama),
      rekening:rekening_bank(kode, nama_bank),
      metode:jenis_pemindahan_kas(nama)
    `)
    .eq("tanggal_terima", tanggal)
    .eq("status", "verified")
    .order("created_at")

  if (error) return { rows: [], total: 0 }

  const raw = data ?? []
  const total = raw.reduce((s, r) => s + Number(r.jumlah), 0)
  const rows = raw.map((r) => ({
    id: r.id,
    nomor_bukti: r.nomor_bukti,
    tanggal_terima: r.tanggal_terima,
    jumlah: Number(r.jumlah),
    status: r.status,
    nomor_referensi: r.nomor_referensi ?? null,
    jenis: Array.isArray(r.jenis) ? (r.jenis[0] ?? null) : r.jenis ?? null,
    unit: Array.isArray(r.unit) ? (r.unit[0] ?? null) : r.unit ?? null,
    rekening: Array.isArray(r.rekening) ? (r.rekening[0] ?? null) : r.rekening ?? null,
    metode: Array.isArray(r.metode) ? (r.metode[0] ?? null) : r.metode ?? null,
  }))
  return { rows, total }
}

export async function rekapBulanan(tahun: number, bulan: number) {
  await requireRole(["ADMIN", "PIMPINAN"])
  const sb = await createClient()

  const tglAwal = `${tahun}-${String(bulan).padStart(2, "0")}-01`
  const tglAkhir = new Date(tahun, bulan, 0).toISOString().split("T")[0]

  const { data, error } = await sb
    .from("penerimaan")
    .select(`
      jumlah, status,
      jenis:jenis_pendapatan(kode, nama, kategori:kategori_pendapatan(kode, nama))
    `)
    .gte("tanggal_terima", tglAwal)
    .lte("tanggal_terima", tglAkhir)
    .eq("status", "verified")

  if (error) return { byKategori: [], total: 0 }

  const rows = data ?? []
  const total = rows.reduce((s, r) => s + Number(r.jumlah), 0)

  // Group by kategori → jenis
  const byKategori: Record<string, {
    kodeKategori: string; namaKategori: string; total: number
    jenis: Record<string, { kode: string; nama: string; total: number }>
  }> = {}

  for (const r of rows) {
    const rawJ = Array.isArray(r.jenis) ? (r.jenis[0] ?? null) : r.jenis ?? null
    const j = rawJ as { kode: string; nama: string; kategori: { kode: string; nama: string }[] } | null
    if (!j) continue
    const kat = Array.isArray(j.kategori) ? (j.kategori[0] ?? null) : j.kategori ?? null
    if (!kat) continue
    const kk = kat.kode
    if (!byKategori[kk]) byKategori[kk] = { kodeKategori: kat.kode, namaKategori: kat.nama, total: 0, jenis: {} }
    byKategori[kk].total += Number(r.jumlah)
    if (!byKategori[kk].jenis[j.kode]) byKategori[kk].jenis[j.kode] = { kode: j.kode, nama: j.nama, total: 0 }
    byKategori[kk].jenis[j.kode].total += Number(r.jumlah)
  }

  return { byKategori: Object.values(byKategori), total }
}

export async function rekapPerRekening(tglAwal: string, tglAkhir: string) {
  await requireRole(["ADMIN", "PIMPINAN"])
  const sb = await createClient()

  const { data, error } = await sb
    .from("penerimaan")
    .select(`jumlah, rekening:rekening_bank(kode, nama_bank, nama_rekening, nomor_rekening)`)
    .gte("tanggal_terima", tglAwal)
    .lte("tanggal_terima", tglAkhir)
    .eq("status", "verified")

  if (error) return { byRekening: [], total: 0 }

  const rows = data ?? []
  const total = rows.reduce((s, r) => s + Number(r.jumlah), 0)

  const byRek: Record<string, {
    kode: string; nama_bank: string; nama_rekening: string; nomor_rekening: string; total: number
  }> = {}

  for (const r of rows) {
    const rek = (Array.isArray(r.rekening) ? (r.rekening[0] ?? null) : r.rekening ?? null) as { kode: string; nama_bank: string; nama_rekening: string; nomor_rekening: string } | null
    if (!rek) continue
    if (!byRek[rek.kode]) byRek[rek.kode] = { ...rek, total: 0 }
    byRek[rek.kode].total += Number(r.jumlah)
  }

  return { byRekening: Object.values(byRek), total }
}
