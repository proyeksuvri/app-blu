-- Migration: Tabel Konfigurasi Google Drive
-- Tanggal: 2026-08-26
-- Deskripsi:
--   Menyimpan konfigurasi URL Google Drive / Google Sheets
--   yang akan dibaca oleh fitur "Realisasi Pengesahan".
--   Data aktual TIDAK disimpan di sini — hanya URL konfigurasi.

-- ─── 1. Tabel gdrive_config ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.gdrive_config (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  nama        TEXT        NOT NULL,           -- Label tampilan, e.g. "Realisasi Pengesahan 24 Agt"
  url         TEXT        NOT NULL,           -- URL Google Sheets / Google Drive
  sheet_name  TEXT,                           -- Nama tab sheet (opsional)
  keterangan  TEXT,                           -- Catatan tambahan
  urutan      INT         NOT NULL DEFAULT 0, -- Urutan tampil di dropdown
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger updated_at
CREATE OR REPLACE TRIGGER trg_gdrive_config_updated_at
BEFORE UPDATE ON public.gdrive_config
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- ─── 2. Row Level Security (RLS) ─────────────────────────────────────────────

ALTER TABLE public.gdrive_config ENABLE ROW LEVEL SECURITY;

-- ADMIN dan PIMPINAN bisa SELECT
DROP POLICY IF EXISTS "gdrive_config_select" ON public.gdrive_config;
CREATE POLICY "gdrive_config_select" ON public.gdrive_config
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.kode IN ('ADMIN', 'PIMPINAN')
    )
  );

-- Hanya ADMIN yang bisa INSERT
DROP POLICY IF EXISTS "gdrive_config_insert" ON public.gdrive_config;
CREATE POLICY "gdrive_config_insert" ON public.gdrive_config
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.kode = 'ADMIN'
    )
  );

-- Hanya ADMIN yang bisa UPDATE
DROP POLICY IF EXISTS "gdrive_config_update" ON public.gdrive_config;
CREATE POLICY "gdrive_config_update" ON public.gdrive_config
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.kode = 'ADMIN'
    )
  );

-- Hanya ADMIN yang bisa DELETE
DROP POLICY IF EXISTS "gdrive_config_delete" ON public.gdrive_config;
CREATE POLICY "gdrive_config_delete" ON public.gdrive_config
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.kode = 'ADMIN'
    )
  );

-- ─── 3. Index ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_gdrive_config_urutan
  ON public.gdrive_config (urutan, nama);

COMMENT ON TABLE public.gdrive_config
  IS 'Konfigurasi URL Google Drive / Google Sheets untuk fitur Realisasi Pengesahan. Hanya menyimpan URL, bukan data aktual.';
