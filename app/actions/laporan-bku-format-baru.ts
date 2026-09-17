"use server"

import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/session"

const ISO_DATE_RE = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/

function endOfDay(tgl: string): string {
  return `${tgl}T23:59:59+08:00`
}

export type BukuKasFormatBaruRow = {
  no: number
  id: string
  tipe: "penerimaan" | "pengeluaran"
  tanggal: string
  nomor_bukti: string
  kode_bank: string
  nomor_rekening: string
  uraian: string
  map: string
  penerimaan: number
  pengeluaran: number
  saldo: number
}

export type BukuKasFormatBaruResult = {
  rows: BukuKasFormatBaruRow[]
  saldoAwal: number
  totalPenerimaan: number
  totalPengeluaran: number
  saldoAkhir: number
  totalRows: number
  saldoAwalLabel: string
  periodeLabel: string
  tahun: number
  /** Saldo awal per rekening untuk Buku Pembantu Bank.
   * Key: "${kode_bank}__${nomor_rekening}" — sama dengan key grouping di PDF. */
  saldoAwalPerRekening: Record<string, number>
}

export type BukuKasFormatBaruFilter = {
  tglAwal: string
  tglAkhir: string
  rekeningId?: string
  unitId?: string
}

const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]

export async function getBukuKasUmumFormatBaru(
  filter: BukuKasFormatBaruFilter
): Promise<BukuKasFormatBaruResult> {
  await requireRole(["ADMIN", "PIMPINAN"])

  const empty: BukuKasFormatBaruResult = {
    rows: [],
    saldoAwal: 0,
    totalPenerimaan: 0,
    totalPengeluaran: 0,
    saldoAkhir: 0,
    totalRows: 0,
    saldoAwalLabel: "Saldo Bulan Lalu",
    periodeLabel: "-",
    tahun: new Date().getFullYear(),
    saldoAwalPerRekening: {},
  }

  if (!ISO_DATE_RE.test(filter.tglAwal) || !ISO_DATE_RE.test(filter.tglAkhir)) return empty

  const sb = await createClient()

  const resolve = <T>(v: T | T[] | null | undefined): T | null =>
    v == null ? null : Array.isArray(v) ? (v[0] ?? null) : v

  const BATCH = 1000

  // 1. Ambil seluruh transaksi penerimaan
  let penQBase = sb
    .from("penerimaan")
    .select(`
      id, nomor_bukti, tanggal_terima, jumlah, uraian, created_at, rekening_bank_id,
      rekening:rekening_bank(kode, nama_bank, nama_rekening, nomor_rekening),
      unit:unit_kerja(kode, nama),
      jenis:jenis_pendapatan(kode, nama, akun_pendapatan)
    `)
    .gte("tanggal_terima", filter.tglAwal)
    .lte("tanggal_terima", endOfDay(filter.tglAkhir))
    .eq("status", "verified")

  if (filter.rekeningId && filter.rekeningId !== "__all__") {
    penQBase = penQBase.eq("rekening_bank_id", filter.rekeningId)
  }
  if (filter.unitId && filter.unitId !== "__all__") {
    penQBase = penQBase.eq("unit_kerja_id", filter.unitId)
  }

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

  // 2. Ambil seluruh transaksi pengeluaran
  let kelQBase = sb
    .from("pengeluaran")
    .select(`
      id, nomor_bukti, tanggal, jumlah, uraian, created_at, rekening_bank_id,
      rekening:rekening_bank(kode, nama_bank, nama_rekening, nomor_rekening),
      unit:unit_kerja(kode, nama),
      jenis:jenis_pengeluaran(kode, nama, akun_belanja)
    `)
    .gte("tanggal", filter.tglAwal)
    .lte("tanggal", filter.tglAkhir)
    .eq("status", "verified")

  if (filter.rekeningId && filter.rekeningId !== "__all__") {
    kelQBase = kelQBase.eq("rekening_bank_id", filter.rekeningId)
  }
  if (filter.unitId && filter.unitId !== "__all__") {
    kelQBase = kelQBase.eq("unit_kerja_id", filter.unitId)
  }

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

  // 3. Hitung saldo awal
  const tahunAwal = parseInt(filter.tglAwal.split("-")[0], 10)
  const awalTahun = `${tahunAwal}-01-01`
  let saldoAwal = 0

  if (filter.rekeningId && filter.rekeningId !== "__all__") {
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

  // Akumulasikan transaksi sebelum filter.tglAwal jika tglAwal > awalTahun
  if (filter.tglAwal > awalTahun) {
    let prevPenQ = sb
      .from("penerimaan")
      .select("jumlah")
      .gte("tanggal_terima", awalTahun)
      .lt("tanggal_terima", filter.tglAwal)
      .eq("status", "verified")
    if (filter.rekeningId && filter.rekeningId !== "__all__") prevPenQ = prevPenQ.eq("rekening_bank_id", filter.rekeningId)
    if (filter.unitId && filter.unitId !== "__all__") prevPenQ = prevPenQ.eq("unit_kerja_id", filter.unitId)

    let prevPenOffset = 0
    let totalPrevPen = 0
    while (true) {
      const { data: batch, error } = await prevPenQ.range(prevPenOffset, prevPenOffset + BATCH - 1)
      if (error || !batch || batch.length === 0) break
      for (const row of batch) {
        totalPrevPen += Number(row.jumlah)
      }
      if (batch.length < BATCH) break
      prevPenOffset += BATCH
    }

    let prevKelQ = sb
      .from("pengeluaran")
      .select("jumlah")
      .gte("tanggal", awalTahun)
      .lt("tanggal", filter.tglAwal)
      .eq("status", "verified")
    if (filter.rekeningId && filter.rekeningId !== "__all__") prevKelQ = prevKelQ.eq("rekening_bank_id", filter.rekeningId)
    if (filter.unitId && filter.unitId !== "__all__") prevKelQ = prevKelQ.eq("unit_kerja_id", filter.unitId)

    let prevKelOffset = 0
    let totalPrevKel = 0
    while (true) {
      const { data: batch, error } = await prevKelQ.range(prevKelOffset, prevKelOffset + BATCH - 1)
      if (error || !batch || batch.length === 0) break
      for (const row of batch) {
        totalPrevKel += Number(row.jumlah)
      }
      if (batch.length < BATCH) break
      prevKelOffset += BATCH
    }

    saldoAwal = saldoAwal + totalPrevPen - totalPrevKel
  }

  // 3b. Hitung saldo awal per rekening (untuk Buku Pembantu Bank)
  //     Key: "${kode_bank}__${nomor_rekening}" — sama dengan grouping key di PDF.
  //     Logika: saldo_awal_rekening[rekening][tahun] + Σpen_prev - Σkel_prev
  const saldoAwalPerRekening: Record<string, number> = {}

  // Kumpulkan unique rekening dari raw data transaksi
  type RekInfo = { rekening_bank_id: string; kode_bank: string; nomor_rekening: string }
  const rekMap = new Map<string, RekInfo>()
  for (const r of penData) {
    const rek = Array.isArray(r.rekening) ? r.rekening[0] : r.rekening
    if (!rek || !r.rekening_bank_id) continue
    const kodeBank    = rek.nama_bank || rek.kode || "-"
    const nomorRek    = rek.nomor_rekening || "-"
    const groupKey    = `${kodeBank}__${nomorRek}`
    if (!rekMap.has(groupKey)) rekMap.set(groupKey, { rekening_bank_id: r.rekening_bank_id, kode_bank: kodeBank, nomor_rekening: nomorRek })
  }
  for (const r of kelData) {
    const rek = Array.isArray(r.rekening) ? r.rekening[0] : r.rekening
    if (!rek || !r.rekening_bank_id) continue
    const kodeBank    = rek.nama_bank || rek.kode || "-"
    const nomorRek    = rek.nomor_rekening || "-"
    const groupKey    = `${kodeBank}__${nomorRek}`
    if (!rekMap.has(groupKey)) rekMap.set(groupKey, { rekening_bank_id: r.rekening_bank_id, kode_bank: kodeBank, nomor_rekening: nomorRek })
  }

  for (const [groupKey, info] of rekMap) {
    // a. Saldo awal tahun untuk rekening ini
    const { data: saRow } = await sb
      .from("saldo_awal_rekening")
      .select("saldo")
      .eq("rekening_bank_id", info.rekening_bank_id)
      .eq("tahun", tahunAwal)
      .maybeSingle()
    let saldoAwalRek = Number(saRow?.saldo ?? 0)

    // b. Akumulasi transaksi Jan-1 s.d. sebelum tglAwal (jika bukan awal tahun)
    if (filter.tglAwal > awalTahun) {
      // penerimaan
      let ppOffset = 0
      let ppTotal = 0
      while (true) {
        let penQ = sb
          .from("penerimaan")
          .select("jumlah")
          .eq("rekening_bank_id", info.rekening_bank_id)
          .gte("tanggal_terima", awalTahun)
          .lt("tanggal_terima", filter.tglAwal)
          .eq("status", "verified")
        if (filter.unitId && filter.unitId !== "__all__") penQ = penQ.eq("unit_kerja_id", filter.unitId)
        const { data: batch, error } = await penQ.range(ppOffset, ppOffset + BATCH - 1)
        if (error || !batch || batch.length === 0) break
        for (const row of batch) ppTotal += Number(row.jumlah)
        if (batch.length < BATCH) break
        ppOffset += BATCH
      }

      // pengeluaran
      let pkOffset = 0
      let pkTotal = 0
      while (true) {
        let kelQ = sb
          .from("pengeluaran")
          .select("jumlah")
          .eq("rekening_bank_id", info.rekening_bank_id)
          .gte("tanggal", awalTahun)
          .lt("tanggal", filter.tglAwal)
          .eq("status", "verified")
        if (filter.unitId && filter.unitId !== "__all__") kelQ = kelQ.eq("unit_kerja_id", filter.unitId)
        const { data: batch, error } = await kelQ.range(pkOffset, pkOffset + BATCH - 1)
        if (error || !batch || batch.length === 0) break
        for (const row of batch) pkTotal += Number(row.jumlah)
        if (batch.length < BATCH) break
        pkOffset += BATCH
      }

      saldoAwalRek = saldoAwalRek + ppTotal - pkTotal
    }

    saldoAwalPerRekening[groupKey] = saldoAwalRek
  }

  // 4. Gabungkan dan urutkan transaksi
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allRows: { tipe: "penerimaan" | "pengeluaran"; tanggal: string; created_at: string; raw: any }[] = [
    ...penData.map((r) => ({ tipe: "penerimaan" as const, tanggal: r.tanggal_terima, created_at: r.created_at ?? "", raw: r })),
    ...kelData.map((r) => ({ tipe: "pengeluaran" as const, tanggal: r.tanggal, created_at: r.created_at ?? "", raw: r })),
  ].sort((a, b) => {
    if (a.tanggal !== b.tanggal) return a.tanggal.localeCompare(b.tanggal)
    return a.created_at.localeCompare(b.created_at)
  })

  // 5. Hitung total penerimaan, pengeluaran & saldo berjalan
  let totalPenerimaan = 0
  let totalPengeluaran = 0
  let saldoBerjalan = saldoAwal

  const rows: BukuKasFormatBaruRow[] = allRows.map((r, idx) => {
    const jumlah = Number(r.raw.jumlah)
    const rek = resolve(r.raw.rekening) as {
      kode: string
      nama_bank: string
      nama_rekening: string
      nomor_rekening?: string
    } | null

    const isPen = r.tipe === "penerimaan"
    if (isPen) {
      totalPenerimaan += jumlah
      saldoBerjalan += jumlah
    } else {
      totalPengeluaran += jumlah
      saldoBerjalan -= jumlah
    }

    const jenisPen = isPen ? (resolve(r.raw.jenis) as { kode: string; nama: string; akun_pendapatan?: string } | null) : null
    const jenisKel = !isPen ? (resolve(r.raw.jenis) as { kode: string; nama: string; akun_belanja?: string } | null) : null

    const kodeBank = rek?.nama_bank || rek?.kode || "-"
    const nomorRekening = rek?.nomor_rekening || "-"
    const uraian = (isPen ? jenisPen?.nama : jenisKel?.nama) || r.raw.uraian || "-"
    const map = isPen
      ? (jenisPen?.akun_pendapatan || jenisPen?.kode || "-")
      : (jenisKel?.akun_belanja || jenisKel?.kode || "-")

    return {
      no: idx + 1,
      id: r.raw.id,
      tipe: r.tipe,
      tanggal: r.tanggal,
      nomor_bukti: r.raw.nomor_bukti ?? "-",
      kode_bank: kodeBank,
      nomor_rekening: nomorRekening,
      uraian,
      map,
      penerimaan: isPen ? jumlah : 0,
      pengeluaran: !isPen ? jumlah : 0,
      saldo: saldoBerjalan,
    }
  })

  const saldoAkhir = saldoAwal + totalPenerimaan - totalPengeluaran

  // 6. Label saldo awal bulan sebelumnya & periode
  const [tglAwalYr, tglAwalMo] = filter.tglAwal.split("-").map(Number)
  let prevMoName = ""
  let prevMoYear = tglAwalYr
  if (tglAwalMo === 1) {
    prevMoName = "Desember"
    prevMoYear = tglAwalYr - 1
  } else {
    prevMoName = NAMA_BULAN[tglAwalMo - 2]
    prevMoYear = tglAwalYr
  }
  const saldoAwalLabel = `Saldo Bulan ${prevMoName} ${prevMoYear}`

  const [tglAkhirYr, tglAkhirMo] = filter.tglAkhir.split("-").map(Number)
  let periodeLabel = ""
  if (tglAwalYr === tglAkhirYr && tglAwalMo === tglAkhirMo) {
    periodeLabel = `Bulan ${NAMA_BULAN[tglAwalMo - 1]} – Tahun ${tglAwalYr}`
  } else {
    periodeLabel = `Periode ${filter.tglAwal} s.d. ${filter.tglAkhir}`
  }

  return {
    rows,
    saldoAwal,
    totalPenerimaan,
    totalPengeluaran,
    saldoAkhir,
    totalRows: rows.length,
    saldoAwalLabel,
    periodeLabel,
    tahun: tglAwalYr,
    saldoAwalPerRekening,
  }
}
