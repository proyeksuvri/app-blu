"use server"

import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/session"

const ISO_DATE_RE = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/

/**
 * Kembalikan batas atas tanggal pada akhir hari WIB (UTC+8) = T15:59:59Z (UTC).
 * Ini mencegah transaksi timestamptz dari hari berikutnya ikut terhitung
 * akibat selisih UTC vs WIB.
 */
function endOfDay(tgl: string): string {
  // T23:59:59+08:00 = T15:59:59Z — mencakup seluruh hari WIB
  return `${tgl}T23:59:59+08:00`
}

export type SubGroup           = { kode: string; nama: string; total: number; pct: number }
export type JenisGroup         = { kode: string; nama: string; total: number; pct: number; sub: SubGroup[] }
export type KategoriGroup      = { kodeKategori: string; namaKategori: string; total: number; pct: number; jenis: JenisGroup[] }
export type RekeningBreakdown  = { kode: string; namaBank: string; namaRekening: string; nomorRekening: string; total: number; pct: number }
export type UnitKerjaBreakdown = { kode: string; nama: string; total: number; pct: number }
export type MetodeBreakdown    = { kode: string; nama: string; total: number; pct: number }
export type DailyPoint         = { tanggal: string; hari: number; total: number }
export type BulanPoint         = { bulan: number; namaBulan: string; penerimaan: number; pengeluaran: number; saldo: number }
export type RekeningKoranResult = {
  rekeningId: string
  namaBank: string
  namaRekening: string
  nomorRekening: string
  tahun: number
  saldoAwal: number
  totalPenerimaan: number
  totalPengeluaran: number
  saldoAkhir: number
  perBulan: BulanPoint[]
}
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
  const lastDay = new Date(tahun, bulan, 0).getDate()
  const tglAkhir = `${tahun}-${String(bulan).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`

  // Gunakan batched fetch agar tidak terpotong limit 1000 baris Supabase
  const BATCH = 1000
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = []
  let offset = 0
  const baseQ = sb
    .from("penerimaan")
    .select(`
      jumlah, status,
      jenis:jenis_pendapatan(kode, nama, kategori:kategori_pendapatan(kode, nama))
    `)
    .gte("tanggal_terima", tglAwal)
    .lte("tanggal_terima", endOfDay(tglAkhir))
    .eq("status", "verified")

  while (true) {
    const { data: batch, error } = await baseQ.range(offset, offset + BATCH - 1)
    if (error) return { byKategori: [], total: 0 }
    if (!batch || batch.length === 0) break
    rows.push(...batch)
    if (batch.length < BATCH) break
    offset += BATCH
  }

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
    .lte("tanggal_terima", endOfDay(tglAkhir))
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
  const lastDay = new Date(tahun, bulan, 0).getDate()
  const tglAkhir = `${tahun}-${String(bulan).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
  const daysInMonth = lastDay

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
    .lte("tanggal_terima", endOfDay(tglAkhir))
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

const BULAN_NAMA = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"]

export async function rekapRekeningKoran(rekeningId: string, tahun: number): Promise<RekeningKoranResult | null> {
  await requireRole(["ADMIN", "PIMPINAN"])
  if (!rekeningId || tahun < 2000 || tahun > 2100) return null

  const sb = await createClient()
  const tglAwal = `${tahun}-01-01`
  const tglAkhir = `${tahun}-12-31`

  const [rekeningRes, saldoAwalRes] = await Promise.all([
    sb.from("rekening_bank").select("id, kode, nama_bank, nama_rekening, nomor_rekening").eq("id", rekeningId).single(),
    sb.from("saldo_awal_rekening").select("saldo").eq("rekening_bank_id", rekeningId).eq("tahun", tahun).maybeSingle(),
  ])

  if (rekeningRes.error || !rekeningRes.data) return null

  const rek = rekeningRes.data
  const saldoAwal = Number(saldoAwalRes.data?.saldo ?? 0)

  // Hitung per bulan — gunakan batched fetch agar tidak terpotong limit 1000 baris Supabase
  const BATCH = 1000
  const penerimaanPerBulan = new Array(12).fill(0) as number[]
  const pengeluaranPerBulan = new Array(12).fill(0) as number[]

  // Fetch penerimaan dengan pagination
  const penQ = sb
    .from("penerimaan")
    .select("jumlah, tanggal_terima")
    .eq("rekening_bank_id", rekeningId)
    .eq("status", "verified")
    .gte("tanggal_terima", tglAwal)
    .lte("tanggal_terima", endOfDay(tglAkhir))
  let penOffset = 0
  while (true) {
    const { data: batch, error } = await penQ.range(penOffset, penOffset + BATCH - 1)
    if (error || !batch || batch.length === 0) break
    for (const row of batch) {
      const bln = new Date(row.tanggal_terima + "T00:00:00").getMonth() // 0-indexed
      penerimaanPerBulan[bln] += Number(row.jumlah)
    }
    if (batch.length < BATCH) break
    penOffset += BATCH
  }

  // Fetch pengeluaran dengan pagination
  const kelQ = sb
    .from("pengeluaran")
    .select("jumlah, tanggal")
    .eq("rekening_bank_id", rekeningId)
    .eq("status", "verified")
    .gte("tanggal", tglAwal)
    .lte("tanggal", tglAkhir)
  let kelOffset = 0
  while (true) {
    const { data: batch, error } = await kelQ.range(kelOffset, kelOffset + BATCH - 1)
    if (error || !batch || batch.length === 0) break
    for (const row of batch) {
      const bln = new Date(row.tanggal + "T00:00:00").getMonth()
      pengeluaranPerBulan[bln] += Number(row.jumlah)
    }
    if (batch.length < BATCH) break
    kelOffset += BATCH
  }

  const totalPenerimaan = penerimaanPerBulan.reduce((s, v) => s + v, 0)
  const totalPengeluaran = pengeluaranPerBulan.reduce((s, v) => s + v, 0)

  // Hitung saldo kumulatif per bulan
  let saldoBerjalan = saldoAwal
  const perBulan: BulanPoint[] = Array.from({ length: 12 }, (_, i) => {
    saldoBerjalan += penerimaanPerBulan[i] - pengeluaranPerBulan[i]
    return {
      bulan: i + 1,
      namaBulan: BULAN_NAMA[i],
      penerimaan: penerimaanPerBulan[i],
      pengeluaran: pengeluaranPerBulan[i],
      saldo: saldoBerjalan,
    }
  })

  return {
    rekeningId: rek.id,
    namaBank: rek.nama_bank,
    namaRekening: rek.nama_rekening,
    nomorRekening: rek.nomor_rekening,
    tahun,
    saldoAwal,
    totalPenerimaan,
    totalPengeluaran,
    saldoAkhir: saldoAwal + totalPenerimaan - totalPengeluaran,
    perBulan,
  }
}

export async function rekapRekeningKoranSemuaBank(tahun: number): Promise<RekeningKoranResult | null> {
  await requireRole(["ADMIN", "PIMPINAN"])
  if (tahun < 2000 || tahun > 2100) return null

  const sb = await createClient()
  const tglAwal = `${tahun}-01-01`
  const tglAkhir = `${tahun}-12-31`

  const { data: saldoAwalData } = await sb.from("saldo_awal_rekening").select("saldo").eq("tahun", tahun)
  const saldoAwal = (saldoAwalData ?? []).reduce((s, r) => s + Number(r.saldo), 0)

  // Gunakan batched fetch agar tidak terpotong limit 1000 baris Supabase
  const BATCH = 1000
  const penerimaanPerBulan = new Array(12).fill(0) as number[]
  const pengeluaranPerBulan = new Array(12).fill(0) as number[]

  // Fetch penerimaan dengan pagination
  const penQ = sb
    .from("penerimaan")
    .select("jumlah, tanggal_terima")
    .eq("status", "verified")
    .gte("tanggal_terima", tglAwal)
    .lte("tanggal_terima", endOfDay(tglAkhir))
  let penOffset = 0
  while (true) {
    const { data: batch, error } = await penQ.range(penOffset, penOffset + BATCH - 1)
    if (error || !batch || batch.length === 0) break
    for (const row of batch) {
      const bln = new Date(row.tanggal_terima + "T00:00:00").getMonth()
      penerimaanPerBulan[bln] += Number(row.jumlah)
    }
    if (batch.length < BATCH) break
    penOffset += BATCH
  }

  // Fetch pengeluaran dengan pagination
  const kelQ = sb
    .from("pengeluaran")
    .select("jumlah, tanggal")
    .eq("status", "verified")
    .gte("tanggal", tglAwal)
    .lte("tanggal", tglAkhir)
  let kelOffset = 0
  while (true) {
    const { data: batch, error } = await kelQ.range(kelOffset, kelOffset + BATCH - 1)
    if (error || !batch || batch.length === 0) break
    for (const row of batch) {
      const bln = new Date(row.tanggal + "T00:00:00").getMonth()
      pengeluaranPerBulan[bln] += Number(row.jumlah)
    }
    if (batch.length < BATCH) break
    kelOffset += BATCH
  }

  const totalPenerimaan = penerimaanPerBulan.reduce((s, v) => s + v, 0)
  const totalPengeluaran = pengeluaranPerBulan.reduce((s, v) => s + v, 0)

  let saldoBerjalan = saldoAwal
  const perBulan: BulanPoint[] = Array.from({ length: 12 }, (_, i) => {
    saldoBerjalan += penerimaanPerBulan[i] - pengeluaranPerBulan[i]
    return {
      bulan: i + 1,
      namaBulan: BULAN_NAMA[i],
      penerimaan: penerimaanPerBulan[i],
      pengeluaran: pengeluaranPerBulan[i],
      saldo: saldoBerjalan,
    }
  })

  return {
    rekeningId: "__ALL__",
    namaBank: "Semua Bank",
    namaRekening: "Agregasi Seluruh Rekening",
    nomorRekening: "—",
    tahun,
    saldoAwal,
    totalPenerimaan,
    totalPengeluaran,
    saldoAkhir: saldoAwal + totalPenerimaan - totalPengeluaran,
    perBulan,
  }
}

export type RekeningJenisRow = {
  nama_bank: string
  nomor_rekening: string
  kode_jenis: string
  nama_jenis: string
  total: number
}

export async function rekapPerRekeningByJenis(
  tglAwal: string,
  tglAkhir: string
): Promise<{ rows: RekeningJenisRow[]; total: number }> {
  await requireRole(["ADMIN", "PIMPINAN"])
  if (!ISO_DATE_RE.test(tglAwal) || !ISO_DATE_RE.test(tglAkhir)) return { rows: [], total: 0 }
  const diffMs = new Date(tglAkhir).getTime() - new Date(tglAwal).getTime()
  if (diffMs < 0 || diffMs > 366 * 24 * 60 * 60 * 1000) return { rows: [], total: 0 }

  const sb = await createClient()

  const BATCH = 1000
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allRows: any[] = []
  let offset = 0
  const baseQ = sb
    .from("penerimaan")
    .select(`
      jumlah,
      rekening:rekening_bank(nama_bank, nomor_rekening),
      jenis:jenis_pendapatan(kode, nama)
    `)
    .gte("tanggal_terima", tglAwal)
    .lte("tanggal_terima", endOfDay(tglAkhir))
    .eq("status", "verified")

  while (true) {
    const { data: batch, error } = await baseQ.range(offset, offset + BATCH - 1)
    if (error) return { rows: [], total: 0 }
    if (!batch || batch.length === 0) break
    allRows.push(...batch)
    if (batch.length < BATCH) break
    offset += BATCH
  }

  const resolve = <T>(v: T | T[] | null | undefined): T | null =>
    v == null ? null : Array.isArray(v) ? (v[0] ?? null) : v

  // Group by rekening kode + jenis kode
  const map: Record<string, RekeningJenisRow> = {}
  let total = 0

  for (const r of allRows) {
    const jumlah = Number(r.jumlah)
    const rek = resolve(r.rekening) as { nama_bank: string; nomor_rekening: string } | null
    const jenis = resolve(r.jenis) as { kode: string; nama: string } | null
    if (!rek || !jenis) continue
    const key = `${rek.nomor_rekening}__${jenis.kode}`
    if (!map[key]) {
      map[key] = {
        nama_bank: rek.nama_bank,
        nomor_rekening: rek.nomor_rekening,
        kode_jenis: jenis.kode,
        nama_jenis: jenis.nama,
        total: 0,
      }
    }
    map[key].total += jumlah
    total += jumlah
  }

  const rows = Object.values(map).sort((a, b) => {
    if (a.nama_bank !== b.nama_bank) return a.nama_bank.localeCompare(b.nama_bank)
    if (a.nomor_rekening !== b.nomor_rekening) return a.nomor_rekening.localeCompare(b.nomor_rekening)
    return b.total - a.total
  })

  return { rows, total }
}

// ─── Buku Kas Umum ────────────────────────────────────────────────────────────

export type BukuKasRow = {
  no: number
  id: string
  tipe: "penerimaan" | "pengeluaran"
  tanggal: string
  nomor_bukti: string
  uraian: string
  jenis_nama: string | null
  rekening: { kode: string; nama_bank: string; nama_rekening: string } | null
  unit: { kode: string; nama: string } | null
  penerimaan: number
  pengeluaran: number
  saldo: number
}

export type BukuKasUmumResult = {
  rows: BukuKasRow[]
  totalPenerimaan: number
  totalPengeluaran: number
  saldoAwal: number
  saldoAkhir: number
  totalRows: number
  page: number
  limit: number
}

export type BukuKasFilter = {
  tglAwal: string
  tglAkhir: string
  rekeningId?: string
  unitId?: string
  page?: number
  limit?: number
}

export async function getBukuKasUmum(filter: BukuKasFilter): Promise<BukuKasUmumResult> {
  await requireRole(["ADMIN", "PIMPINAN"])

  const empty: BukuKasUmumResult = {
    rows: [], totalPenerimaan: 0, totalPengeluaran: 0,
    saldoAwal: 0, saldoAkhir: 0, totalRows: 0, page: 1, limit: 25,
  }

  if (!ISO_DATE_RE.test(filter.tglAwal) || !ISO_DATE_RE.test(filter.tglAkhir)) return empty

  const sb = await createClient()
  const limit = filter.limit && filter.limit > 100 ? filter.limit : ([25, 50, 100].includes(filter.limit ?? 0) ? filter.limit! : 50)
  const page = Math.max(1, filter.page ?? 1)

  const resolve = <T>(v: T | T[] | null | undefined): T | null =>
    v == null ? null : Array.isArray(v) ? (v[0] ?? null) : v

  const BATCH = 1000

  // ── Ambil semua penerimaan dalam range (batched) ──
  let penQBase = sb
    .from("penerimaan")
    .select("id, nomor_bukti, tanggal_terima, jumlah, uraian, created_at, rekening:rekening_bank(kode, nama_bank, nama_rekening), unit:unit_kerja(kode, nama), jenis:jenis_pendapatan(kode, nama)")
    .gte("tanggal_terima", filter.tglAwal)
    .lte("tanggal_terima", endOfDay(filter.tglAkhir))
    .eq("status", "verified")

  if (filter.rekeningId) penQBase = penQBase.eq("rekening_bank_id", filter.rekeningId)
  if (filter.unitId) penQBase = penQBase.eq("unit_kerja_id", filter.unitId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const penData: any[] = []
  let penOffset = 0
  while (true) {
    const { data: batch, error } = await penQBase.range(penOffset, penOffset + BATCH - 1)
    if (error) return empty
    if (!batch || batch.length === 0) break
    penData.push(...batch)
    if (batch.length < BATCH) break
    penOffset += BATCH
  }

  // ── Ambil semua pengeluaran dalam range (batched) ──
  let kelQBase = sb
    .from("pengeluaran")
    .select("id, nomor_bukti, tanggal, jumlah, uraian, created_at, rekening:rekening_bank(kode, nama_bank, nama_rekening), unit:unit_kerja(kode, nama), jenis:jenis_pengeluaran(kode, nama)")
    .gte("tanggal", filter.tglAwal)
    .lte("tanggal", filter.tglAkhir)
    .eq("status", "verified")

  if (filter.rekeningId) kelQBase = kelQBase.eq("rekening_bank_id", filter.rekeningId)
  if (filter.unitId) kelQBase = kelQBase.eq("unit_kerja_id", filter.unitId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kelData: any[] = []
  let kelOffset = 0
  while (true) {
    const { data: batch, error } = await kelQBase.range(kelOffset, kelOffset + BATCH - 1)
    if (error) return empty
    if (!batch || batch.length === 0) break
    kelData.push(...batch)
    if (batch.length < BATCH) break
    kelOffset += BATCH
  }

  // ── Hitung saldo awal ──
  const tahunAwal = parseInt(filter.tglAwal.split("-")[0], 10)
  let saldoAwal = 0

  if (filter.rekeningId) {
    const { data: sa } = await sb
      .from("saldo_awal_rekening")
      .select("saldo")
      .eq("rekening_bank_id", filter.rekeningId)
      .eq("tahun", tahunAwal)
      .maybeSingle()
    saldoAwal = Number(sa?.saldo ?? 0)
  } else {
    const { data: saAll } = await sb
      .from("saldo_awal_rekening")
      .select("saldo")
      .eq("tahun", tahunAwal)
    saldoAwal = (saAll ?? []).reduce((s, r) => s + Number(r.saldo), 0)
  }

  // ── Merge & sort ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allRows: { tipe: "penerimaan" | "pengeluaran"; tanggal: string; created_at: string; raw: any }[] = [
    ...penData.map((r) => ({ tipe: "penerimaan" as const, tanggal: r.tanggal_terima, created_at: r.created_at ?? "", raw: r })),
    ...kelData.map((r) => ({ tipe: "pengeluaran" as const, tanggal: r.tanggal, created_at: r.created_at ?? "", raw: r })),
  ].sort((a, b) => {
    if (a.tanggal !== b.tanggal) return a.tanggal.localeCompare(b.tanggal)
    return a.created_at.localeCompare(b.created_at)
  })

  const totalRows = allRows.length

  // ── Hitung total penerimaan & pengeluaran ──
  let totalPenerimaan = 0
  let totalPengeluaran = 0
  for (const r of allRows) {
    if (r.tipe === "penerimaan") totalPenerimaan += Number(r.raw.jumlah)
    else totalPengeluaran += Number(r.raw.jumlah)
  }

  // ── Hitung saldo berjalan untuk SEMUA rows, lalu paginate ──
  let saldoBerjalan = saldoAwal
  const allWithSaldo: BukuKasRow[] = allRows.map((r, i) => {
    const jumlah = Number(r.raw.jumlah)
    const rek = resolve(r.raw.rekening) as { kode: string; nama_bank: string; nama_rekening: string } | null
    const unit = resolve(r.raw.unit) as { kode: string; nama: string } | null
    const jenis = resolve(r.raw.jenis) as { kode: string; nama: string } | null
    if (r.tipe === "penerimaan") saldoBerjalan += jumlah
    else saldoBerjalan -= jumlah
    return {
      no: i + 1,
      id: r.raw.id,
      tipe: r.tipe,
      tanggal: r.tanggal,
      nomor_bukti: r.raw.nomor_bukti ?? "-",
      uraian: r.raw.uraian ?? "-",
      jenis_nama: jenis?.nama ?? null,
      rekening: rek,
      unit,
      penerimaan: r.tipe === "penerimaan" ? jumlah : 0,
      pengeluaran: r.tipe === "pengeluaran" ? jumlah : 0,
      saldo: saldoBerjalan,
    }
  })

  const saldoAkhir = saldoAwal + totalPenerimaan - totalPengeluaran
  const offset = (page - 1) * limit
  const rows = allWithSaldo.slice(offset, offset + limit)

  return { rows, totalPenerimaan, totalPengeluaran, saldoAwal, saldoAkhir, totalRows, page, limit }
}

/**
 * Sama dengan getBukuKasUmum, tapi mengembalikan SEMUA baris (tanpa paginasi)
 * untuk keperluan export PDF.
 */
export async function getBukuKasUmumAll(
  filter: Omit<BukuKasFilter, "page" | "limit">
): Promise<BukuKasUmumResult & { allRows: BukuKasRow[] }> {
  const result = await getBukuKasUmum({ ...filter, page: 1, limit: 99999 })
  return { ...result, allRows: result.rows }
}

export type BkuPenerimaanFilter = {
  tglAwal?: string
  tglAkhir?: string
  rekeningId?: string
  unitId?: string
  jenisId?: string
  page?: number
  limit?: number
}

export type BkuPenerimaanRow = {
  no: number
  id: string
  tanggal: string
  nomor_bukti: string
  uraian: string
  jenis_kode: string | null
  jenis_nama: string | null
  jenis_akun: string | null   // akun_pendapatan dari tabel jenis_pendapatan (424112, dst)
  kategori_kode: string | null
  kategori_nama: string | null
  penerimaan: number
  saldo: number
}

export async function getBkuPenerimaan(filter: BkuPenerimaanFilter = {}) {
  await requireRole(["ADMIN", "PIMPINAN"])
  const sb = await createClient()

  const today = new Date()
  const defaultAwal = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0]
  const defaultAkhir = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0]
  
  const tglAwal = filter.tglAwal ?? defaultAwal
  const tglAkhir = filter.tglAkhir ?? defaultAkhir
  const page = filter.page ?? 1
  const limit = filter.limit ?? 25

  // 1. Saldo Awal (total penerimaan sebelum tglAwal di tahun yang sama)
  const awalTahun = `${tglAwal.substring(0, 4)}-01-01`
  let saldoAwal = 0
  if (tglAwal > awalTahun) {
    let qPrev = sb
      .from("penerimaan")
      .select("jumlah")
      .gte("tanggal_terima", awalTahun)
      .lt("tanggal_terima", tglAwal)
      .eq("status", "verified")
    
    if (filter.rekeningId) qPrev = qPrev.eq("rekening_bank_id", filter.rekeningId)
    if (filter.unitId) qPrev = qPrev.eq("unit_kerja_id", filter.unitId)
    if (filter.jenisId) qPrev = qPrev.eq("jenis_pendapatan_id", filter.jenisId)

    const { data: prevData } = await qPrev
    saldoAwal = (prevData ?? []).reduce((sum, r) => sum + Number(r.jumlah), 0)
  }

  // 2. Transaksi dalam rentang tanggal
  let qCurr = sb
    .from("penerimaan")
    .select(`
      id, tanggal_terima, nomor_bukti, uraian, jumlah, created_at,
      jenis:jenis_pendapatan(kode, nama, akun_pendapatan, kategori:kategori_pendapatan(kode, nama))
    `)
    .gte("tanggal_terima", tglAwal)
    .lte("tanggal_terima", endOfDay(tglAkhir))
    .eq("status", "verified")

  if (filter.rekeningId) qCurr = qCurr.eq("rekening_bank_id", filter.rekeningId)
  if (filter.unitId) qCurr = qCurr.eq("unit_kerja_id", filter.unitId)
  if (filter.jenisId) qCurr = qCurr.eq("jenis_pendapatan_id", filter.jenisId)

  const { data: currentData, error } = await qCurr
    .order("tanggal_terima")
    .order("created_at")

  if (error) {
    console.error("getBkuPenerimaan error:", error)
    return { rows: [], saldoAwal: 0, saldoAkhir: 0, totalPenerimaan: 0, totalRows: 0, page, limit }
  }

  const raw = currentData ?? []
  const totalPenerimaan = raw.reduce((sum, r) => sum + Number(r.jumlah), 0)
  
  let saldoBerjalan = saldoAwal
  const allRows: BkuPenerimaanRow[] = raw.map((r, i) => {
    const jumlah = Number(r.jumlah)
    saldoBerjalan += jumlah
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jenis = (Array.isArray(r.jenis) ? r.jenis[0] : r.jenis) as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kat = jenis ? (Array.isArray(jenis.kategori) ? jenis.kategori[0] : jenis.kategori) as any : null
    return {
      no: i + 1,
      id: r.id,
      tanggal: r.tanggal_terima,
      nomor_bukti: r.nomor_bukti ?? "-",
      uraian: r.uraian ?? "-",
      jenis_kode: jenis?.kode ?? null,
      jenis_nama: jenis?.nama ?? null,
      jenis_akun: jenis?.akun_pendapatan ?? null,
      kategori_kode: kat?.kode ?? null,
      kategori_nama: kat?.nama ?? null,
      penerimaan: jumlah,
      saldo: saldoBerjalan
    }
  })

  const saldoAkhir = saldoBerjalan
  const totalRows = allRows.length
  const offset = (page - 1) * limit
  const rows = allRows.slice(offset, offset + limit)

  return { rows, saldoAwal, saldoAkhir, totalPenerimaan, totalRows, page, limit }
}

/**
 * Sama dengan getBkuPenerimaan, tapi mengembalikan SEMUA baris (tanpa paginasi)
 * untuk keperluan export PDF.
 */
export async function getBkuPenerimaanAll(
  filter: Omit<BkuPenerimaanFilter, "page" | "limit">
): Promise<{
  rows: BkuPenerimaanRow[]
  saldoAwal: number
  saldoAkhir: number
  totalPenerimaan: number
  totalRows: number
  page: number
  limit: number
}> {
  return getBkuPenerimaan({ ...filter, page: 1, limit: 999999 })
}

// ─── Realisasi Pendapatan ───────────────────────────────────────────────────

export type RealisasiPendapatanRow = {
  akun_pendapatan: string
  nama_jenis: string
  jumlah: number
}

export async function getRealisasiPendapatan(tglAwal: string, tglAkhir: string): Promise<RealisasiPendapatanRow[]> {
  await requireRole(["ADMIN", "PIMPINAN"])
  if (!ISO_DATE_RE.test(tglAwal) || !ISO_DATE_RE.test(tglAkhir)) return []
  
  const sb = await createClient()
  
  const BATCH = 1000
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any[] = []
  let offset = 0
  const baseQ = sb
    .from("penerimaan")
    .select(`jumlah, jenis:jenis_pendapatan(nama, akun_pendapatan)`)
    .gte("tanggal_terima", tglAwal)
    .lte("tanggal_terima", endOfDay(tglAkhir))
    .eq("status", "verified")

  while (true) {
    const { data, error } = await baseQ.range(offset, offset + BATCH - 1)
    if (error || !data || data.length === 0) break
    raw.push(...data)
    if (data.length < BATCH) break
    offset += BATCH
  }

  const grouped = new Map<string, RealisasiPendapatanRow>()

  for (const r of raw) {
    const jenis = Array.isArray(r.jenis) ? r.jenis[0] : r.jenis
    if (!jenis) continue
    const akun = jenis.akun_pendapatan || "-"
    const nama = jenis.nama || "Tanpa Jenis"
    const jumlah = Number(r.jumlah) || 0
    
    const key = `${akun}-${nama}`
    const existing = grouped.get(key)
    if (existing) {
      existing.jumlah += jumlah
    } else {
      grouped.set(key, { akun_pendapatan: akun, nama_jenis: nama, jumlah })
    }
  }

  return Array.from(grouped.values()).sort((a, b) => a.akun_pendapatan.localeCompare(b.akun_pendapatan))
}

export type RealisasiPendapatanRekeningItem = {
  akun_pendapatan: string
  nama_jenis: string
  jumlah: number
}

export type RealisasiPendapatanRekeningGroup = {
  nama_bank: string
  nama_rekening: string
  nomor_rekening: string
  subtotal: number
  items: RealisasiPendapatanRekeningItem[]
}

export async function getRealisasiPendapatanPerRekening(tglAwal: string, tglAkhir: string): Promise<RealisasiPendapatanRekeningGroup[]> {
  await requireRole(["ADMIN", "PIMPINAN"])
  if (!ISO_DATE_RE.test(tglAwal) || !ISO_DATE_RE.test(tglAkhir)) return []
  
  const sb = await createClient()
  
  const BATCH = 1000
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any[] = []
  let offset = 0
  const baseQ = sb
    .from("penerimaan")
    .select(`
      jumlah, 
      jenis:jenis_pendapatan(nama, akun_pendapatan),
      rekening:rekening_bank(nama_bank, nama_rekening, nomor_rekening)
    `)
    .gte("tanggal_terima", tglAwal)
    .lte("tanggal_terima", endOfDay(tglAkhir))
    .eq("status", "verified")

  while (true) {
    const { data, error } = await baseQ.range(offset, offset + BATCH - 1)
    if (error || !data || data.length === 0) break
    raw.push(...data)
    if (data.length < BATCH) break
    offset += BATCH
  }

  const grouped = new Map<string, RealisasiPendapatanRekeningGroup>()

  for (const r of raw) {
    const jenis = Array.isArray(r.jenis) ? r.jenis[0] : r.jenis
    const rekening = Array.isArray(r.rekening) ? r.rekening[0] : r.rekening
    
    if (!jenis) continue
    
    const akun = jenis.akun_pendapatan || "-"
    const nama_jenis = jenis.nama || "Tanpa Jenis"
    const nama_bank = rekening?.nama_bank || "-"
    const nama_rekening = rekening?.nama_rekening || "-"
    const nomor_rekening = rekening?.nomor_rekening || "-"
    const jumlah = Number(r.jumlah) || 0
    
    const groupKey = `${nama_bank}-${nama_rekening}-${nomor_rekening}`
    let group = grouped.get(groupKey)
    if (!group) {
      group = {
        nama_bank,
        nama_rekening,
        nomor_rekening,
        subtotal: 0,
        items: []
      }
      grouped.set(groupKey, group)
    }

    group.subtotal += jumlah
    
    const existingItem = group.items.find(i => i.akun_pendapatan === akun && i.nama_jenis === nama_jenis)
    if (existingItem) {
      existingItem.jumlah += jumlah
    } else {
      group.items.push({ akun_pendapatan: akun, nama_jenis, jumlah })
    }
  }

  const result = Array.from(grouped.values())
  result.sort((a, b) => a.nama_bank.localeCompare(b.nama_bank))
  
  for (const g of result) {
    g.items.sort((a, b) => a.akun_pendapatan.localeCompare(b.akun_pendapatan))
  }

  return result
}

// ─── Realisasi Pendapatan Detail (Kategori → Jenis → Sub) ──────────────────

export type RealisasiSubRow = {
  kode_sub: string | null
  nama_sub: string | null
  jumlah: number
}

export type RealisasiJenisRow = {
  akun_pendapatan: string
  kode_jenis: string
  nama_jenis: string
  jumlah: number
  sub: RealisasiSubRow[]
}

export type RealisasiKategoriGroup = {
  kode_kategori: string
  nama_kategori: string
  jumlah: number
  jenis: RealisasiJenisRow[]
}

export async function getRealisasiPendapatanDetail(
  tglAwal: string,
  tglAkhir: string
): Promise<RealisasiKategoriGroup[]> {
  await requireRole(["ADMIN", "PIMPINAN"])
  if (!ISO_DATE_RE.test(tglAwal) || !ISO_DATE_RE.test(tglAkhir)) return []

  const sb = await createClient()

  const BATCH = 1000
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any[] = []
  let offset = 0
  const baseQ = sb
    .from("penerimaan")
    .select(`
      jumlah,
      jenis:jenis_pendapatan(kode, nama, akun_pendapatan, kategori:kategori_pendapatan(kode, nama)),
      sub:sub_pendapatan(kode, nama)
    `)
    .gte("tanggal_terima", tglAwal)
    .lte("tanggal_terima", endOfDay(tglAkhir))
    .eq("status", "verified")

  while (true) {
    const { data, error } = await baseQ.range(offset, offset + BATCH - 1)
    if (error || !data || data.length === 0) break
    raw.push(...data)
    if (data.length < BATCH) break
    offset += BATCH
  }

  // Map: kode_kategori → RealisasiKategoriGroup (with nested jenis map)
  const katMap = new Map<string, {
    kode_kategori: string
    nama_kategori: string
    jumlah: number
    jenisMap: Map<string, {
      akun_pendapatan: string
      kode_jenis: string
      nama_jenis: string
      jumlah: number
      subMap: Map<string, { kode_sub: string | null; nama_sub: string | null; jumlah: number }>
    }>
  }>()

  for (const r of raw) {
    const jenis = Array.isArray(r.jenis) ? r.jenis[0] : r.jenis
    if (!jenis) continue

    const kat = Array.isArray(jenis.kategori) ? jenis.kategori[0] : jenis.kategori
    const sub = Array.isArray(r.sub) ? r.sub[0] : r.sub

    const kodeKat = kat?.kode ?? "__tanpa_kategori__"
    const namaKat = kat?.nama ?? "Tanpa Kategori"
    const kodeJenis = jenis.kode ?? "__tanpa_jenis__"
    const namaJenis = jenis.nama ?? "Tanpa Jenis"
    const akun = jenis.akun_pendapatan ?? "-"
    const jumlah = Number(r.jumlah) || 0

    // Ensure kategori entry
    if (!katMap.has(kodeKat)) {
      katMap.set(kodeKat, { kode_kategori: kodeKat, nama_kategori: namaKat, jumlah: 0, jenisMap: new Map() })
    }
    const katEntry = katMap.get(kodeKat)!
    katEntry.jumlah += jumlah

    // Ensure jenis entry
    if (!katEntry.jenisMap.has(kodeJenis)) {
      katEntry.jenisMap.set(kodeJenis, { akun_pendapatan: akun, kode_jenis: kodeJenis, nama_jenis: namaJenis, jumlah: 0, subMap: new Map() })
    }
    const jenisEntry = katEntry.jenisMap.get(kodeJenis)!
    jenisEntry.jumlah += jumlah

    // Accumulate sub pendapatan (if exists)
    if (sub) {
      const kodeSub = sub.kode ?? "__sub__"
      const namaSub = sub.nama ?? "Tanpa Sub"
      if (!jenisEntry.subMap.has(kodeSub)) {
        jenisEntry.subMap.set(kodeSub, { kode_sub: sub.kode ?? null, nama_sub: sub.nama ?? null, jumlah: 0 })
      }
      jenisEntry.subMap.get(kodeSub)!.jumlah += jumlah
    }
  }

  // Convert maps to sorted arrays
  const result: RealisasiKategoriGroup[] = []
  for (const katEntry of katMap.values()) {
    const jenisList: RealisasiJenisRow[] = []
    for (const jenisEntry of katEntry.jenisMap.values()) {
      jenisList.push({
        akun_pendapatan: jenisEntry.akun_pendapatan,
        kode_jenis: jenisEntry.kode_jenis,
        nama_jenis: jenisEntry.nama_jenis,
        jumlah: jenisEntry.jumlah,
        sub: Array.from(jenisEntry.subMap.values()).sort((a, b) =>
          (a.kode_sub ?? "").localeCompare(b.kode_sub ?? "")
        ),
      })
    }
    jenisList.sort((a, b) => a.akun_pendapatan.localeCompare(b.akun_pendapatan))
    result.push({
      kode_kategori: katEntry.kode_kategori,
      nama_kategori: katEntry.nama_kategori,
      jumlah: katEntry.jumlah,
      jenis: jenisList,
    })
  }
  result.sort((a, b) => a.kode_kategori.localeCompare(b.kode_kategori))

  return result
}

// ─── Realisasi Pendapatan Bulanan (Pivot Per Bulan) ────────────────────────────

export type BulananSubRow = {
  kode_sub: string | null
  nama_sub: string | null
  perBulan: number[]  // index 0..11 → Jan..Des
  total: number
}

export type BulananJenisRow = {
  akun_pendapatan: string
  kode_jenis: string
  nama_jenis: string
  perBulan: number[]
  total: number
  target: number
  pct: number
  sub: BulananSubRow[]
}

export type BulananKategoriGroup = {
  kode_kategori: string
  nama_kategori: string
  nomorRomawi: string
  perBulan: number[]
  total: number
  jenis: BulananJenisRow[]
}

export type RealisasiPendapatanBulananResult = {
  tahun: number
  kategori: BulananKategoriGroup[]
  grandPerBulan: number[]
  grandTotal: number
  grandTarget: number
  grandPct: number
}

const ROMAWI = ["I","II","III","IV","V","VI","VII","VIII","IX","X"]

export async function getRealisasiPendapatanBulanan(
  tahun: number
): Promise<RealisasiPendapatanBulananResult> {
  await requireRole(["ADMIN", "PIMPINAN"])

  const empty: RealisasiPendapatanBulananResult = {
    tahun, kategori: [],
    grandPerBulan: new Array(12).fill(0),
    grandTotal: 0, grandTarget: 0, grandPct: 0,
  }

  if (tahun < 2000 || tahun > 2100) return empty

  const sb = await createClient()
  const tglAwal = `${tahun}-01-01`
  const tglAkhir = `${tahun}-12-31`

  // ── 1. Ambil data penerimaan per bulan ──
  const BATCH = 1000
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any[] = []
  let offset = 0
  const baseQ = sb
    .from("penerimaan")
    .select(`
      jumlah, tanggal_terima,
      jenis:jenis_pendapatan(kode, nama, akun_pendapatan, kategori:kategori_pendapatan(kode, nama)),
      sub:sub_pendapatan(kode, nama)
    `)
    .gte("tanggal_terima", tglAwal)
    .lte("tanggal_terima", endOfDay(tglAkhir))
    .eq("status", "verified")

  while (true) {
    const { data, error } = await baseQ.range(offset, offset + BATCH - 1)
    if (error || !data || data.length === 0) break
    raw.push(...data)
    if (data.length < BATCH) break
    offset += BATCH
  }

  // ── 2. Ambil semua target untuk tahun ini ──
  const targetMap = new Map<string, number>()
  try {
    const { data: targetData } = await sb
      .from("target_pendapatan")
      .select("jenis_pendapatan_id, target, jenis:jenis_pendapatan(kode)")
      .eq("tahun", tahun)

    for (const t of targetData ?? []) {
      const val = Number(t.target) || 0
      if (t.jenis_pendapatan_id) targetMap.set(t.jenis_pendapatan_id, val)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jenis = Array.isArray(t.jenis) ? (t.jenis[0] as any) : (t.jenis as any)
      const kode = jenis?.kode as string | undefined
      if (kode) targetMap.set(kode, val)
    }
  } catch {
    // Graceful fallback jika tabel target_pendapatan belum dibuat
  }

  // ── 3. Pivot: Kategori → Jenis → Sub → per bulan ──
  type SubEntry = { kode_sub: string | null; nama_sub: string | null; perBulan: number[] }
  type JenisEntry = {
    jenis_id?: string
    akun_pendapatan: string; kode_jenis: string; nama_jenis: string
    perBulan: number[]; subMap: Map<string, SubEntry>
  }
  type KatEntry = {
    kode_kategori: string; nama_kategori: string
    perBulan: number[]; jenisMap: Map<string, JenisEntry>
  }

  const katMap = new Map<string, KatEntry>()

  // Pre-populate dengan semua jenis_pendapatan aktif agar item dengan target/tanpa realisasi tetap tampil
  try {
    const { data: allJenis } = await sb
      .from("jenis_pendapatan")
      .select("id, kode, nama, akun_pendapatan, kategori:kategori_pendapatan(kode, nama)")
      .eq("is_active", true)
      .order("akun_pendapatan", { ascending: true })

    for (const j of allJenis ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const kat = Array.isArray(j.kategori) ? (j.kategori[0] as any) : (j.kategori as any)
      const kodeKat = kat?.kode ?? "__tanpa_kategori__"
      const namaKat = kat?.nama ?? "Tanpa Kategori"
      const kodeJenis = j.kode ?? j.id
      const namaJenis = j.nama ?? "Tanpa Jenis"
      const akun = j.akun_pendapatan ?? "-"

      if (!katMap.has(kodeKat)) {
        katMap.set(kodeKat, { kode_kategori: kodeKat, nama_kategori: namaKat, perBulan: new Array(12).fill(0), jenisMap: new Map() })
      }
      const katEntry = katMap.get(kodeKat)!
      if (!katEntry.jenisMap.has(kodeJenis)) {
        katEntry.jenisMap.set(kodeJenis, { jenis_id: j.id, akun_pendapatan: akun, kode_jenis: kodeJenis, nama_jenis: namaJenis, perBulan: new Array(12).fill(0), subMap: new Map() })
      }
    }
  } catch {
    // Fallback jika query jenis_pendapatan gagal
  }

  for (const r of raw) {
    const jumlah = Number(r.jumlah) || 0
    const tgl = r.tanggal_terima as string
    const bulanIdx = tgl ? new Date(tgl + "T00:00:00").getMonth() : -1
    if (bulanIdx < 0) continue

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jenis = (Array.isArray(r.jenis) ? r.jenis[0] : r.jenis) as any
    if (!jenis) continue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kat = (Array.isArray(jenis.kategori) ? jenis.kategori[0] : jenis.kategori) as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sub = (Array.isArray(r.sub) ? r.sub[0] : r.sub) as any

    const kodeKat = kat?.kode ?? "__tanpa_kategori__"
    const namaKat = kat?.nama ?? "Tanpa Kategori"
    const kodeJenis = jenis.kode ?? "__tanpa_jenis__"
    const namaJenis = jenis.nama ?? "Tanpa Jenis"
    const akun = jenis.akun_pendapatan ?? "-"

    if (!katMap.has(kodeKat)) {
      katMap.set(kodeKat, { kode_kategori: kodeKat, nama_kategori: namaKat, perBulan: new Array(12).fill(0), jenisMap: new Map() })
    }
    const katEntry = katMap.get(kodeKat)!
    katEntry.perBulan[bulanIdx] += jumlah

    if (!katEntry.jenisMap.has(kodeJenis)) {
      katEntry.jenisMap.set(kodeJenis, { jenis_id: jenis.id, akun_pendapatan: akun, kode_jenis: kodeJenis, nama_jenis: namaJenis, perBulan: new Array(12).fill(0), subMap: new Map() })
    }
    const jenisEntry = katEntry.jenisMap.get(kodeJenis)!
    jenisEntry.perBulan[bulanIdx] += jumlah

    if (sub) {
      const kodeSub = sub.kode ?? "__sub__"
      if (!jenisEntry.subMap.has(kodeSub)) {
        jenisEntry.subMap.set(kodeSub, { kode_sub: sub.kode ?? null, nama_sub: sub.nama ?? null, perBulan: new Array(12).fill(0) })
      }
      jenisEntry.subMap.get(kodeSub)!.perBulan[bulanIdx] += jumlah
    }
  }

  // ── 4. Serialisasi ke output ──
  const kategori: BulananKategoriGroup[] = []
  let romIdx = 0
  const grandPerBulan = new Array(12).fill(0) as number[]
  let grandTotal = 0
  let grandTarget = 0

  for (const [, katEntry] of katMap) {
    if (katEntry.kode_kategori === "__tanpa_kategori__") continue

    const katTotal = katEntry.perBulan.reduce((s, v) => s + v, 0)
    const jenisList: BulananJenisRow[] = []

    for (const [, jenisEntry] of katEntry.jenisMap) {
      const jenisTotal = jenisEntry.perBulan.reduce((s, v) => s + v, 0)
      const target = (jenisEntry.jenis_id ? targetMap.get(jenisEntry.jenis_id) : undefined) ?? targetMap.get(jenisEntry.kode_jenis) ?? 0
      const pct = target > 0 ? Math.round((jenisTotal / target) * 10000) / 100 : 0

      const subList: BulananSubRow[] = Array.from(jenisEntry.subMap.values())
        .sort((a, b) => (a.kode_sub ?? "").localeCompare(b.kode_sub ?? ""))
        .map((s) => ({ ...s, total: s.perBulan.reduce((acc, v) => acc + v, 0) }))

      jenisList.push({
        akun_pendapatan: jenisEntry.akun_pendapatan,
        kode_jenis: jenisEntry.kode_jenis,
        nama_jenis: jenisEntry.nama_jenis,
        perBulan: jenisEntry.perBulan,
        total: jenisTotal,
        target,
        pct,
        sub: subList,
      })
    }

    jenisList.sort((a, b) => a.akun_pendapatan.localeCompare(b.akun_pendapatan))

    for (let i = 0; i < 12; i++) grandPerBulan[i] += katEntry.perBulan[i]
    grandTotal += katTotal
    grandTarget += jenisList.reduce((s, j) => s + j.target, 0)

    kategori.push({
      kode_kategori: katEntry.kode_kategori,
      nama_kategori: katEntry.nama_kategori,
      nomorRomawi: ROMAWI[romIdx++] ?? String(romIdx),
      perBulan: katEntry.perBulan,
      total: katTotal,
      jenis: jenisList,
    })
  }

  kategori.sort((a, b) => a.kode_kategori.localeCompare(b.kode_kategori))
  const grandPct = grandTarget > 0 ? Math.round((grandTotal / grandTarget) * 10000) / 100 : 0

  return { tahun, kategori, grandPerBulan, grandTotal, grandTarget, grandPct }
}

// ─── Laporan Realisasi Pendapatan Triwulan (Tanpa Sub Jenis Pendapatan) ────────

export type TriwulanJenisRow = {
  akun_pendapatan: string
  kode_jenis: string
  nama_jenis: string
  tw1: number
  tw2: number
  tw3: number
  tw4: number
  total: number
  target: number
  pct: number
}

export type TriwulanKategoriGroup = {
  kode_kategori: string
  nama_kategori: string
  nomorRomawi: string
  tw1: number
  tw2: number
  tw3: number
  tw4: number
  total: number
  jenis: TriwulanJenisRow[]
}

export type RealisasiPendapatanTriwulanResult = {
  tahun: number
  kategori: TriwulanKategoriGroup[]
  grandTw1: number
  grandTw2: number
  grandTw3: number
  grandTw4: number
  grandTotal: number
  grandTarget: number
  grandPct: number
}

export async function getRealisasiPendapatanTriwulan(
  tahun: number
): Promise<RealisasiPendapatanTriwulanResult> {
  await requireRole(["ADMIN", "PIMPINAN"])

  const bulanan = await getRealisasiPendapatanBulanan(tahun)

  const kategori: TriwulanKategoriGroup[] = bulanan.kategori.map((k) => {
    const tw1 = (k.perBulan[0] || 0) + (k.perBulan[1] || 0) + (k.perBulan[2] || 0)
    const tw2 = (k.perBulan[3] || 0) + (k.perBulan[4] || 0) + (k.perBulan[5] || 0)
    const tw3 = (k.perBulan[6] || 0) + (k.perBulan[7] || 0) + (k.perBulan[8] || 0)
    const tw4 = (k.perBulan[9] || 0) + (k.perBulan[10] || 0) + (k.perBulan[11] || 0)

    const jenis: TriwulanJenisRow[] = k.jenis.map((j) => {
      const jTw1 = (j.perBulan[0] || 0) + (j.perBulan[1] || 0) + (j.perBulan[2] || 0)
      const jTw2 = (j.perBulan[3] || 0) + (j.perBulan[4] || 0) + (j.perBulan[5] || 0)
      const jTw3 = (j.perBulan[6] || 0) + (j.perBulan[7] || 0) + (j.perBulan[8] || 0)
      const jTw4 = (j.perBulan[9] || 0) + (j.perBulan[10] || 0) + (j.perBulan[11] || 0)
      const jTotal = jTw1 + jTw2 + jTw3 + jTw4
      const jPct = j.target > 0 ? Math.round((jTotal / j.target) * 10000) / 100 : 0

      return {
        akun_pendapatan: j.akun_pendapatan,
        kode_jenis: j.kode_jenis,
        nama_jenis: j.nama_jenis,
        tw1: jTw1,
        tw2: jTw2,
        tw3: jTw3,
        tw4: jTw4,
        total: jTotal,
        target: j.target,
        pct: jPct,
      }
    })

    return {
      kode_kategori: k.kode_kategori,
      nama_kategori: k.nama_kategori,
      nomorRomawi: k.nomorRomawi,
      tw1,
      tw2,
      tw3,
      tw4,
      total: tw1 + tw2 + tw3 + tw4,
      jenis,
    }
  })

  const grandTw1 = (bulanan.grandPerBulan[0] || 0) + (bulanan.grandPerBulan[1] || 0) + (bulanan.grandPerBulan[2] || 0)
  const grandTw2 = (bulanan.grandPerBulan[3] || 0) + (bulanan.grandPerBulan[4] || 0) + (bulanan.grandPerBulan[5] || 0)
  const grandTw3 = (bulanan.grandPerBulan[6] || 0) + (bulanan.grandPerBulan[7] || 0) + (bulanan.grandPerBulan[8] || 0)
  const grandTw4 = (bulanan.grandPerBulan[9] || 0) + (bulanan.grandPerBulan[10] || 0) + (bulanan.grandPerBulan[11] || 0)

  return {
    tahun,
    kategori,
    grandTw1,
    grandTw2,
    grandTw3,
    grandTw4,
    grandTotal: bulanan.grandTotal,
    grandTarget: bulanan.grandTarget,
    grandPct: bulanan.grandPct,
  }
}

// ─── Posisi Rekening ──────────────────────────────────────────────────────────

export type PosisiRekeningRow = {
  rekeningId: string
  namaBank: string
  nomorRekening: string
  namaRekening: string
  saldoAwal: number
  totalPenerimaan: number
  totalPengeluaran: number
  saldoAkhir: number
}

export async function rekapPosisiRekening(
  tahun: number,
  bulan: number | null,
): Promise<PosisiRekeningRow[]> {
  await requireRole(["ADMIN", "PIMPINAN"])
  if (tahun < 2000 || tahun > 2100) return []

  const sb = await createClient()

  // Tentukan rentang tanggal berdasarkan filter bulan
  const tglAwal = bulan !== null
    ? `${tahun}-${String(bulan).padStart(2, "0")}-01`
    : `${tahun}-01-01`
  const tglAkhir = bulan !== null
    ? `${tahun}-${String(bulan).padStart(2, "0")}-${new Date(tahun, bulan, 0).getDate()}`
    : `${tahun}-12-31`

  // Ambil semua rekening aktif
  const { data: rekeningList, error: rekeningError } = await sb
    .from("rekening_bank")
    .select("id, nama_bank, nomor_rekening, nama_rekening")
    .eq("is_active", true)
    .order("kode")

  if (rekeningError || !rekeningList || rekeningList.length === 0) return []

  const rekeningIds = rekeningList.map((r) => r.id)

  // Ambil saldo awal per rekening (selalu dari 1 Januari tahun bersangkutan)
  const { data: saldoAwalData } = await sb
    .from("saldo_awal_rekening")
    .select("rekening_bank_id, saldo")
    .in("rekening_bank_id", rekeningIds)
    .eq("tahun", tahun)

  const saldoAwalMap = new Map<string, number>()
  for (const s of saldoAwalData ?? []) {
    saldoAwalMap.set(s.rekening_bank_id, Number(s.saldo))
  }

  // Agregasi penerimaan per rekening
  const penerimaanMap = new Map<string, number>()
  const BATCH = 1000
  const penQ = sb
    .from("penerimaan")
    .select("jumlah, rekening_bank_id")
    .in("rekening_bank_id", rekeningIds)
    .eq("status", "verified")
    .gte("tanggal_terima", tglAwal)
    .lte("tanggal_terima", endOfDay(tglAkhir))
  let penOffset = 0
  while (true) {
    const { data: batch, error } = await penQ.range(penOffset, penOffset + BATCH - 1)
    if (error || !batch || batch.length === 0) break
    for (const row of batch) {
      const prev = penerimaanMap.get(row.rekening_bank_id) ?? 0
      penerimaanMap.set(row.rekening_bank_id, prev + Number(row.jumlah))
    }
    if (batch.length < BATCH) break
    penOffset += BATCH
  }

  // Agregasi pengeluaran per rekening
  const pengeluaranMap = new Map<string, number>()
  const kelQ = sb
    .from("pengeluaran")
    .select("jumlah, rekening_bank_id")
    .in("rekening_bank_id", rekeningIds)
    .eq("status", "verified")
    .gte("tanggal", tglAwal)
    .lte("tanggal", tglAkhir)
  let kelOffset = 0
  while (true) {
    const { data: batch, error } = await kelQ.range(kelOffset, kelOffset + BATCH - 1)
    if (error || !batch || batch.length === 0) break
    for (const row of batch) {
      const prev = pengeluaranMap.get(row.rekening_bank_id) ?? 0
      pengeluaranMap.set(row.rekening_bank_id, prev + Number(row.jumlah))
    }
    if (batch.length < BATCH) break
    kelOffset += BATCH
  }

  return rekeningList.map((rek) => {
    const saldoAwal = saldoAwalMap.get(rek.id) ?? 0
    const totalPenerimaan = penerimaanMap.get(rek.id) ?? 0
    const totalPengeluaran = pengeluaranMap.get(rek.id) ?? 0
    return {
      rekeningId: rek.id,
      namaBank: rek.nama_bank,
      nomorRekening: rek.nomor_rekening,
      namaRekening: rek.nama_rekening,
      saldoAwal,
      totalPenerimaan,
      totalPengeluaran,
      saldoAkhir: saldoAwal + totalPenerimaan - totalPengeluaran,
    }
  })
}

// ─── Posisi Kas Bulanan (Mutasi Bulanan) ──────────────────────────────────────

export type PosisiKasBulananRow = {
  bulan: number
  namaBulan: string
  saldoAwal: number
  pemasukan: number
  pengeluaran: number
  saldoAkhir: number
}

export type PosisiKasBulananResult = {
  tahun: number
  rekeningId: string
  namaBank: string
  namaRekening: string
  nomorRekening: string
  saldoAwalTahun: number
  totalPemasukan: number
  totalPengeluaran: number
  saldoAkhirTahun: number
  rows: PosisiKasBulananRow[]
}

export async function rekapPosisiKasBulanan(
  tahun: number,
  rekeningId?: string
): Promise<PosisiKasBulananResult | null> {
  await requireRole(["ADMIN", "PIMPINAN"])
  if (tahun < 2000 || tahun > 2100) return null

  const sb = await createClient()
  const tglAwal = `${tahun}-01-01`
  const tglAkhir = `${tahun}-12-31`
  const isAll = !rekeningId || rekeningId === "__ALL__"

  let namaBank = "Semua Bank (Konsolidasi)"
  let namaRekening = "Konsolidasi Seluruh Rekening"
  let nomorRekening = "—"
  let saldoAwalTahun = 0

  if (isAll) {
    const { data: saldoAwalData } = await sb
      .from("saldo_awal_rekening")
      .select("saldo")
      .eq("tahun", tahun)
    saldoAwalTahun = (saldoAwalData ?? []).reduce((s, r) => s + Number(r.saldo), 0)
  } else {
    const [rekRes, saldoRes] = await Promise.all([
      sb.from("rekening_bank").select("id, kode, nama_bank, nama_rekening, nomor_rekening").eq("id", rekeningId).single(),
      sb.from("saldo_awal_rekening").select("saldo").eq("rekening_bank_id", rekeningId).eq("tahun", tahun).maybeSingle(),
    ])
    if (rekRes.error || !rekRes.data) return null
    namaBank = rekRes.data.nama_bank
    namaRekening = rekRes.data.nama_rekening
    nomorRekening = rekRes.data.nomor_rekening
    saldoAwalTahun = Number(saldoRes.data?.saldo ?? 0)
  }

  const BATCH = 1000
  const penerimaanPerBulan = new Array(12).fill(0) as number[]
  const pengeluaranPerBulan = new Array(12).fill(0) as number[]

  let penQ = sb
    .from("penerimaan")
    .select("jumlah, tanggal_terima")
    .eq("status", "verified")
    .gte("tanggal_terima", tglAwal)
    .lte("tanggal_terima", endOfDay(tglAkhir))
  if (!isAll) {
    penQ = penQ.eq("rekening_bank_id", rekeningId)
  }
  let penOffset = 0
  while (true) {
    const { data: batch, error } = await penQ.range(penOffset, penOffset + BATCH - 1)
    if (error || !batch || batch.length === 0) break
    for (const row of batch) {
      const bln = new Date(row.tanggal_terima + "T00:00:00").getMonth()
      penerimaanPerBulan[bln] += Number(row.jumlah)
    }
    if (batch.length < BATCH) break
    penOffset += BATCH
  }

  let kelQ = sb
    .from("pengeluaran")
    .select("jumlah, tanggal")
    .eq("status", "verified")
    .gte("tanggal", tglAwal)
    .lte("tanggal", tglAkhir)
  if (!isAll) {
    kelQ = kelQ.eq("rekening_bank_id", rekeningId)
  }
  let kelOffset = 0
  while (true) {
    const { data: batch, error } = await kelQ.range(kelOffset, kelOffset + BATCH - 1)
    if (error || !batch || batch.length === 0) break
    for (const row of batch) {
      const bln = new Date(row.tanggal + "T00:00:00").getMonth()
      pengeluaranPerBulan[bln] += Number(row.jumlah)
    }
    if (batch.length < BATCH) break
    kelOffset += BATCH
  }

  let berjalan = saldoAwalTahun
  const rows: PosisiKasBulananRow[] = []
  for (let i = 0; i < 12; i++) {
    const pem = penerimaanPerBulan[i]
    const peng = pengeluaranPerBulan[i]
    const sAwal = berjalan
    const sAkhir = sAwal + pem - peng
    berjalan = sAkhir
    rows.push({
      bulan: i + 1,
      namaBulan: BULAN_NAMA[i],
      saldoAwal: sAwal,
      pemasukan: pem,
      pengeluaran: peng,
      saldoAkhir: sAkhir,
    })
  }

  const totalPemasukan = penerimaanPerBulan.reduce((s, v) => s + v, 0)
  const totalPengeluaran = pengeluaranPerBulan.reduce((s, v) => s + v, 0)

  return {
    tahun,
    rekeningId: isAll ? "__ALL__" : rekeningId!,
    namaBank,
    namaRekening,
    nomorRekening,
    saldoAwalTahun,
    totalPemasukan,
    totalPengeluaran,
    saldoAkhirTahun: saldoAwalTahun + totalPemasukan - totalPengeluaran,
    rows,
  }
}
