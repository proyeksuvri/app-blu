"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireRole, getCurrentProfile } from "@/lib/session"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; pesan: string }

const BUCKET = "rekening-koran"
const BULAN_NAMA = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"]

function createStorageAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

async function ensureBucket(): Promise<string | null> {
  try {
    const admin = createStorageAdmin()
    const { data: buckets, error: listErr } = await admin.storage.listBuckets()
    if (listErr) return `Gagal list bucket: ${listErr.message}`
    const exists = buckets?.some((b) => b.id === BUCKET)
    if (!exists) {
      const { error: createErr } = await admin.storage.createBucket(BUCKET, {
        public: false,
        fileSizeLimit: 30 * 1024 * 1024, // 30 MB
        allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
      })
      if (createErr) return `Gagal buat bucket: ${createErr.message}`
    }
    return null
  } catch (e) {
    return `Error bucket: ${e instanceof Error ? e.message : String(e)}`
  }
}

export type DokumenRekeningKoran = {
  id: string
  rekening_bank_id: string
  tahun: number
  bulan: number
  nama_bulan: string
  nama: string
  file_path: string
  file_size: number
  uploaded_by: string
  uploader_nama: string | null
  created_at: string
  saldo_masuk_bank?: number | null
  saldo_keluar_bank?: number | null
  saldo_akhir_bank?: number | null
}

export async function listDokumenRekeningKoran(
  rekeningId: string,
  tahun: number
): Promise<DokumenRekeningKoran[]> {
  const sb = await createClient()
  const { data, error } = await sb
    .from("dokumen_rekening_koran")
    .select("*")
    .eq("rekening_bank_id", rekeningId)
    .eq("tahun", tahun)
    .order("bulan", { ascending: true })

  if (error || !data) return []

  const uploaderIds = [...new Set(data.map((r) => r.uploaded_by))]
  const { data: profiles } = uploaderIds.length > 0
    ? await sb.from("profiles").select("id, nama_lengkap").in("id", uploaderIds)
    : { data: [] }

  const nameMap = new Map<string, string>()
  for (const p of profiles ?? []) nameMap.set(p.id, p.nama_lengkap)

  return data.map((row) => {
    let cleanNama = row.nama || ""
    let masuk: number | null = row.saldo_masuk_bank != null ? Number(row.saldo_masuk_bank) : null
    let keluar: number | null = row.saldo_keluar_bank != null ? Number(row.saldo_keluar_bank) : null
    let akhir: number | null = row.saldo_akhir_bank != null ? Number(row.saldo_akhir_bank) : null

    if (cleanNama.includes("__META__")) {
      const parts = cleanNama.split("__META__")
      cleanNama = parts[0]
      try {
        const meta = JSON.parse(parts[1])
        if (masuk == null && meta.in != null) masuk = Number(meta.in)
        if (keluar == null && meta.out != null) keluar = Number(meta.out)
        if (akhir == null && meta.end != null) akhir = Number(meta.end)
      } catch {
        // ignore parse error
      }
    }

    return {
      ...row,
      nama: cleanNama,
      nama_bulan: BULAN_NAMA[(row.bulan as number) - 1] ?? "",
      uploader_nama: nameMap.get(row.uploaded_by) ?? null,
      saldo_masuk_bank: masuk,
      saldo_keluar_bank: keluar,
      saldo_akhir_bank: akhir,
    }
  })
}

