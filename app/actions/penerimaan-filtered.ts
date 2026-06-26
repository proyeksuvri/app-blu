"use server"

import { createClient } from "@/lib/supabase/server"
import { getRedis } from "@/lib/redis"

export type PenerimaanFilterType = "bulan" | "triwulan" | "semester" | "tahun"

export type PenerimaanFilteredResult = {
  total: number
  prevTotal: number
  prevYearTotal: number
  trendData: number[]
  kategoriBreakdown: { name: string; value: number }[]
  jenisBreakdown: { kode: string; nama: string; akun: string | null; value: number }[]
  awal: string
  akhir: string
  prevAwal: string
  prevAkhir: string
  uniqueDays: number
}

function buildDateRange(type: PenerimaanFilterType, value: number, year: number) {
  let awal = ""
  let akhir = ""

  if (type === "bulan") {
    const end = new Date(year, value, 0)
    awal = `${year}-${String(value).padStart(2, "0")}-01`
    akhir = `${year}-${String(value).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`
  } else if (type === "triwulan") {
    const startMonth = (value - 1) * 3 + 1
    const endMonth = value * 3
    const end = new Date(year, endMonth, 0)
    awal = `${year}-${String(startMonth).padStart(2, "0")}-01`
    akhir = `${year}-${String(endMonth).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`
  } else if (type === "semester") {
    const startMonth = value === 1 ? 1 : 7
    const endMonth = value === 1 ? 6 : 12
    const end = new Date(year, endMonth, 0)
    awal = `${year}-${String(startMonth).padStart(2, "0")}-01`
    akhir = `${year}-${String(endMonth).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`
  } else {
    awal = `${year}-01-01`
    akhir = `${year}-12-31`
  }

  return { awal, akhir }
}

