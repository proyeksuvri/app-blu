-- 1. Buat Tabel Pengeluaran
CREATE TABLE IF NOT EXISTS public.pengeluaran (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nomor_bukti       TEXT NOT NULL UNIQUE,
  tanggal           DATE NOT NULL,
  uraian            TEXT,
  jumlah            BIGINT NOT NULL DEFAULT 0,
  rekening_bank_id  UUID REFERENCES public.rekening_bank(id) ON DELETE RESTRICT,
  unit_kerja_id     UUID REFERENCES public.unit_kerja(id) ON DELETE RESTRICT,
  status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'verified', 'void')),
  
  -- Audit Trail
  created_by        UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_by        UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  verified_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at       TIMESTAMPTZ,
  voided_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  voided_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at        TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Trigger Updated At
CREATE OR REPLACE TRIGGER trg_pengeluaran_updated_at
BEFORE UPDATE ON public.pengeluaran
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 3. Row Level Security (RLS)
ALTER TABLE public.pengeluaran ENABLE ROW LEVEL SECURITY;

-- Semua role login bisa melihat data pengeluaran
CREATE POLICY "pengeluaran_select" ON public.pengeluaran
  FOR SELECT TO authenticated USING (true);

-- Hanya ADMIN dan OPERATOR yang bisa INSERT
CREATE POLICY "pengeluaran_insert" ON public.pengeluaran
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.kode IN ('ADMIN', 'OPERATOR')
    )
  );

-- UPDATE: ADMIN bisa ubah semua draft, OPERATOR hanya bisa ubah draft miliknya sendiri
CREATE POLICY "pengeluaran_update" ON public.pengeluaran
  FOR UPDATE TO authenticated
  USING (
    status = 'draft' AND (
      -- ADMIN bebas ubah draft
      EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.roles r ON p.role_id = r.id
        WHERE p.id = auth.uid() AND r.kode = 'ADMIN'
      )
      OR
      -- OPERATOR cuma bisa ubah miliknya
      (
        created_by = auth.uid() AND
        EXISTS (
          SELECT 1 FROM public.profiles p
          JOIN public.roles r ON p.role_id = r.id
          WHERE p.id = auth.uid() AND r.kode = 'OPERATOR'
        )
      )
    )
  );

-- DELETE: Sesuai aturan update
CREATE POLICY "pengeluaran_delete" ON public.pengeluaran
  FOR DELETE TO authenticated
  USING (
    status = 'draft' AND (
      EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.roles r ON p.role_id = r.id
        WHERE p.id = auth.uid() AND r.kode = 'ADMIN'
      )
      OR
      (
        created_by = auth.uid() AND
        EXISTS (
          SELECT 1 FROM public.profiles p
          JOIN public.roles r ON p.role_id = r.id
          WHERE p.id = auth.uid() AND r.kode = 'OPERATOR'
        )
      )
    )
  );

-- 4. Fungsi Generator Nomor Bukti Pengeluaran
-- Format: K-[TAHUN]-[URUTAN] contoh: K-2024-00001
CREATE OR REPLACE FUNCTION public.fn_generate_nomor_bukti_pengeluaran(p_tahun INT)
RETURNS TEXT AS $$
DECLARE
  v_count INT;
  v_nomor TEXT;
BEGIN
  -- Kunci tabel untuk mencegah race condition (optional tapi disarankan)
  LOCK TABLE public.pengeluaran IN SHARE ROW EXCLUSIVE MODE;

  SELECT COUNT(*)
  INTO v_count
  FROM public.pengeluaran
  WHERE EXTRACT(YEAR FROM tanggal) = p_tahun;

  v_nomor := 'K-' || p_tahun::TEXT || '-' || LPAD((v_count + 1)::TEXT, 5, '0');
  
  RETURN v_nomor;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
