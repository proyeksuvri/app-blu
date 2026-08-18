-- Migration: Tabel Target Pendapatan
-- Menyimpan target realisasi per jenis pendapatan per tahun
-- Digunakan untuk menghitung persentase realisasi di Laporan Penerimaan BLU

CREATE TABLE IF NOT EXISTS public.target_pendapatan (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tahun                 INT NOT NULL,
  jenis_pendapatan_id   UUID NOT NULL REFERENCES public.jenis_pendapatan(id) ON DELETE CASCADE,
  target                BIGINT NOT NULL DEFAULT 0,
  created_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at            TIMESTAMPTZ DEFAULT now() NOT NULL,

  UNIQUE (tahun, jenis_pendapatan_id)
);

-- Trigger updated_at
CREATE OR REPLACE TRIGGER trg_target_pendapatan_updated_at
BEFORE UPDATE ON public.target_pendapatan
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.target_pendapatan ENABLE ROW LEVEL SECURITY;

-- Semua user login bisa membaca
DROP POLICY IF EXISTS "target_pendapatan_select" ON public.target_pendapatan;
CREATE POLICY "target_pendapatan_select" ON public.target_pendapatan
  FOR SELECT TO authenticated USING (true);

-- Hanya ADMIN yang bisa insert
DROP POLICY IF EXISTS "target_pendapatan_insert" ON public.target_pendapatan;
CREATE POLICY "target_pendapatan_insert" ON public.target_pendapatan
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.kode = 'ADMIN'
    )
  );

-- Hanya ADMIN yang bisa update
DROP POLICY IF EXISTS "target_pendapatan_update" ON public.target_pendapatan;
CREATE POLICY "target_pendapatan_update" ON public.target_pendapatan
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.kode = 'ADMIN'
    )
  );

-- Hanya ADMIN yang bisa delete
DROP POLICY IF EXISTS "target_pendapatan_delete" ON public.target_pendapatan;
CREATE POLICY "target_pendapatan_delete" ON public.target_pendapatan
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.kode = 'ADMIN'
    )
  );
