-- Migration: Fungsi untuk men-generate banyak nomor bukti pengeluaran sekaligus
-- Berguna untuk import Excel massal

CREATE OR REPLACE FUNCTION public.fn_generate_nomor_bukti_pengeluaran_batch(p_tahun INT, p_count INT)
RETURNS TEXT[] AS $$
DECLARE
  v_current_count INT;
  v_result TEXT[];
  i INT;
BEGIN
  -- Kunci tabel untuk mencegah race condition
  LOCK TABLE public.pengeluaran IN SHARE ROW EXCLUSIVE MODE;

  SELECT COUNT(*)
  INTO v_current_count
  FROM public.pengeluaran
  WHERE EXTRACT(YEAR FROM tanggal) = p_tahun;

  v_result := ARRAY[]::TEXT[];
  
  FOR i IN 1..p_count LOOP
    v_result := array_append(v_result, 'K-' || p_tahun::TEXT || '-' || LPAD((v_current_count + i)::TEXT, 5, '0'));
  END LOOP;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
