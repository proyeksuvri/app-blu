-- Migration: Memperbaiki referensi foreign key pada tabel pengeluaran
-- Mengubah relasi dari auth.users menjadi public.profiles agar bisa di-join via API Supabase (PostgREST)

ALTER TABLE public.pengeluaran
  DROP CONSTRAINT IF EXISTS pengeluaran_created_by_fkey,
  DROP CONSTRAINT IF EXISTS pengeluaran_updated_by_fkey,
  DROP CONSTRAINT IF EXISTS pengeluaran_verified_by_fkey,
  DROP CONSTRAINT IF EXISTS pengeluaran_voided_by_fkey;

ALTER TABLE public.pengeluaran
  ADD CONSTRAINT pengeluaran_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD CONSTRAINT pengeluaran_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD CONSTRAINT pengeluaran_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT pengeluaran_voided_by_fkey FOREIGN KEY (voided_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
