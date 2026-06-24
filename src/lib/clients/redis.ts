import Redis from "ioredis";

// Reuse a single connection across hot-reloads in development
const g = global as unknown as { _redis?: Redis };

function createClient(): Redis {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  return new Redis(url, {
    lazyConnect: true,
    connectTimeout: 3_000,
    maxRetriesPerRequest: 2,
    // Queue the first command until the lazy connection is ready, otherwise the
    // initial cache read/write is rejected before the socket finishes connecting.
    enableOfflineQueue: true,
  });
}

export const redis: Redis = g._redis ?? createClient();

if (process.env.NODE_ENV !== "production") {
  g._redis = redis;
}
