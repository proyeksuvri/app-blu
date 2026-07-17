-- Migration: Tabel Kategori Pengeluaran dan Jenis Pengeluaran
-- Mengikuti pola yang sama dengan kategori_pendapatan dan jenis_pendapatan

-- ─── 1. Tabel Kategori Pengeluaran ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.kategori_pengeluaran (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kode        TEXT NOT NULL UNIQUE,
  nama        TEXT NOT NULL,
  keterangan  TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Trigger updated_at
CREATE OR REPLACE TRIGGER trg_kategori_pengeluaran_updated_at
BEFORE UPDATE ON public.kategori_pengeluaran
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.kategori_pengeluaran ENABLE ROW LEVEL SECURITY;

-- Semua user login bisa membaca
DROP POLICY IF EXISTS "kategori_pengeluaran_select" ON public.kategori_pengeluaran;
CREATE POLICY "kategori_pengeluaran_select" ON public.kategori_pengeluaran
  FOR SELECT TO authenticated USING (true);

-- Hanya ADMIN yang bisa insert/update/delete
DROP POLICY IF EXISTS "kategori_pengeluaran_insert" ON public.kategori_pengeluaran;
CREATE POLICY "kategori_pengeluaran_insert" ON public.kategori_pengeluaran
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.kode = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS "kategori_pengeluaran_update" ON public.kategori_pengeluaran;
CREATE POLICY "kategori_pengeluaran_update" ON public.kategori_pengeluaran
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.kode = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS "kategori_pengeluaran_delete" ON public.kategori_pengeluaran;
CREATE POLICY "kategori_pengeluaran_delete" ON public.kategori_pengeluaran
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.kode = 'ADMIN'
    )
  );

-- ─── 2. Tabel Jenis Pengeluaran ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.jenis_pengeluaran (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kategori_pengeluaran_id UUID NOT NULL REFERENCES public.kategori_pengeluaran(id) ON DELETE RESTRICT,
  kode                    TEXT NOT NULL UNIQUE,
  nama                    TEXT NOT NULL,
  akun_belanja            TEXT,
  keterangan              TEXT,
  is_active               BOOLEAN NOT NULL DEFAULT true,
  created_at              TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at              TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Trigger updated_at
CREATE OR REPLACE TRIGGER trg_jenis_pengeluaran_updated_at
BEFORE UPDATE ON public.jenis_pengeluaran
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.jenis_pengeluaran ENABLE ROW LEVEL SECURITY;

-- Semua user login bisa membaca
DROP POLICY IF EXISTS "jenis_pengeluaran_select" ON public.jenis_pengeluaran;
CREATE POLICY "jenis_pengeluaran_select" ON public.jenis_pengeluaran
  FOR SELECT TO authenticated USING (true);

-- Hanya ADMIN yang bisa insert/update/delete
DROP POLICY IF EXISTS "jenis_pengeluaran_insert" ON public.jenis_pengeluaran;
CREATE POLICY "jenis_pengeluaran_insert" ON public.jenis_pengeluaran
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.kode = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS "jenis_pengeluaran_update" ON public.jenis_pengeluaran;
CREATE POLICY "jenis_pengeluaran_update" ON public.jenis_pengeluaran
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.kode = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS "jenis_pengeluaran_delete" ON public.jenis_pengeluaran;
CREATE POLICY "jenis_pengeluaran_delete" ON public.jenis_pengeluaran
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.kode = 'ADMIN'
    )
  );

-- ─── 3. Data Awal (seed) ──────────────────────────────────────────────────────

INSERT INTO public.kategori_pengeluaran (kode, nama) VALUES
  ('PGL-BLU', 'Pengeluaran BLU'),
  ('PGL-NON', 'Pengeluaran Non BLU')
ON CONFLICT (kode) DO NOTHING;
