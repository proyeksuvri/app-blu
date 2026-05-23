"use server"

import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile } from "@/lib/session"

export async function getDashboardStats() {
  const profile = await getCurrentProfile()
  if (!profile) return null

  const sb = await createClient()
  const now = new Date()
  const tglAwal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
  const tglAkhir = now.toISOString().split("T")[0]

  let baseQ = sb.from("penerimaan").select("jumlah, status, tanggal_terima, created_at")
  if (profile.role.kode === "OPERATOR" && profile.unit_kerja_id) {
    baseQ = baseQ.eq("unit_kerja_id", profile.unit_kerja_id) as typeof baseQ
  }

  const [bulanRes, draftRes, hariIniRes, terbaruRes] = await Promise.all([
    // Total verified bulan ini
    sb.from("penerimaan")
      .select("jumlah")
      .eq("status", "verified")
      .gte("tanggal_terima", tglAwal)
      .lte("tanggal_terima", tglAkhir)
      .then(({ data }) =>
        (data ?? []).reduce((s, r) => s + Number(r.jumlah), 0)
      ),

    // Draft menunggu verifikasi
    sb.from("penerimaan")
      .select("id", { count: "exact", head: true })
      .eq("status", "draft")
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

  // 7-day chart data
  const days: { tgl: string; label: string }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const tgl = d.toISOString().split("T")[0]
    const label = d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric" })
    days.push({ tgl, label })
  }
  const tgl7Awal = days[0].tgl

  const chartRaw = await sb.from("penerimaan")
    .select("tanggal_terima, jumlah, status")
    .gte("tanggal_terima", tgl7Awal)
    .lte("tanggal_terima", tglAkhir)
    .in("status", ["draft", "verified"])
    .then(({ data }) => data ?? [])

  const chartData = days.map(({ tgl, label }) => {
    const rows = chartRaw.filter((r) => r.tanggal_terima === tgl)
    return {
      tgl,
      label,
      verified: rows.filter((r) => r.status === "verified").reduce((s, r) => s + Number(r.jumlah), 0),
      draft: rows.filter((r) => r.status === "draft").reduce((s, r) => s + Number(r.jumlah), 0),
    }
  })

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

  return {
    totalBulanIni: bulanRes,
    draftCount: draftRes,
    hariIni: hariIniRes,
    chartData,
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
}
