import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

type TenantModulePreHandler = (
  request: FastifyRequest,
  reply: FastifyReply,
) => Promise<void>;

let createTenantModulePreHandler:
  | ((moduleId: string) => TenantModulePreHandler)
  | null = null;

export function setTenantModulePreHandlerFactory(
  factory: (moduleId: string) => TenantModulePreHandler,
): void {
  createTenantModulePreHandler = factory;
}

export async function registerTenantGatedRoutes(
  app: FastifyInstance,
  moduleId: string,
  register: (scoped: FastifyInstance) => Promise<void>,
): Promise<void> {
  await app.register(async (scoped) => {
    if (createTenantModulePreHandler) {
      scoped.addHook("preHandler", createTenantModulePreHandler(moduleId));
    }
    await register(scoped);
  });
}
