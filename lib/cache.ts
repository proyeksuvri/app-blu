import { getRedis } from "@/lib/redis"

// ─── Dashboard Cache ──────────────────────────────────────────────────────────

export async function invalidateDashboardCache() {
  const redis = getRedis()
  if (!redis) return
  const keys = await redis.keys("dashboard:stats:*")
  if (keys.length) await redis.del(...(keys as [string, ...string[]]))
}

export async function invalidatePenerimaanFilteredCache() {
  const redis = getRedis()
  if (!redis) return
  try {
    const keys = await redis.keys("penerimaan:filtered:*")
    if (keys.length) await redis.del(...(keys as [string, ...string[]]))
  } catch {
    // Abaikan error Redis
  }
}

// ─── Import Cache ─────────────────────────────────────────────────────────────

export async function invalidateImportCache() {
  const redis = getRedis()
  if (!redis) return
  await redis.del("import:master_maps", "import:pengeluaran:master_maps")
}

// ─── Master Data Cache ────────────────────────────────────────────────────────

const MASTER_TTL = 600 // 10 menit

/**
 * Cache-aside helper.
 * Mengambil data dari Redis jika ada; jika tidak, jalankan fetcher lalu simpan.
 */
export async function withCache<T>(key: string, fetcher: () => Promise<T>, ttl = MASTER_TTL): Promise<T> {
  const redis = getRedis()
  if (!redis) return fetcher()

  try {
    const cached = await redis.get<T>(key)
    if (cached !== null && cached !== undefined) return cached
  } catch {
    // Redis error → fallback ke Supabase
  }

  const fresh = await fetcher()

  try {
    await redis.set(key, fresh, { ex: ttl })
  } catch {
    // Gagal simpan cache → tetap kembalikan data segar
  }

  return fresh
}

/**
 * Hapus semua cache data master sekaligus.
 * Dipanggil saat ada operasi CREATE / UPDATE / DELETE / TOGGLE pada tabel master.
 */
export async function invalidateMasterCache() {
  const redis = getRedis()
  if (!redis) return

  try {
    const keys = await redis.keys("master:*")
    if (keys.length) await redis.del(...(keys as [string, ...string[]]))
  } catch {
    // Abaikan error Redis
  }
}
