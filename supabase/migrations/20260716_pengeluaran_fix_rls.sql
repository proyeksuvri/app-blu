-- Migration: Memperbaiki RLS Policy Update pada tabel pengeluaran
-- Memperbaiki error: "new row violates row-level security policy for table pengeluaran"
-- Error ini terjadi karena kebijakan (policy) lama tidak memiliki klausa WITH CHECK,
-- sehingga nilai 'status' pada baris baru (verified) dievaluasi dengan klausa USING (yang mensyaratkan status = 'draft')

DROP POLICY IF EXISTS "pengeluaran_update" ON public.pengeluaran;

CREATE POLICY "pengeluaran_update" ON public.pengeluaran
  FOR UPDATE TO authenticated
  USING (
    -- Data lama yang boleh diedit: draft (oleh semua) atau verified (hanya admin, untuk void)
    status IN ('draft', 'verified') AND (
      EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.roles r ON p.role_id = r.id
        WHERE p.id = auth.uid() AND r.kode = 'ADMIN'
      )
      OR
      (
        status = 'draft' AND
        created_by = auth.uid() AND
        EXISTS (
          SELECT 1 FROM public.profiles p
          JOIN public.roles r ON p.role_id = r.id
          WHERE p.id = auth.uid() AND r.kode = 'OPERATOR'
        )
      )
    )
  )
  WITH CHECK (
    -- Validasi nilai baru setelah update:
    -- ADMIN bebas mengubah ke status apa pun (draft, verified, void)
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.kode = 'ADMIN'
    )
    OR
    -- OPERATOR hanya boleh menyimpan sebagai draft
    (
      status = 'draft' AND
      created_by = auth.uid() AND
      EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.roles r ON p.role_id = r.id
        WHERE p.id = auth.uid() AND r.kode = 'OPERATOR'
      )
    )
  );
