import { getRedis } from "@/lib/redis"

export async function invalidateDashboardCache() {
  const redis = getRedis()
  if (!redis) return
  const keys = await redis.keys("dashboard:stats:*")
  if (keys.length) await redis.del(...(keys as [string, ...string[]]))
}

export async function invalidateImportCache() {
  const redis = getRedis()
  if (!redis) return
  await redis.del("import:master_maps", "import:pengeluaran:master_maps")
}