function buildPrevDateRange(type: PenerimaanFilterType, value: number, year: number) {
  let prevAwal = ""
  let prevAkhir = ""

  if (type === "bulan") {
    const prevYear = value === 1 ? year - 1 : year
    const prevMonth = value === 1 ? 12 : value - 1
    const end = new Date(prevYear, prevMonth, 0)
    prevAwal = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`
    prevAkhir = `${prevYear}-${String(prevMonth).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`
  } else if (type === "triwulan") {
    const prevYear = value === 1 ? year - 1 : year
    const prevValue = value === 1 ? 4 : value - 1
    const startMonth = (prevValue - 1) * 3 + 1
    const endMonth = prevValue * 3
    const end = new Date(prevYear, endMonth, 0)
    prevAwal = `${prevYear}-${String(startMonth).padStart(2, "0")}-01`
    prevAkhir = `${prevYear}-${String(endMonth).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`
  } else if (type === "semester") {
    const prevYear = value === 1 ? year - 1 : year
    const prevValue = value === 1 ? 2 : 1
    const startMonth = prevValue === 1 ? 1 : 7
    const endMonth = prevValue === 1 ? 6 : 12
    const end = new Date(prevYear, endMonth, 0)
    prevAwal = `${prevYear}-${String(startMonth).padStart(2, "0")}-01`
    prevAkhir = `${prevYear}-${String(endMonth).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`
  } else {
    prevAwal = `${year - 1}-01-01`
    prevAkhir = `${year - 1}-12-31`
  }

  return { prevAwal, prevAkhir }
}

function buildPrevYearDateRange(type: PenerimaanFilterType, value: number, year: number) {
  let prevYearAwal = ""
  let prevYearAkhir = ""

  if (type === "bulan") {
    const end = new Date(year - 1, value, 0)
    prevYearAwal = `${year - 1}-${String(value).padStart(2, "0")}-01`
    prevYearAkhir = `${year - 1}-${String(value).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`
  } else if (type === "triwulan") {
    const startMonth = (value - 1) * 3 + 1
    const endMonth = value * 3
    const end = new Date(year - 1, endMonth, 0)
    prevYearAwal = `${year - 1}-${String(startMonth).padStart(2, "0")}-01`
    prevYearAkhir = `${year - 1}-${String(endMonth).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`
  } else if (type === "semester") {
    const startMonth = value === 1 ? 1 : 7
    const endMonth = value === 1 ? 6 : 12
    const end = new Date(year - 1, endMonth, 0)
    prevYearAwal = `${year - 1}-${String(startMonth).padStart(2, "0")}-01`
    prevYearAkhir = `${year - 1}-${String(endMonth).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`
  } else {
    prevYearAwal = `${year - 1}-01-01`
    prevYearAkhir = `${year - 1}-12-31`
  }

  return { prevYearAwal, prevYearAkhir }
}

export async function getPenerimaanFiltered(
  type: PenerimaanFilterType,
  value: number,
  year: number
): Promise<PenerimaanFilteredResult> {
  // Pre-compute all date ranges before any async work
  const { awal, akhir } = buildDateRange(type, value, year)
  const { prevAwal, prevAkhir } = buildPrevDateRange(type, value, year)
  const { prevYearAwal, prevYearAkhir } = buildPrevYearDateRange(type, value, year)

  // Check Redis cache first (instant return)
  const redis = getRedis()
  const cacheKey = `penerimaan:filtered:${type}:${value}:${year}`
  if (redis) {
    const cached = await redis.get<PenerimaanFilteredResult>(cacheKey)
    if (cached != null) return cached
  }

  const sb = await createClient()

  // Run ALL 3 queries IN PARALLEL — previously sequential
  const [mainResult, prevResult, prevYearResult] = await Promise.all([
    sb
      .from("penerimaan")
      .select(`
        jumlah,
        tanggal_terima,
        jenis_pendapatan (
          kode,
          nama,
          akun_pendapatan,
          kategori_pendapatan (
            nama
          )
        )
      `)
      .eq("status", "verified")
      .gte("tanggal_terima", awal)
      .lte("tanggal_terima", akhir),

    sb
      .from("penerimaan")
      .select("jumlah")
      .eq("status", "verified")
      .gte("tanggal_terima", prevAwal)
      .lte("tanggal_terima", prevAkhir),

    sb
      .from("penerimaan")
      .select("jumlah")
      .eq("status", "verified")
      .gte("tanggal_terima", prevYearAwal)
      .lte("tanggal_terima", prevYearAkhir),
  ])

  const data = mainResult.data ?? []
  const prevData = prevResult.data ?? []
  const prevYearData = prevYearResult.data ?? []

  // Compute totals
  const total = data.reduce((s, r) => s + Number(r.jumlah), 0)
  const prevTotal = prevData.reduce((s, r) => s + Number(r.jumlah), 0)
  const prevYearTotal = prevYearData.reduce((s, r) => s + Number(r.jumlah), 0)

  // Unique active days
  const uniqueDays = new Set(data.map((r) => r.tanggal_terima)).size

  // Category breakdown
  const kategoriMap = new Map<string, number>()
  data.forEach((r) => {
    const amount = Number(r.jumlah)
    const jpRaw = r.jenis_pendapatan
    const jp = (Array.isArray(jpRaw) ? jpRaw[0] : jpRaw) as any
    const katRaw = jp?.kategori_pendapatan
    const kat = (Array.isArray(katRaw) ? katRaw[0] : katRaw) as any
    const kategoriName = kat?.nama || "Lainnya"
    kategoriMap.set(kategoriName, (kategoriMap.get(kategoriName) || 0) + amount)
  })
  const kategoriBreakdown = Array.from(kategoriMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  // Jenis pendapatan breakdown (with kode & akun_pendapatan)
  const jenisMap = new Map<string, { kode: string; nama: string; akun: string | null; value: number }>()
  data.forEach((r) => {
    const amount = Number(r.jumlah)
    const jpRaw = r.jenis_pendapatan
    const jp = (Array.isArray(jpRaw) ? jpRaw[0] : jpRaw) as any
    const key = jp?.kode || "lainnya"
    if (!jenisMap.has(key)) {
      jenisMap.set(key, { kode: jp?.kode || "-", nama: jp?.nama || "Lainnya", akun: jp?.akun_pendapatan || null, value: 0 })
    }
    jenisMap.get(key)!.value += amount
  })
  const jenisBreakdown = Array.from(jenisMap.values()).sort((a, b) => b.value - a.value)

  // Trend data
  let trendData: number[] = []
  if (type === "bulan") {
    const endDay = new Date(year, value, 0).getDate()
    trendData = Array(endDay).fill(0)
    data.forEach((r) => {
      const day = parseInt(r.tanggal_terima.split("-")[2], 10)
      if (day >= 1 && day <= endDay) trendData[day - 1] += Number(r.jumlah)
    })
  } else {
    let startMonth = 1
    let endMonth = 12
    if (type === "triwulan") {
      startMonth = (value - 1) * 3 + 1
      endMonth = value * 3
    } else if (type === "semester") {
      startMonth = value === 1 ? 1 : 7
      endMonth = value === 1 ? 6 : 12
    }
    const numMonths = endMonth - startMonth + 1
    trendData = Array(numMonths).fill(0)
    data.forEach((r) => {
      const month = parseInt(r.tanggal_terima.split("-")[1], 10)
      const idx = month - startMonth
      if (idx >= 0 && idx < numMonths) trendData[idx] += Number(r.jumlah)
    })
  }

  const result: PenerimaanFilteredResult = {
    total,
    prevTotal,
    prevYearTotal,
    trendData,
    kategoriBreakdown,
    jenisBreakdown,
    awal,
    akhir,
    prevAwal,
    prevAkhir,
    uniqueDays,
  }

  // Cache for 5 minutes
  if (redis) await redis.setex(cacheKey, 300, result)

  return result
}
