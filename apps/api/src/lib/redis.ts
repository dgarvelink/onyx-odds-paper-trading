import { Redis } from "ioredis";

const redis = new Redis(process.env.REDIS_URL!);

export async function getCached<T>(key: string): Promise<T | null> {
  const raw = await redis.get(key);
  if (raw === null) return null;
  return JSON.parse(raw) as T;
}

export async function setCached<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
}

export async function deleteCached(key: string): Promise<void> {
  await redis.del(key);
}

export default redis;
