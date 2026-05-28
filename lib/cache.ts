import { redis } from "@/lib/redis"

export async function invalidateDashboardCache() {
  const keys = await redis.keys("dashboard:stats:*")
  if (keys.length) await redis.del(...(keys as [string, ...string[]]))
}
