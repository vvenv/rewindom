import { authRoutes } from "./routes/auth.routes.js";
import { captchaRoutes } from "./routes/captcha.routes.js";
import { publicRoutes } from "./routes/public.routes.js";
import { systemRoutes } from "./routes/system.routes.js";

import type { FastifyInstance, FastifyPluginAsync } from "fastify";

interface KernelRouteRegistration {
  plugin: FastifyPluginAsync | ((app: FastifyInstance) => Promise<void>);
  prefix: string;
}

const kernelRouteModules: KernelRouteRegistration[] = [
  { plugin: authRoutes, prefix: "/api/auth" },
  { plugin: publicRoutes, prefix: "/api/public" },
  { plugin: captchaRoutes, prefix: "/api/captcha" },
  { plugin: systemRoutes, prefix: "/api" },
];

export async function registerKernelRoutes(app: FastifyInstance): Promise<void> {
  for (const { plugin, prefix } of kernelRouteModules) {
    await app.register(plugin, { prefix });
  }
}
