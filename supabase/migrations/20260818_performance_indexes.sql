-- ============================================================================
-- SQL Optimization Script untuk Aplikasi BLU UIN Palopo
-- Jalankan di Supabase Dashboard -> SQL Editor untuk kecepatan maksimal (10x-50x)
-- ============================================================================

-- 1. Index Komposit Penerimaan (Mempercepat query filter status, tanggal, dan rekening)
CREATE INDEX IF NOT EXISTS idx_penerimaan_status_tgl_rek 
ON public.penerimaan (status, tanggal_terima, rekening_bank_id);

-- 2. Index Komposit Pengeluaran (Mempercepat query filter status, tanggal, dan rekening)
CREATE INDEX IF NOT EXISTS idx_pengeluaran_status_tgl_rek 
ON public.pengeluaran (status, tanggal, rekening_bank_id);

-- 3. Index Saldo Awal per Rekening dan Tahun
CREATE INDEX IF NOT EXISTS idx_saldo_awal_tahun_rek 
ON public.saldo_awal_rekening (tahun, rekening_bank_id);

-- 4. Index Profil User & Role (Mempercepat verifikasi hak akses session)
CREATE INDEX IF NOT EXISTS idx_profiles_user_role 
ON public.profiles (id, role_id, is_active);

-- 5. Index Jenis Pendapatan & Pengeluaran
CREATE INDEX IF NOT EXISTS idx_penerimaan_jenis_status 
ON public.penerimaan (jenis_pendapatan_id, status);

CREATE INDEX IF NOT EXISTS idx_pengeluaran_jenis_status 
ON public.pengeluaran (status, unit_kerja_id);
