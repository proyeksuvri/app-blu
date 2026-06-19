"use server"

import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/session"

const ISO_DATE_RE = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/

export type SubGroup           = { kode: string; nama: string; total: number; pct: number }
export type JenisGroup         = { kode: string; nama: string; total: number; pct: number; sub: SubGroup[] }
export type KategoriGroup      = { kodeKategori: string; namaKategori: string; total: number; pct: number; jenis: JenisGroup[] }
export type RekeningBreakdown  = { kode: string; namaBank: string; namaRekening: string; nomorRekening: string; total: number; pct: number }
export type UnitKerjaBreakdown = { kode: string; nama: string; total: number; pct: number }
export type MetodeBreakdown    = { kode: string; nama: string; total: number; pct: number }
export type DailyPoint         = { tanggal: string; hari: number; total: number }
export type RekapBulananFullResult = {
  tahun: number; bulan: number
  total: number; count: number; activeRekeningCount: number
  dailyAverage: number; daysInMonth: number
  byKategori: KategoriGroup[]
  byRekening: RekeningBreakdown[]
  byUnit:     UnitKerjaBreakdown[]
  byMetode:   MetodeBreakdown[]
  dailyTrend: DailyPoint[]
}

export async function rekapHarian(tanggal: string) {
  await requireRole(["ADMIN", "PIMPINAN"])
  if (!ISO_DATE_RE.test(tanggal)) return { rows: [], total: 0 }
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
  if (bulan < 1 || bulan > 12) return { byKategori: [], total: 0 }
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
  if (!ISO_DATE_RE.test(tglAwal) || !ISO_DATE_RE.test(tglAkhir)) return { byRekening: [], total: 0 }
  const diffMs = new Date(tglAkhir).getTime() - new Date(tglAwal).getTime()
  if (diffMs < 0 || diffMs > 366 * 24 * 60 * 60 * 1000) return { byRekening: [], total: 0 }
  const sb = await createClient()

  const baseQ = sb
    .from("penerimaan")
    .select(`jumlah, rekening:rekening_bank(kode, nama_bank, nama_rekening, nomor_rekening)`)
    .gte("tanggal_terima", tglAwal)
    .lte("tanggal_terima", tglAkhir)
    .eq("status", "verified")

  const BATCH = 1000
  const rows: { jumlah: number; rekening: unknown }[] = []
  let offset = 0
  while (true) {
    const { data: batch, error } = await baseQ.range(offset, offset + BATCH - 1)
    if (error) return { byRekening: [], total: 0 }
    if (!batch || batch.length === 0) break
    rows.push(...(batch as typeof rows))
    if (batch.length < BATCH) break
    offset += BATCH
  }
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

export async function rekapBulananFull(tahun: number, bulan: number): Promise<RekapBulananFullResult> {
  await requireRole(["ADMIN", "PIMPINAN"])

  const empty: RekapBulananFullResult = {
    tahun, bulan, total: 0, count: 0, activeRekeningCount: 0,
    dailyAverage: 0, daysInMonth: 0,
    byKategori: [], byRekening: [], byUnit: [], byMetode: [], dailyTrend: [],
  }

  if (bulan < 1 || bulan > 12) return empty

  const sb = await createClient()
  const tglAwal = `${tahun}-${String(bulan).padStart(2, "0")}-01`
  const tglAkhir = new Date(tahun, bulan, 0).toISOString().split("T")[0]
  const daysInMonth = new Date(tahun, bulan, 0).getDate()

  const bulananQ = sb
    .from("penerimaan")
    .select(`
      jumlah, tanggal_terima,
      jenis:jenis_pendapatan(kode, nama, kategori:kategori_pendapatan(kode, nama)),
      sub:sub_pendapatan(kode, nama),
      rekening:rekening_bank(kode, nama_bank, nama_rekening, nomor_rekening),
      unit:unit_kerja(kode, nama),
      metode:jenis_pemindahan_kas(kode, nama)
    `)
    .gte("tanggal_terima", tglAwal)
    .lte("tanggal_terima", tglAkhir)
    .eq("status", "verified")

  const BATCH2 = 1000
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = []
  let off2 = 0
  while (true) {
    const { data: batch, error } = await bulananQ.range(off2, off2 + BATCH2 - 1)
    if (error) return { ...empty, daysInMonth }
    if (!batch || batch.length === 0) break
    rows.push(...batch)
    if (batch.length < BATCH2) break
    off2 += BATCH2
  }
  if (!rows.length) return { ...empty, daysInMonth }
  const total = rows.reduce((s, r) => s + Number(r.jumlah), 0)
  const count = rows.length
  const pct = (n: number) => total > 0 ? Math.round((n / total) * 1000) / 10 : 0

  const resolve = <T>(v: T | T[] | null | undefined): T | null =>
    v == null ? null : Array.isArray(v) ? (v[0] ?? null) : v

  const katMap: Record<string, { kodeKategori: string; namaKategori: string; total: number; jenisMap: Record<string, { kode: string; nama: string; total: number; subMap: Record<string, { kode: string; nama: string; total: number }> }> }> = {}
  const rekMap: Record<string, { kode: string; namaBank: string; namaRekening: string; nomorRekening: string; total: number }> = {}
  const unitMap: Record<string, { kode: string; nama: string; total: number }> = {}
  const metodeMap: Record<string, { kode: string; nama: string; total: number }> = {}
  const dailyMap: Record<string, number> = {}

  for (const r of rows) {
    const jumlah = Number(r.jumlah)
    const j = resolve(r.jenis) as { kode: string; nama: string; kategori: { kode: string; nama: string }[] | { kode: string; nama: string } } | null
    const kat = j ? (resolve(j.kategori) as { kode: string; nama: string } | null) : null
    const sub = resolve(r.sub) as { kode: string; nama: string } | null
    const rek = resolve(r.rekening) as { kode: string; nama_bank: string; nama_rekening: string; nomor_rekening: string } | null
    const unit = resolve(r.unit) as { kode: string; nama: string } | null
    const metode = resolve(r.metode) as { kode: string; nama: string } | null
    const tgl = r.tanggal_terima as string

    if (j && kat) {
      if (!katMap[kat.kode]) katMap[kat.kode] = { kodeKategori: kat.kode, namaKategori: kat.nama, total: 0, jenisMap: {} }
      katMap[kat.kode].total += jumlah
      if (!katMap[kat.kode].jenisMap[j.kode]) katMap[kat.kode].jenisMap[j.kode] = { kode: j.kode, nama: j.nama, total: 0, subMap: {} }
      katMap[kat.kode].jenisMap[j.kode].total += jumlah
      if (sub) {
        const sm = katMap[kat.kode].jenisMap[j.kode].subMap
        if (!sm[sub.kode]) sm[sub.kode] = { kode: sub.kode, nama: sub.nama, total: 0 }
        sm[sub.kode].total += jumlah
      }
    }
    if (rek) {
      if (!rekMap[rek.kode]) rekMap[rek.kode] = { kode: rek.kode, namaBank: rek.nama_bank, namaRekening: rek.nama_rekening, nomorRekening: rek.nomor_rekening, total: 0 }
      rekMap[rek.kode].total += jumlah
    }
    if (unit) {
      if (!unitMap[unit.kode]) unitMap[unit.kode] = { kode: unit.kode, nama: unit.nama, total: 0 }
      unitMap[unit.kode].total += jumlah
    }
    if (metode) {
      if (!metodeMap[metode.kode]) metodeMap[metode.kode] = { kode: metode.kode, nama: metode.nama, total: 0 }
      metodeMap[metode.kode].total += jumlah
    }
    if (tgl) dailyMap[tgl] = (dailyMap[tgl] ?? 0) + jumlah
  }

  const byKategori: KategoriGroup[] = Object.values(katMap)
    .sort((a, b) => b.total - a.total)
    .map((k) => ({
      kodeKategori: k.kodeKategori, namaKategori: k.namaKategori,
      total: k.total, pct: pct(k.total),
      jenis: Object.values(k.jenisMap)
        .sort((a, b) => b.total - a.total)
        .map((j) => ({
          kode: j.kode, nama: j.nama, total: j.total, pct: pct(j.total),
          sub: Object.values(j.subMap)
            .sort((a, b) => b.total - a.total)
            .map((s) => ({ ...s, pct: pct(s.total) })),
        })),
    }))

  const byRekening: RekeningBreakdown[] = Object.values(rekMap)
    .sort((a, b) => b.total - a.total)
    .map((r) => ({ ...r, pct: pct(r.total) }))

  const byUnit: UnitKerjaBreakdown[] = Object.values(unitMap)
    .sort((a, b) => b.total - a.total)
    .map((u) => ({ ...u, pct: pct(u.total) }))

  const byMetode: MetodeBreakdown[] = Object.values(metodeMap)
    .sort((a, b) => b.total - a.total)
    .map((m) => ({ ...m, pct: pct(m.total) }))

  const dailyTrend: DailyPoint[] = Array.from({ length: daysInMonth }, (_, i) => {
    const hari = i + 1
    const key = `${tahun}-${String(bulan).padStart(2, "0")}-${String(hari).padStart(2, "0")}`
    return { tanggal: key, hari, total: dailyMap[key] ?? 0 }
  })

  return {
    tahun, bulan, total, count, daysInMonth,
    activeRekeningCount: byRekening.length,
    dailyAverage: Math.round(total / daysInMonth),
    byKategori, byRekening, byUnit, byMetode, dailyTrend,
  }
}
