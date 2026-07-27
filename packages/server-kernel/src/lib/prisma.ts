import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client/client.js";

import { config } from "./config.js";
import { createModuleLogger } from "./logger.js";
import {
  assertModelClassificationComplete,
  createTenantGuardExtension,
} from "./tenant-guard.js";

import type { FastifyInstance } from "fastify";

export interface PrismaQueryEvent {
  duration: number;
  query: string;
  params: string;
  target: string;
}

let queryEventListener: ((event: PrismaQueryEvent) => void) | null = null;

export function setPrismaQueryEventListener(
  listener: (event: PrismaQueryEvent) => void,
): void {
  queryEventListener = listener;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const guardLogger = createModuleLogger("tenant-guard");

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: config.database.url });
  const client = new PrismaClient({
    adapter,
    log: [{ emit: "event", level: "query" }],
  });

  // $on 必须在 $extends 之前挂载：扩展后的 client 不再暴露 $on。
  client.$on("query", (event) => {
    queryEventListener?.(event);
  });

  const mode = config.tenant.guardMode;
  if (mode === "off") {
    return client;
  }

  assertModelClassificationComplete();

  const guarded = client.$extends(
    createTenantGuardExtension({
      mode,
      onViolation: (violation) => {
        guardLogger.warn({ violation, mode }, "tenant guard violation");
      },
    }),
  );

  // 扩展只挂了 query 钩子，没有新增方法或字段，运行时形状与 PrismaClient 一致；
  // 回到 PrismaClient 类型可以让既有调用方与测试 mock 完全不受影响。
  return guarded as unknown as PrismaClient;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (!config.server.isProduction) {
  globalForPrisma.prisma = prisma;
}

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export async function setupPrisma(app: FastifyInstance) {
  app.decorate("prisma", prisma);
}
