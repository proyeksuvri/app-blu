-- ============================================================
-- Migration: Buat tabel dokumen_panduan + storage bucket
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- 1. Buat tabel dokumen_panduan
CREATE TABLE IF NOT EXISTS public.dokumen_panduan (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nama          TEXT NOT NULL,
  deskripsi     TEXT,
  file_path     TEXT NOT NULL,
  file_size     BIGINT NOT NULL DEFAULT 0,
  uploaded_by   UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.dokumen_panduan ENABLE ROW LEVEL SECURITY;

-- 3. Policy: semua user yang login bisa membaca
CREATE POLICY "dokumen_panduan_select"
  ON public.dokumen_panduan FOR SELECT
  TO authenticated
  USING (true);

-- 4. Policy: hanya admin yang bisa insert
CREATE POLICY "dokumen_panduan_insert"
  ON public.dokumen_panduan FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.kode = 'ADMIN'
    )
  );

-- 5. Policy: hanya admin yang bisa delete
CREATE POLICY "dokumen_panduan_delete"
  ON public.dokumen_panduan FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.kode = 'ADMIN'
    )
  );

-- ============================================================
-- Storage Bucket (jalankan terpisah jika perlu)
-- ============================================================

-- Buat bucket (jika belum ada)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'panduan-dokumen',
  'panduan-dokumen',
  false,
  20971520,  -- 20 MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Policy storage: authenticated user bisa download (SELECT)
CREATE POLICY "storage_panduan_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'panduan-dokumen');

-- Policy storage: hanya admin bisa upload (INSERT)
CREATE POLICY "storage_panduan_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'panduan-dokumen'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.kode = 'ADMIN'
    )
  );

-- Policy storage: hanya admin bisa hapus (DELETE)
CREATE POLICY "storage_panduan_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'panduan-dokumen'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.kode = 'ADMIN'
    )
  );
