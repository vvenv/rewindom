/**
 * Workspace-root Prisma config for the language server / editors.
 *
 * Module schemas live under `packages/builtin/<id>/schema.prisma` (and
 * `modules/<id>/prisma/…`) and are only fragments; the assembled schema is
 * `apps/server/prisma`. Opening a fragment walks up looking for
 * `prisma.config.*` — without this file the LS treats the fragment as a
 * standalone schema and flags cross-file relations like `User` as unknown.
 *
 * CLI commands still run from `apps/server` and use `apps/server/prisma.config.ts`.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, ".env") });
const devEnvFile = process.env.APP_ENV_FILE ?? ".env.local";
config({ path: path.resolve(__dirname, devEnvFile), override: true });

export default defineConfig({
  schema: path.join(__dirname, "apps/server/prisma"),
  migrations: {
    path: path.join(__dirname, "apps/server/prisma/migrations"),
  },
  datasource: {
    url: env("DATABASE_URL"),
    ...(process.env.SHADOW_DATABASE_URL
      ? { shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL }
      : {}),
  },
});
