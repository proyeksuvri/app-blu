-- Buat fungsi handle_updated_at jika belum ada
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tabel saldo awal per rekening per tahun
CREATE TABLE IF NOT EXISTS public.saldo_awal_rekening (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rekening_bank_id UUID NOT NULL REFERENCES public.rekening_bank(id) ON DELETE CASCADE,
  tahun            SMALLINT NOT NULL CHECK (tahun >= 2000 AND tahun <= 2100),
  saldo            BIGINT NOT NULL DEFAULT 0,
  keterangan       TEXT,
  created_by       UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_by       UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at       TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at       TIMESTAMPTZ DEFAULT now() NOT NULL,

  CONSTRAINT saldo_awal_rekening_unique UNIQUE (rekening_bank_id, tahun)
);

-- Trigger updated_at
CREATE OR REPLACE TRIGGER trg_saldo_awal_rekening_updated_at
BEFORE UPDATE ON public.saldo_awal_rekening
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.saldo_awal_rekening ENABLE ROW LEVEL SECURITY;

-- Semua user login bisa baca
CREATE POLICY "saldo_awal_select" ON public.saldo_awal_rekening
  FOR SELECT TO authenticated USING (true);

-- Hanya ADMIN yang bisa insert/update/delete
CREATE POLICY "saldo_awal_insert" ON public.saldo_awal_rekening
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.kode = 'ADMIN'
    )
  );

CREATE POLICY "saldo_awal_update" ON public.saldo_awal_rekening
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.kode = 'ADMIN'
    )
  );

CREATE POLICY "saldo_awal_delete" ON public.saldo_awal_rekening
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.kode = 'ADMIN'
    )
  );
