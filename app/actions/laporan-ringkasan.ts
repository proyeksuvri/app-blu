"use server"

import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/session"

function endOfDay(tgl: string): string {
  return `${tgl}T23:59:59+08:00`
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export type RingkasanJenisRow = {
  akun_pendapatan: string
  kode_jenis: string
  nama_jenis: string
  perBulan: number[] // 0..11 → Jan..Des
  total: number
  target: number
  pct: number
}

export type RingkasanKategoriGroup = {
  kode_kategori: string
  nama_kategori: string
  nomorRomawi: string
  perBulan: number[]
  total: number
  jenis: RingkasanJenisRow[]
}

export type RealisasiPendapatanRingkasanResult = {
  tahun: number
  kategori: RingkasanKategoriGroup[]
  grandPerBulan: number[]
  grandTotal: number
  grandTarget: number
  grandPct: number
}

const ROMAWI = ["I","II","III","IV","V","VI","VII","VIII","IX","X"]

export async function getRealisasiPendapatanRingkasan(
  tahun: number
): Promise<RealisasiPendapatanRingkasanResult> {
  await requireRole(["ADMIN"])

  const empty: RealisasiPendapatanRingkasanResult = {
    tahun, kategori: [],
    grandPerBulan: new Array(12).fill(0),
    grandTotal: 0, grandTarget: 0, grandPct: 0,
  }

  if (tahun < 2000 || tahun > 2100) return empty

  const sb = await createClient()
  const tglAwal = `${tahun}-01-01`
  const tglAkhir = `${tahun}-12-31`

  // ── 1. Ambil penerimaan (tanpa sub join agar lebih ringan) ──
  const BATCH = 1000
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any[] = []
  let offset = 0
  const baseQ = sb
    .from("penerimaan")
    .select(`
      jumlah, tanggal_terima,
      jenis:jenis_pendapatan(kode, nama, akun_pendapatan, kategori:kategori_pendapatan(kode, nama))
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

  // ── 2. Ambil master jenis_pendapatan & target ──
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

  // ── 3. Pivot: Kategori → Jenis (tanpa Sub) ──
  type JenisEntry = {
    jenis_id?: string
    akun_pendapatan: string
    kode_jenis: string
    nama_jenis: string
    perBulan: number[]
  }
  type KatEntry = {
    kode_kategori: string
    nama_kategori: string
    perBulan: number[]
    jenisMap: Map<string, JenisEntry>
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
        katEntry.jenisMap.set(kodeJenis, { jenis_id: j.id, akun_pendapatan: akun, kode_jenis: kodeJenis, nama_jenis: namaJenis, perBulan: new Array(12).fill(0) })
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
      katEntry.jenisMap.set(kodeJenis, { jenis_id: jenis.id, akun_pendapatan: akun, kode_jenis: kodeJenis, nama_jenis: namaJenis, perBulan: new Array(12).fill(0) })
    }
    katEntry.jenisMap.get(kodeJenis)!.perBulan[bulanIdx] += jumlah
  }

  // ── 4. Serialisasi ──
  const kategori: RingkasanKategoriGroup[] = []
  let romIdx = 0
  const grandPerBulan = new Array(12).fill(0) as number[]
  let grandTotal = 0
  let grandTarget = 0

  for (const [, katEntry] of katMap) {
    if (katEntry.kode_kategori === "__tanpa_kategori__") continue

    const katTotal = katEntry.perBulan.reduce((s, v) => s + v, 0)
    const jenisList: RingkasanJenisRow[] = []

    for (const [, jenisEntry] of katEntry.jenisMap) {
      const jenisTotal = jenisEntry.perBulan.reduce((s, v) => s + v, 0)
      const target = (jenisEntry.jenis_id ? targetMap.get(jenisEntry.jenis_id) : undefined) ?? targetMap.get(jenisEntry.kode_jenis) ?? 0
      const pct = target > 0 ? Math.round((jenisTotal / target) * 10000) / 100 : 0

      jenisList.push({
        akun_pendapatan: jenisEntry.akun_pendapatan,
        kode_jenis: jenisEntry.kode_jenis,
        nama_jenis: jenisEntry.nama_jenis,
        perBulan: jenisEntry.perBulan,
        total: jenisTotal,
        target,
        pct,
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
