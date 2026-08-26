-- Migration: Tabel Mahasiswa + Kolom Virtual Akun di Penerimaan
-- Tanggal: 2026-08-20
-- Deskripsi:
--   1. Buat tabel mahasiswa sebagai master data mahasiswa
--   2. Tambah kolom virtual_akun di tabel penerimaan sebagai penghubung
--   3. Buat index untuk performa join & lookup

-- ─── 1. Tabel Mahasiswa ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.mahasiswa (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  no_virtual_akun   TEXT        NOT NULL UNIQUE,
  nim               TEXT        NOT NULL,
  nama_mahasiswa    TEXT        NOT NULL,
  fakultas          TEXT,
  prodi             TEXT,
  periode           TEXT,
  is_active         BOOLEAN     NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger updated_at
CREATE OR REPLACE TRIGGER trg_mahasiswa_updated_at
BEFORE UPDATE ON public.mahasiswa
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- ─── 2. Row Level Security (RLS) ─────────────────────────────────────────────

ALTER TABLE public.mahasiswa ENABLE ROW LEVEL SECURITY;

-- Semua user login bisa membaca
DROP POLICY IF EXISTS "mahasiswa_select" ON public.mahasiswa;
CREATE POLICY "mahasiswa_select" ON public.mahasiswa
  FOR SELECT TO authenticated USING (true);

-- Hanya ADMIN yang bisa insert
DROP POLICY IF EXISTS "mahasiswa_insert" ON public.mahasiswa;
CREATE POLICY "mahasiswa_insert" ON public.mahasiswa
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.kode = 'ADMIN'
    )
  );

-- Hanya ADMIN yang bisa update
DROP POLICY IF EXISTS "mahasiswa_update" ON public.mahasiswa;
CREATE POLICY "mahasiswa_update" ON public.mahasiswa
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.kode = 'ADMIN'
    )
  );

-- Hanya ADMIN yang bisa delete
DROP POLICY IF EXISTS "mahasiswa_delete" ON public.mahasiswa;
CREATE POLICY "mahasiswa_delete" ON public.mahasiswa
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.kode = 'ADMIN'
    )
  );

-- ─── 3. Index Tabel Mahasiswa ─────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_mahasiswa_nim
  ON public.mahasiswa (nim);

CREATE INDEX IF NOT EXISTS idx_mahasiswa_nama
  ON public.mahasiswa (nama_mahasiswa);

CREATE INDEX IF NOT EXISTS idx_mahasiswa_is_active
  ON public.mahasiswa (is_active);

-- ─── 4. ALTER Tabel Penerimaan — Tambah Kolom virtual_akun ──────────────────

ALTER TABLE public.penerimaan
  ADD COLUMN IF NOT EXISTS virtual_akun TEXT DEFAULT NULL;

-- Index untuk join ke tabel mahasiswa
CREATE INDEX IF NOT EXISTS idx_penerimaan_virtual_akun
  ON public.penerimaan (virtual_akun)
  WHERE virtual_akun IS NOT NULL;

COMMENT ON COLUMN public.penerimaan.virtual_akun
  IS 'Nomor virtual akun mahasiswa. Penghubung ke tabel mahasiswa.no_virtual_akun. Nullable — transaksi non-mahasiswa tidak perlu diisi.';

COMMENT ON TABLE public.mahasiswa
  IS 'Master data mahasiswa. Direlasikan ke penerimaan via kolom virtual_akun.';
