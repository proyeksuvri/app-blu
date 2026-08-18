"use server"

import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/session"

export type TargetFormItem = {
  jenis_pendapatan_id: string
  akun_pendapatan: string
  kode: string
  nama: string
  kategori_nama: string
  target: number
}

export async function getTargetPendapatanForm(tahun: number): Promise<TargetFormItem[]> {
  await requireRole(["ADMIN", "PIMPINAN"])
  const sb = await createClient()

  // 1. Ambil semua jenis_pendapatan aktif
  const { data: jenisData, error: jenisErr } = await sb
    .from("jenis_pendapatan")
    .select("id, kode, nama, akun_pendapatan, kategori:kategori_pendapatan(nama)")
    .eq("is_active", true)
    .order("akun_pendapatan", { ascending: true })

  if (jenisErr || !jenisData) {
    throw new Error(jenisErr?.message || "Gagal mengambil data jenis pendapatan")
  }

  // 2. Ambil target_pendapatan untuk tahun terkait
  const targetMap = new Map<string, number>()
  try {
    const { data: targetData } = await sb
      .from("target_pendapatan")
      .select("jenis_pendapatan_id, target")
      .eq("tahun", tahun)

    for (const t of targetData ?? []) {
      targetMap.set(t.jenis_pendapatan_id, Number(t.target) || 0)
    }
  } catch {
    // Graceful fallback jika tabel target_pendapatan belum dibuat di Supabase
  }

  // 3. Gabungkan
  return jenisData.map((j) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kat = Array.isArray(j.kategori) ? j.kategori[0] : j.kategori
    return {
      jenis_pendapatan_id: j.id,
      akun_pendapatan: j.akun_pendapatan ?? "-",
      kode: j.kode ?? "-",
      nama: j.nama ?? "-",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      kategori_nama: (kat as any)?.nama ?? "-",
      target: targetMap.get(j.id) ?? 0,
    }
  })
}

export async function saveTargetPendapatanBatch(
  tahun: number,
  items: { jenis_pendapatan_id: string; target: number }[]
) {
  await requireRole(["ADMIN"])
  const sb = await createClient()

  const payload = items.map((item) => ({
    tahun,
    jenis_pendapatan_id: item.jenis_pendapatan_id,
    target: Math.max(0, Math.floor(Number(item.target) || 0)),
  }))

  const { error } = await sb
    .from("target_pendapatan")
    .upsert(payload, { onConflict: "tahun,jenis_pendapatan_id" })

  if (error) {
    if (error.code === "PGRST204" || error.message.includes("schema cache") || error.message.includes("does not exist")) {
      throw new Error("Tabel 'target_pendapatan' belum dibuat di Supabase. Silakan jalankan file SQL migration di Supabase Dashboard.")
    }
    throw new Error(error.message)
  }

  return { success: true }
}
