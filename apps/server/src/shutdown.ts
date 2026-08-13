import { closeRedisConnection } from "@rewindom/server-kernel/infra/redis.service.js";
import { stopBackgroundScheduler } from "@rewindom/server-kernel/infra/scheduler.service.js";

import type { FastifyInstance } from "fastify";

export function registerGracefulShutdown(app: FastifyInstance): void {
  const gracefulShutdown = async (signal: string): Promise<void> => {
    app.log.info(`[shutdown] 收到 ${signal}，开始优雅停机`);

    try {
      await app.close();
      app.log.info("[shutdown] HTTP 服务已关闭");

      stopBackgroundScheduler();
      await closeRedisConnection();
      app.log.info("[shutdown] Redis 连接已关闭");

      app.log.info("[shutdown] 优雅停机完成");
      process.exit(0);
    } catch (err) {
      app.log.error({
        msg: "[shutdown] 优雅停机出错",
        error: err,
      });
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => void gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => void gracefulShutdown("SIGINT"));
}
