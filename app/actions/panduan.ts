"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireRole, getCurrentProfile } from "@/lib/session"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

// Client admin murni (service role) — bypass RLS sepenuhnya
function createStorageAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}


type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; pesan: string }

export type DokumenPanduan = {
  id: string
  nama: string
  deskripsi: string | null
  file_path: string
  file_size: number
  uploaded_by: string
  uploader_nama: string | null
  created_at: string
}

const BUCKET = "panduan-dokumen"

// ─── Auto-create bucket jika belum ada ───────────────────────────────────────

async function ensureBucket(): Promise<string | null> {
  try {
    const admin = createStorageAdmin()
    const { data: buckets, error: listErr } = await admin.storage.listBuckets()
    if (listErr) return `Gagal list bucket: ${listErr.message}`

    const exists = buckets?.some((b) => b.id === BUCKET)
    if (!exists) {
      const { error: createErr } = await admin.storage.createBucket(BUCKET, {
        public: false,
        fileSizeLimit: 20 * 1024 * 1024,
        allowedMimeTypes: ["application/pdf"],
      })
      if (createErr) return `Gagal buat bucket: ${createErr.message}`
    }
    return null
  } catch (e) {
    return `Error bucket: ${e instanceof Error ? e.message : String(e)}`
  }
}

// ─── List Dokumen ─────────────────────────────────────────────────────────────

export async function listDokumenPanduan(): Promise<DokumenPanduan[]> {
  const sb = await createClient()

  // Fetch dokumen tanpa join FK (FK ke auth.users bukan profiles)
  const { data, error } = await sb
    .from("dokumen_panduan")
    .select("id, nama, deskripsi, file_path, file_size, uploaded_by, created_at")
    .order("created_at", { ascending: false })

  if (error || !data) return []

  // Ambil nama uploader secara terpisah dari profiles
  const uploaderIds = [...new Set(data.map((r: { uploaded_by: string }) => r.uploaded_by))]
  const { data: profiles } = uploaderIds.length > 0
    ? await sb.from("profiles").select("id, nama_lengkap").in("id", uploaderIds)
    : { data: [] }

  const nameMap = new Map<string, string>()
  for (const p of profiles ?? []) {
    nameMap.set(p.id, p.nama_lengkap)
  }

  return data.map((row: {
    id: string
    nama: string
    deskripsi: string | null
    file_path: string
    file_size: number
    uploaded_by: string
    created_at: string
  }) => ({
    id: row.id,
    nama: row.nama,
    deskripsi: row.deskripsi,
    file_path: row.file_path,
    file_size: row.file_size,
    uploaded_by: row.uploaded_by,
    uploader_nama: nameMap.get(row.uploaded_by) ?? null,
    created_at: row.created_at,
  }))
}

// ─── Upload Dokumen ───────────────────────────────────────────────────────────

export async function uploadDokumenPanduan(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const profile = await requireRole(["ADMIN"])

  const file = formData.get("file") as File | null
  const nama = (formData.get("nama") as string | null)?.trim()
  const deskripsi = (formData.get("deskripsi") as string | null)?.trim() || null

  if (!file || file.size === 0) return { ok: false, pesan: "File PDF wajib dipilih." }
  if (!nama) return { ok: false, pesan: "Nama dokumen wajib diisi." }
  if (file.type !== "application/pdf") return { ok: false, pesan: "Hanya file PDF yang diizinkan." }
  if (file.size > 20 * 1024 * 1024) return { ok: false, pesan: "Ukuran file maksimal 20 MB." }

  // Pastikan bucket sudah ada (auto-create via service role)
  const bucketErr = await ensureBucket()
  if (bucketErr) return { ok: false, pesan: bucketErr }

  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`
  const filePath = `uploads/${safeName}`

  const bytes = await file.arrayBuffer()

  // Gunakan admin client murni (service role) untuk upload storage
  const admin = createStorageAdmin()
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(filePath, bytes, { contentType: "application/pdf", upsert: false })

  if (uploadError) return { ok: false, pesan: `Gagal unggah file: ${uploadError.message}` }

  // Simpan metadata ke DB pakai user client biasa
  const sb = await createClient()
  const { data: inserted, error: dbError } = await sb
    .from("dokumen_panduan")
    .insert({
      nama,
      deskripsi,
      file_path: filePath,
      file_size: file.size,
      uploaded_by: profile.id,
    })
    .select("id")
    .single()

  if (dbError || !inserted) {
    await admin.storage.from(BUCKET).remove([filePath])
    return { ok: false, pesan: `Gagal menyimpan data: ${dbError?.message}` }
  }

  revalidatePath("/panduan")
  return { ok: true, data: { id: inserted.id } }
}

// ─── Get Signed Download URL ──────────────────────────────────────────────────

export async function getDownloadUrl(id: string): Promise<ActionResult<{ url: string; nama: string }>> {
  const profile = await getCurrentProfile()
  if (!profile) return { ok: false, pesan: "Tidak terautentikasi." }

  const sb = await createClient()
  const { data: doc, error } = await sb
    .from("dokumen_panduan")
    .select("file_path, nama")
    .eq("id", id)
    .single()

  if (error || !doc) return { ok: false, pesan: "Dokumen tidak ditemukan." }

  // Gunakan admin client murni untuk signed URL
  const admin = createStorageAdmin()
  const { data: signed, error: signErr } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(doc.file_path, 60 * 5) // berlaku 5 menit

  if (signErr || !signed) return { ok: false, pesan: `Gagal membuat URL unduhan: ${signErr?.message}` }

  return { ok: true, data: { url: signed.signedUrl, nama: doc.nama } }
}

// ─── Delete Dokumen ───────────────────────────────────────────────────────────

export async function deleteDokumenPanduan(id: string): Promise<ActionResult> {
  await requireRole(["ADMIN"])

  const sb = await createClient()
  const { data: doc, error: fetchErr } = await sb
    .from("dokumen_panduan")
    .select("file_path")
    .eq("id", id)
    .single()

  if (fetchErr || !doc) return { ok: false, pesan: "Dokumen tidak ditemukan." }

  // Hapus file pakai admin client murni
  const admin = createStorageAdmin()
  const { error: storageErr } = await admin.storage
    .from(BUCKET)
    .remove([doc.file_path])

  if (storageErr) return { ok: false, pesan: `Gagal hapus file: ${storageErr.message}` }

  const { error: dbErr } = await sb.from("dokumen_panduan").delete().eq("id", id)
  if (dbErr) return { ok: false, pesan: `Gagal hapus data: ${dbErr.message}` }

  revalidatePath("/panduan")
  return { ok: true, data: undefined }
}
