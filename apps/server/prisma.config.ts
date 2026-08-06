import path from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../../.env") });
const devEnvFile = process.env.APP_ENV_FILE ?? ".env.local";
config({ path: path.resolve(__dirname, `../../${devEnvFile}`), override: true });

export default defineConfig({
  schema: "prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
    /*
     * 影子库：`migrate diff --from-migrations` 要一个空库来重放迁移历史。
     *
     * 有它才能**离线**生成迁移（重放 migrations → 对比 schema），不必让 `migrate dev`
     * 去比对开发库——开发库难免有历史漂移，一比就会生成一堆 DROP。只在开发机、
     * 且只在真要生成迁移时才需要；生产与日常都走 `migrate deploy`，所以设成可选：
     * `env()` 在变量缺失时会直接抛，那会把每一条 prisma 命令都连坐掉。
     */
    ...(process.env.SHADOW_DATABASE_URL
      ? { shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL }
      : {}),
  },
});
