import "@tanstack/react-start/server-only";

import { Redis } from "@upstash/redis";
import { env, isRedisConfigured } from "~/env";

let redisClient: Redis | null | undefined;

export function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;
  if (!isRedisConfigured()) {
    redisClient = null;
    return null;
  }

  redisClient = new Redis({
    url: env.UPSTASH_REDIS_REST_URL!,
    token: env.UPSTASH_REDIS_REST_TOKEN!,
  });
  return redisClient;
}

function serializeForCache(value: unknown): string {
  return JSON.stringify(value, (_, current) =>
    current instanceof Date
      ? { __cacheDate: current.toISOString() }
      : current
  );
}

function deserializeFromCache<T>(raw: string): T {
  return JSON.parse(raw, (_, current) => {
    if (
      current &&
      typeof current === "object" &&
      typeof current.__cacheDate === "string"
    ) {
      return new Date(current.__cacheDate);
    }
    return current;
  }) as T;
}

export async function readCache<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;

  const hit = await redis.get<string>(key);
  if (hit == null) return null;

  try {
    return deserializeFromCache<T>(hit);
  } catch {
    await redis.del(key);
    return null;
  }
}

export async function writeCache(
  key: string,
  value: unknown,
  ttlSeconds: number
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  await redis.set(key, serializeForCache(value), { ex: ttlSeconds });
}

export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fetch: () => Promise<T>
): Promise<T> {
  const cached = await readCache<T>(key);
  if (cached != null) return cached;

  const value = await fetch();
  await writeCache(key, value, ttlSeconds);
  return value;
}

export async function deleteCacheKeys(keys: string[]): Promise<void> {
  const redis = getRedis();
  if (!redis || keys.length === 0) return;
  await redis.del(...keys);
}

export async function deleteCacheByPrefix(prefix: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  let cursor = 0;
  do {
    const result = await redis.scan(cursor, {
      match: `${prefix}*`,
      count: 100,
    });
    cursor = Number(result[0]);
    const keys = result[1].map(String);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } while (cursor !== 0);
}
