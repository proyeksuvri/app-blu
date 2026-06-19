"use server"

import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile } from "@/lib/session"
import { getRedis } from "@/lib/redis"

export type DashboardStats = {
  periode: {
    bulan: string
    label: string
  }
  totalPenerimaanBulanIni: number
  totalPenerimaanVerifiedBulanIni: number
  totalPenerimaanDraftBulanIni: number
  totalBulanIni: number
  totalBulanLalu: number
  voidBulanIni: number
  draftCount: number
  hariIni: {
    count: number
    total: number
    verifiedTotal: number
    verifiedCount: number
    draftTotal: number
    draftCount: number
  }
  monthlyData: { key: string; label: string; total: number }[]
  terbaru: {
    id: string
    nomor_bukti: string
    tanggal_terima: string
    jumlah: number
    status: string
    jenis: { nama?: string } | null
    unit: { kode?: string } | null
  }[]
  role: string
  nama: string
  unitNama: string | null
}

function parseDashboardMonth(month?: string) {
  const now = new Date()
  const match = month?.match(/^(\d{4})-(\d{2})$/)
  const year = match ? Number(match[1]) : now.getFullYear()
  const monthIndex = match ? Number(match[2]) - 1 : now.getMonth()
  const isValidMonth = monthIndex >= 0 && monthIndex <= 11
  const selected = new Date(isValidMonth ? year : now.getFullYear(), isValidMonth ? monthIndex : now.getMonth(), 1)
  const selectedYear = selected.getFullYear()
  const selectedMonth = selected.getMonth()
  const bulan = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`
  const awal = `${bulan}-01`
  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth()
  const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate()
  const akhir = isCurrentMonth
    ? now.toISOString().split("T")[0]
    : `${bulan}-${String(lastDay).padStart(2, "0")}`

  const previous = new Date(selectedYear, selectedMonth - 1, 1)
  const previousYear = previous.getFullYear()
  const previousMonth = previous.getMonth()
  const previousKey = `${previousYear}-${String(previousMonth + 1).padStart(2, "0")}`
  const previousLastDay = new Date(previousYear, previousMonth + 1, 0).getDate()

  return {
    bulan,
    label: selected.toLocaleDateString("id-ID", { month: "long", year: "numeric" }),
    awal,
    akhir,
    awalLalu: `${previousKey}-01`,
    akhirLalu: `${previousKey}-${String(previousLastDay).padStart(2, "0")}`,
  }
}

export async function getDashboardStats(month?: string): Promise<DashboardStats | null> {
  const profile = await getCurrentProfile()
  if (!profile) return null

  const periode = parseDashboardMonth(month)
  const redis = getRedis()
  const cacheKey = `dashboard:stats:${profile.role.kode}:${profile.unit_kerja_id ?? "all"}:${periode.bulan}`
  if (redis) {
    const cached = await redis.get<DashboardStats>(cacheKey)
    if (cached != null) return cached
  }

  const sb = await createClient()
  const now = new Date()
  const tglAkhir = now.toISOString().split("T")[0]

  const [pipelineRes, bulanRes, bulanLaluRes, voidRes, draftRes, hariIniRes, terbaruRes] = await Promise.all([
    // Total pipeline bulan terpilih (draft + verified)
    sb.from("penerimaan")
      .select("jumlah, status")
      .in("status", ["draft", "verified"])
      .gte("tanggal_terima", periode.awal)
      .lte("tanggal_terima", periode.akhir)
      .then(({ data }) => {
        const rows = data ?? []
        return {
          total:         rows.reduce((s, r) => s + Number(r.jumlah), 0),
          verifiedCount: rows.filter((r) => r.status === "verified").length,
          draftCount:    rows.filter((r) => r.status === "draft").length,
        }
      }),


    // Total verified bulan terpilih
    sb.from("penerimaan")
      .select("jumlah")
      .eq("status", "verified")
      .gte("tanggal_terima", periode.awal)
      .lte("tanggal_terima", periode.akhir)
      .then(({ data }) =>
        (data ?? []).reduce((s, r) => s + Number(r.jumlah), 0)
      ),

    // Total verified bulan sebelumnya
    sb.from("penerimaan")
      .select("jumlah")
      .eq("status", "verified")
      .gte("tanggal_terima", periode.awalLalu)
      .lte("tanggal_terima", periode.akhirLalu)
      .then(({ data }) =>
        (data ?? []).reduce((s, r) => s + Number(r.jumlah), 0)
      ),

    // Void bulan terpilih
    sb.from("penerimaan")
      .select("id", { count: "exact", head: true })
      .eq("status", "void")
      .gte("tanggal_terima", periode.awal)
      .lte("tanggal_terima", periode.akhir)
      .then(({ count }) => count ?? 0),

    // Draft menunggu verifikasi bulan terpilih
    sb.from("penerimaan")
      .select("id", { count: "exact", head: true })
      .eq("status", "draft")
      .gte("tanggal_terima", periode.awal)
      .lte("tanggal_terima", periode.akhir)
      .then(({ count }) => count ?? 0),

    // Transaksi hari ini
    sb.from("penerimaan")
      .select("jumlah, status")
      .gte("tanggal_terima", tglAkhir)
      .lte("tanggal_terima", tglAkhir)
      .in("status", ["draft", "verified"])
      .then(({ data }) => {
        const rows = data ?? []
        const verified = rows.filter((r) => r.status === "verified")
        const draft = rows.filter((r) => r.status === "draft")
        return {
          count: rows.length,
          total: rows.reduce((s, r) => s + Number(r.jumlah), 0),
          verifiedTotal: verified.reduce((s, r) => s + Number(r.jumlah), 0),
          verifiedCount: verified.length,
          draftTotal: draft.reduce((s, r) => s + Number(r.jumlah), 0),
          draftCount: draft.length,
        }
      }),

    // 5 transaksi terbaru
    sb.from("penerimaan")
      .select(`
        id, nomor_bukti, tanggal_terima, jumlah, status,
        jenis:jenis_pendapatan(nama),
        unit:unit_kerja(kode)
      `)
      .in("status", ["draft", "verified"])
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => data ?? []),
  ])

  // 12-month trend data
  const months: { key: string; label: string; awal: string; akhir: string }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = d.getFullYear()
    const month = d.getMonth()
    const awal = `${year}-${String(month + 1).padStart(2, "0")}-01`
    const lastDay = new Date(year, month + 1, 0).getDate()
    const akhir = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
    const label = d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" })
    months.push({ key: `${year}-${String(month + 1).padStart(2, "0")}`, label, awal, akhir })
  }

  const monthlyRaw = await sb.from("penerimaan")
    .select("tanggal_terima, jumlah")
    .eq("status", "verified")
    .gte("tanggal_terima", months[0].awal)
    .lte("tanggal_terima", months[months.length - 1].akhir)
    .then(({ data }) => data ?? [])

  const monthlyData = months.map(({ key, label, awal, akhir }) => {
    const total = monthlyRaw
      .filter((r) => r.tanggal_terima >= awal && r.tanggal_terima <= akhir)
      .reduce((s, r) => s + Number(r.jumlah), 0)
    return { key, label, total }
  })

  const result = {
    periode: {
      bulan: periode.bulan,
      label: periode.label,
    },
    totalPenerimaanBulanIni:        pipelineRes.total,
    totalPenerimaanVerifiedBulanIni: pipelineRes.verifiedCount,
    totalPenerimaanDraftBulanIni:    pipelineRes.draftCount,
    totalBulanIni: bulanRes,
    totalBulanLalu: bulanLaluRes,
    voidBulanIni: voidRes,
    draftCount: draftRes,
    hariIni: hariIniRes,
    monthlyData,
    terbaru: terbaruRes.map((r) => ({
      id: r.id,
      nomor_bukti: r.nomor_bukti,
      tanggal_terima: r.tanggal_terima,
      jumlah: Number(r.jumlah),
      status: r.status,
      jenis: (Array.isArray(r.jenis) ? r.jenis[0] : r.jenis) as { nama?: string } | null,
      unit: (Array.isArray(r.unit) ? r.unit[0] : r.unit) as { kode?: string } | null,
    })),
    role: profile.role.kode,
    nama: profile.nama_lengkap,
    unitNama: profile.unit_kerja?.nama ?? null,
  }

  if (redis) await redis.setex(cacheKey, 300, result)
  return result
}

export async function getDraftCount(roleKode: string): Promise<number> {
  if (roleKode !== "ADMIN" && roleKode !== "PIMPINAN") return 0
  const sb = await createClient()
  const { count } = await sb
    .from("penerimaan")
    .select("id", { count: "exact", head: true })
    .eq("status", "draft")
  return count ?? 0
}
