import { getRedis } from "@/lib/redis"

export async function invalidateDashboardCache() {
  const redis = getRedis()
  if (!redis) return
  const keys = await redis.keys("dashboard:stats:*")
  if (keys.length) await redis.del(...(keys as [string, ...string[]]))
}
