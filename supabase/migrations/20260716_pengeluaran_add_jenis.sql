-- Migration: Tambah kolom jenis_pengeluaran_id ke tabel pengeluaran
-- Menghubungkan transaksi pengeluaran dengan klasifikasi jenis pengeluaran

ALTER TABLE public.pengeluaran
  ADD COLUMN IF NOT EXISTS jenis_pengeluaran_id UUID
    REFERENCES public.jenis_pengeluaran(id) ON DELETE RESTRICT;

-- Index untuk performa query filter/laporan
CREATE INDEX IF NOT EXISTS idx_pengeluaran_jenis_id
  ON public.pengeluaran(jenis_pengeluaran_id);
