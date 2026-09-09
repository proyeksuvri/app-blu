-- Migrasi penambahan kolom saldo bank pembanding pada dokumen_rekening_koran
ALTER TABLE public.dokumen_rekening_koran 
  ADD COLUMN IF NOT EXISTS saldo_masuk_bank NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS saldo_keluar_bank NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS saldo_akhir_bank NUMERIC DEFAULT NULL;