export async function uploadDokumenRekeningKoran(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const profile = await requireRole(["ADMIN"])

  const file = formData.get("file") as File | null
  const rekeningId = (formData.get("rekening_bank_id") as string | null)?.trim()
  const tahun = parseInt((formData.get("tahun") as string | null) ?? "0")
  const bulan = parseInt((formData.get("bulan") as string | null) ?? "0")
  const rawNama = (formData.get("nama") as string | null)?.trim()

  const masukStr = formData.get("saldo_masuk_bank") as string | null
  const keluarStr = formData.get("saldo_keluar_bank") as string | null
  const akhirStr = formData.get("saldo_akhir_bank") as string | null

  const saldoMasuk = masukStr !== null && masukStr !== "" ? parseFloat(masukStr) : null
  const saldoKeluar = keluarStr !== null && keluarStr !== "" ? parseFloat(keluarStr) : null
  const saldoAkhir = akhirStr !== null && akhirStr !== "" ? parseFloat(akhirStr) : null

  if (!file || file.size === 0) return { ok: false, pesan: "File wajib dipilih." }
  if (!rekeningId) return { ok: false, pesan: "Rekening wajib dipilih." }
  if (!tahun || tahun < 2000) return { ok: false, pesan: "Tahun tidak valid." }
  if (!bulan || bulan < 1 || bulan > 12) return { ok: false, pesan: "Bulan tidak valid." }
  if (!rawNama) return { ok: false, pesan: "Nama dokumen wajib diisi." }

  const allowed = ["application/pdf", "image/jpeg", "image/png"]
  if (!allowed.includes(file.type)) return { ok: false, pesan: "Hanya PDF, JPG, atau PNG yang diizinkan." }
  if (file.size > 30 * 1024 * 1024) return { ok: false, pesan: "Ukuran file maksimal 30 MB." }

  const bucketErr = await ensureBucket()
  if (bucketErr) return { ok: false, pesan: bucketErr }

  const ext = file.name.split(".").pop() ?? "pdf"
  const safeName = `${rekeningId}/${tahun}/${bulan}-${Date.now()}.${ext}`

  const bytes = await file.arrayBuffer()
  const admin = createStorageAdmin()
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(safeName, bytes, { contentType: file.type, upsert: false })

  if (uploadError) return { ok: false, pesan: `Gagal unggah: ${uploadError.message}` }

  // Buat metadata komparasi saldo bank jika diisi
  let namaToSave = rawNama
  if (saldoMasuk != null || saldoKeluar != null || saldoAkhir != null) {
    const meta = { in: saldoMasuk, out: saldoKeluar, end: saldoAkhir }
    namaToSave = `${rawNama}__META__${JSON.stringify(meta)}`
  }

  const sb = await createClient()
  const { data: inserted, error: dbError } = await sb
    .from("dokumen_rekening_koran")
    .insert({
      rekening_bank_id: rekeningId,
      tahun,
      bulan,
      nama: namaToSave,
      file_path: safeName,
      file_size: file.size,
      uploaded_by: profile.id,
    })
    .select("id")
    .single()

  if (dbError || !inserted) {
    await admin.storage.from(BUCKET).remove([safeName])
    return { ok: false, pesan: `Gagal simpan data: ${dbError?.message}` }
  }

  revalidatePath("/laporan")
  return { ok: true, data: { id: inserted.id } }
}

export async function getDokumenDownloadUrl(
  id: string
): Promise<ActionResult<{ url: string; nama: string }>> {
  const profile = await getCurrentProfile()
  if (!profile) return { ok: false, pesan: "Tidak terautentikasi." }

  const sb = await createClient()
  const { data: doc, error } = await sb
    .from("dokumen_rekening_koran")
    .select("file_path, nama")
    .eq("id", id)
    .single()

  if (error || !doc) return { ok: false, pesan: "Dokumen tidak ditemukan." }

  const admin = createStorageAdmin()
  const { data: signed, error: signErr } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(doc.file_path, 60 * 5) // 5 menit

  if (signErr || !signed) return { ok: false, pesan: `Gagal buat URL: ${signErr?.message}` }

  return { ok: true, data: { url: signed.signedUrl, nama: doc.nama } }
}

export async function deleteDokumenRekeningKoran(id: string): Promise<ActionResult> {
  await requireRole(["ADMIN"])

  const sb = await createClient()
  const { data: doc, error: fetchErr } = await sb
    .from("dokumen_rekening_koran")
    .select("file_path")
    .eq("id", id)
    .single()

  if (fetchErr || !doc) return { ok: false, pesan: "Dokumen tidak ditemukan." }

  const admin = createStorageAdmin()
  const { error: storageErr } = await admin.storage.from(BUCKET).remove([doc.file_path])
  if (storageErr) return { ok: false, pesan: `Gagal hapus file: ${storageErr.message}` }

  const { error: dbErr } = await sb.from("dokumen_rekening_koran").delete().eq("id", id)
  if (dbErr) return { ok: false, pesan: `Gagal hapus data: ${dbErr.message}` }

  revalidatePath("/laporan")
  return { ok: true, data: undefined }
}
