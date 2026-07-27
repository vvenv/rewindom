import { success } from "@be-water/shared";

import { getAppVersion } from "../../lib/app-version.js";

import type { FastifyInstance } from "fastify";

export async function systemRoutes(app: FastifyInstance) {
  app.get("/system-info", async (_request, reply) => {
    return reply.send(success({ version: getAppVersion() }));
  });
}
