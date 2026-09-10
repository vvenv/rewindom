import {
  checkDependencies,
  toOpsReadyBody,
} from "../../lib/dependency-health.js";

import type { FastifyInstance } from "fastify";

/**
 * 编排探针。
 * `/health`：进程还活着（Docker 存活必须廉价，禁止打依赖）。
 * `/ready`：这个实例能不能接流量。只把 Postgres 当硬依赖；Redis 失败仍 200。
 * 响应只有 `{ status }`。
 */
export async function registerOpsProbeRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get("/health", async () => {
    return { status: "ok" };
  });

  app.get("/ready", async (_request, reply) => {
    const snapshot = await checkDependencies();
    return reply
      .code(snapshot.ready ? 200 : 503)
      .send(toOpsReadyBody(snapshot));
  });
}
