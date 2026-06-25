"use server"

import { createClient } from "@/lib/supabase/server"

export type PenerimaanFilterType = "bulan" | "triwulan" | "semester" | "tahun"

export async function getPenerimaanFiltered(
  type: PenerimaanFilterType,
  value: number,
  year: number
) {
  const sb = await createClient()

  let awal = "";
  let akhir = "";

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
  } else if (type === "tahun") {
    awal = `${year}-01-01`
    akhir = `${year}-12-31`
  }

  // Get total and breakdown
  const { data } = await sb.from("penerimaan")
    .select(`
      jumlah, 
      tanggal_terima,
      jenis_pendapatan (
        kategori_pendapatan (
          nama
        )
      )
    `)
    .eq("status", "verified")
    .gte("tanggal_terima", awal)
    .lte("tanggal_terima", akhir)

  const total = (data ?? []).reduce((s, r) => s + Number(r.jumlah), 0)

  // Compute breakdown
  const kategoriMap = new Map<string, number>()
  if (data) {
    data.forEach(r => {
      const amount = Number(r.jumlah)
      // @ts-ignore: nested join types
      const kategoriName = r.jenis_pendapatan?.kategori_pendapatan?.nama || "Lainnya"
      kategoriMap.set(kategoriName, (kategoriMap.get(kategoriName) || 0) + amount)
    })
  }
  const kategoriBreakdown = Array.from(kategoriMap.entries()).map(([name, value]) => ({ name, value }))
  kategoriBreakdown.sort((a, b) => b.value - a.value)

  let trendData: number[] = [];
  if (data) {
    if (type === "bulan") {
      const endDay = new Date(year, value, 0).getDate();
      trendData = Array(endDay).fill(0);
      data.forEach(r => {
        const day = parseInt(r.tanggal_terima.split('-')[2], 10);
        if (day >= 1 && day <= endDay) {
          trendData[day - 1] += Number(r.jumlah);
        }
      });
    } else {
      let startMonth = 1;
      let endMonth = 12;
      if (type === "triwulan") {
        startMonth = (value - 1) * 3 + 1;
        endMonth = value * 3;
      } else if (type === "semester") {
        startMonth = value === 1 ? 1 : 7;
        endMonth = value === 1 ? 6 : 12;
      }
      const numMonths = endMonth - startMonth + 1;
      trendData = Array(numMonths).fill(0);
      data.forEach(r => {
        const month = parseInt(r.tanggal_terima.split('-')[1], 10);
        const idx = month - startMonth;
        if (idx >= 0 && idx < numMonths) {
          trendData[idx] += Number(r.jumlah);
        }
      });
    }
  }
  
  // Previous period
  let prevAwal = "";
  let prevAkhir = "";
  
  if (type === "bulan") {
    const prevYear = value === 1 ? year - 1 : year;
    const prevMonth = value === 1 ? 12 : value - 1;
    const end = new Date(prevYear, prevMonth, 0)
    prevAwal = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`
    prevAkhir = `${prevYear}-${String(prevMonth).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`
  } else if (type === "triwulan") {
    const prevYear = value === 1 ? year - 1 : year;
    const prevValue = value === 1 ? 4 : value - 1;
    const startMonth = (prevValue - 1) * 3 + 1
    const endMonth = prevValue * 3
    const end = new Date(prevYear, endMonth, 0)
    prevAwal = `${prevYear}-${String(startMonth).padStart(2, "0")}-01`
    prevAkhir = `${prevYear}-${String(endMonth).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`
  } else if (type === "semester") {
    const prevYear = value === 1 ? year - 1 : year;
    const prevValue = value === 1 ? 2 : 1;
    const startMonth = prevValue === 1 ? 1 : 7
    const endMonth = prevValue === 1 ? 6 : 12
    const end = new Date(prevYear, endMonth, 0)
    prevAwal = `${prevYear}-${String(startMonth).padStart(2, "0")}-01`
    prevAkhir = `${prevYear}-${String(endMonth).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`
  } else if (type === "tahun") {
    prevAwal = `${year - 1}-01-01`
    prevAkhir = `${year - 1}-12-31`
  }
  
  const { data: prevData } = await sb.from("penerimaan")
    .select("jumlah")
    .eq("status", "verified")
    .gte("tanggal_terima", prevAwal)
    .lte("tanggal_terima", prevAkhir)
    
  const prevTotal = (prevData ?? []).reduce((s, r) => s + Number(r.jumlah), 0)

  // Previous year exact same period
  let prevYearAwal = "";
  let prevYearAkhir = "";

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
  } else if (type === "tahun") {
    prevYearAwal = `${year - 1}-01-01`
    prevYearAkhir = `${year - 1}-12-31`
  }

  const { data: prevYearData } = await sb.from("penerimaan")
    .select("jumlah")
    .eq("status", "verified")
    .gte("tanggal_terima", prevYearAwal)
    .lte("tanggal_terima", prevYearAkhir)

  const prevYearTotal = (prevYearData ?? []).reduce((s, r) => s + Number(r.jumlah), 0)

  const uniqueDays = new Set((data ?? []).map(r => r.tanggal_terima)).size

  return { 
    total, 
    prevTotal, 
    prevYearTotal, 
    trendData,
    kategoriBreakdown,
    awal, 
    akhir, 
    prevAwal, 
    prevAkhir,
    uniqueDays 
  }
}
