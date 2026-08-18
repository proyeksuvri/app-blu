-- Tabel metadata dokumen rekening koran (file PDF dari bank)
CREATE TABLE IF NOT EXISTS public.dokumen_rekening_koran (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rekening_bank_id UUID NOT NULL REFERENCES public.rekening_bank(id) ON DELETE CASCADE,
  tahun            SMALLINT NOT NULL,
  bulan            SMALLINT NOT NULL CHECK (bulan >= 1 AND bulan <= 12),
  nama             TEXT NOT NULL,
  file_path        TEXT NOT NULL,
  file_size        BIGINT NOT NULL DEFAULT 0,
  uploaded_by      UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at       TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- RLS
ALTER TABLE public.dokumen_rekening_koran ENABLE ROW LEVEL SECURITY;

-- Semua authenticated bisa baca
CREATE POLICY "dok_rek_select" ON public.dokumen_rekening_koran
  FOR SELECT TO authenticated USING (true);

-- Hanya ADMIN yang bisa insert
CREATE POLICY "dok_rek_insert" ON public.dokumen_rekening_koran
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.kode = 'ADMIN'
    )
  );

-- Hanya ADMIN yang bisa delete
CREATE POLICY "dok_rek_delete" ON public.dokumen_rekening_koran
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.kode = 'ADMIN'
    )
  );
