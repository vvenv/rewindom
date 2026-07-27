import { Redis } from "ioredis";

import { config } from "../lib/config.js";
import { createModuleLogger } from "../lib/logger.js";

const log = createModuleLogger("redis");

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      host: config.infra.redis.host,
      port: config.infra.redis.port,
      password: config.infra.redis.password,
      db: config.infra.redis.db,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redisClient.on("error", (err: Error) => {
      log.error({ err }, "Redis 连接出错");
    });

    redisClient.on("connect", () => {
      log.info("Redis 连接成功");
    });
  }

  return redisClient;
}

export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

export function getRedisStatus(): {
  connected: boolean;
  host: string;
  port: number;
} {
  const client = getRedisClient();
  return {
    connected: client.status === "ready",
    host: config.infra.redis.host,
    port: config.infra.redis.port,
  };
}
