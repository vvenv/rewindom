/**
 * 真机验证：把 tenant-guard 挂到真实 Prisma client 上，用真实 Postgres 跑一遍。
 *
 * 单测只能断言「守卫改写出了什么 args」，无法回答「Prisma 接不接受这种 where」——
 * 尤其是 findUnique / update / delete 这类 unique where 上追加非唯一字段
 * （Prisma 5+ extendedWhereUnique），以及 TenantSetting 这类复合主键模型。
 * 这个脚本补的就是这一段，改动 tenant-guard 后应重跑。
 *
 * 用法（需要本地 Postgres，会创建/清空一个一次性库，不碰开发库）：
 *
 *   docker compose -f docker-compose.dev.yml up -d postgres
 *   docker exec rewindom-dev-postgres psql -U rewindom -d postgres \
 *     -c "CREATE DATABASE guardcheck TEMPLATE template0;"
 *   printf 'DATABASE_URL=%s\n' \
 *     'postgresql://rewindom:<密码>@localhost:5433/guardcheck' > .env.guardcheck
 *   (cd apps/server && APP_ENV_FILE=.env.guardcheck pnpm exec prisma db push)
 *   (cd apps/server && DATABASE_URL='postgresql://rewindom:<密码>@localhost:5433/guardcheck' \
 *     pnpm exec tsx scripts/verify-tenant-guard.mts)
 *
 * 收尾：rm .env.guardcheck && docker exec rewindom-dev-postgres \
 *   psql -U rewindom -d postgres -c "DROP DATABASE guardcheck;"
 */
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@rewindom/server-kernel/generated/prisma/client/client.js";
import {
  runWithRequestContext,
  type RequestContext,
} from "@rewindom/server-kernel/lib/request-context.js";
import {
  createTenantGuardExtension,
  CrossTenantAccessError,
} from "@rewindom/server-kernel/lib/tenant-guard.js";

const URL = process.env.DATABASE_URL;
if (!URL || !/guardcheck/u.test(URL)) {
  // 这个脚本会 deleteMany，只允许指向一次性库，避免误伤开发/生产数据。
  console.error(
    "拒绝运行：DATABASE_URL 必须指向名字包含 guardcheck 的一次性数据库。\n" +
      `当前值：${URL ?? "(未设置)"}`,
  );
  process.exit(1);
}

const base = new PrismaClient({ adapter: new PrismaPg({ connectionString: URL }) });
const prisma = base.$extends(
  createTenantGuardExtension({
    mode: "enforce",
    onViolation: () => {},
  }) as never,
) as unknown as PrismaClient;

function asTenant<T>(tenantId: string | null, fn: () => Promise<T>): Promise<T> {
  const ctx: RequestContext = {
    route: "/api/check",
    method: "GET",
    tenant_id: tenantId,
    tenant_slug: tenantId,
    user_id: null,
    username: null,
    request_id: null,
    source: "http",
  };
  return runWithRequestContext(ctx, fn);
}

const results: string[] = [];
function check(name: string, ok: boolean, extra = "") {
  results.push(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? ` — ${extra}` : ""}`);
}

async function main() {
  // --- 准备：两个租户，各一条笔记（无租户上下文 → 守卫放行） ---
  await asTenant(null, async () => {
    // 幂等清理：按 id 清，且先清掉引用租户的行，否则外键会挡住 tenant 删除。
    const ids = ["TA", "TB"];
    await base.note.deleteMany({ where: { tenant_id: { in: ids } } });
    await base.tenantSetting.deleteMany({ where: { tenant_id: { in: ids } } });
    await base.user.deleteMany({ where: { tenant_id: { in: ids } } });
    await base.tenant.deleteMany({ where: { id: { in: ids } } });
    await base.tenant.create({ data: { id: "TA", slug: "ta", name: "租户A" } });
    await base.tenant.create({ data: { id: "TB", slug: "tb", name: "租户B" } });
    await base.note.create({
      data: { id: "NA", tenant_id: "TA", title: "A的笔记", created_by: "u" },
    });
    await base.note.create({
      data: { id: "NB", tenant_id: "TB", title: "B的笔记", created_by: "u" },
    });
  });

  // --- findMany：不带任何条件，应只看到自己租户的 ---
  await asTenant("TA", async () => {
    const notes = await prisma.note.findMany({});
    check(
      "findMany 未带条件时只返回本租户",
      notes.length === 1 && notes[0]?.id === "NA",
      `拿到 ${notes.map((n) => n.id).join(",") || "空"}`,
    );
  });

  // --- findUnique：按别家主键查，应查不到（关键：unique where 上追加非唯一字段） ---
  await asTenant("TA", async () => {
    try {
      const note = await prisma.note.findUnique({ where: { id: "NB" } });
      check("findUnique 查别家主键返回 null", note === null, `拿到 ${note?.id ?? "null"}`);
    } catch (err) {
      check(
        "findUnique 查别家主键返回 null",
        false,
        `Prisma 拒绝了注入后的 where：${(err as Error).message.split("\n")[0]}`,
      );
    }
  });

  // --- findUnique：查自己的应正常拿到 ---
  await asTenant("TA", async () => {
    const note = await prisma.note.findUnique({ where: { id: "NA" } });
    check("findUnique 查自己的正常返回", note?.id === "NA");
  });

  // --- update：改别家的行应失败（记录未找到），且数据未被改动 ---
  await asTenant("TA", async () => {
    try {
      await prisma.note.update({
        where: { id: "NB" },
        data: { title: "被越权修改" },
      });
      check("update 改别家的行被拒", false, "竟然成功了");
    } catch {
      check("update 改别家的行被拒", true);
    }
  });
  await asTenant(null, async () => {
    const nb = await base.note.findUnique({ where: { id: "NB" } });
    check("越权 update 后别家数据未被改动", nb?.title === "B的笔记", `实际 ${nb?.title}`);
  });

  // --- delete：删别家的行应失败 ---
  await asTenant("TA", async () => {
    try {
      await prisma.note.delete({ where: { id: "NB" } });
      check("delete 删别家的行被拒", false, "竟然成功了");
    } catch {
      check("delete 删别家的行被拒", true);
    }
  });
  await asTenant(null, async () => {
    const nb = await base.note.findUnique({ where: { id: "NB" } });
    check("越权 delete 后别家数据仍在", nb !== null);
  });

  // --- deleteMany：无条件删除只影响自己租户 ---
  await asTenant("TA", async () => {
    await prisma.note.deleteMany({});
  });
  await asTenant(null, async () => {
    const all = await base.note.findMany({});
    check(
      "deleteMany 无条件时只删本租户",
      all.length === 1 && all[0]?.id === "NB",
      `剩下 ${all.map((n) => n.id).join(",") || "空"}`,
    );
  });

  // --- create：自动补 tenant_id ---
  await asTenant("TA", async () => {
    const created = await prisma.note.create({
      data: { title: "自动归属", created_by: "u" } as never,
    });
    check("create 自动补上 tenant_id", created.tenant_id === "TA", `实际 ${created.tenant_id}`);
  });

  // --- create：显式写别家租户应抛 CrossTenantAccessError ---
  await asTenant("TA", async () => {
    try {
      await prisma.note.create({
        data: { tenant_id: "TB", title: "越权写入", created_by: "u" },
      });
      check("create 写别家租户抛错", false, "竟然成功了");
    } catch (err) {
      check("create 写别家租户抛错", err instanceof CrossTenantAccessError);
    }
  });

  // --- 业务代码实际写法：withTenantScope 拼出的 where 用在 update/delete 上 ---
  // user-management / notification 改成了「唯一主键 + 额外标量」的形状，
  // 这里验证 Prisma 确实接受，且跨租户时改不动。
  await asTenant(null, async () => {
    await base.user.deleteMany({ where: { id: { in: ["UA", "UB"] } } });
    await base.user.create({
      data: { id: "UA", tenant_id: "TA", username: "alice", password: "x" },
    });
    await base.user.create({
      data: { id: "UB", tenant_id: "TB", username: "bob", password: "x" },
    });
  });

  await asTenant("TA", async () => {
    const updated = await prisma.user.update({
      where: { id: "UA", tenant_id: "TA" },
      data: { username: "alice2" },
    });
    check("user.update（主键+tenant_id）改自己的成功", updated.username === "alice2");
  });

  await asTenant("TA", async () => {
    try {
      await prisma.user.update({
        where: { id: "UB", tenant_id: "TA" },
        data: { username: "hacked" },
      });
      check("user.update 改别家的被拒", false, "竟然成功了");
    } catch {
      check("user.update 改别家的被拒", true);
    }
  });
  await asTenant(null, async () => {
    const ub = await base.user.findUnique({ where: { id: "UB" } });
    check("越权 user.update 后别家数据未变", ub?.username === "bob", `实际 ${ub?.username}`);
  });

  // Notification：唯一主键 + 两个额外标量（markNotificationRead 的写法）
  await asTenant(null, async () => {
    await base.notification.deleteMany({ where: { id: { in: ["M1"] } } });
    await base.notification.create({
      data: {
        id: "M1",
        tenant_id: "TB",
        user_id: "UB",
        type: "t",
        severity: "info",
        title: "给B的",
        body: "b",
      },
    });
  });
  await asTenant("TA", async () => {
    try {
      await prisma.notification.update({
        where: { id: "M1", tenant_id: "TA", user_id: "UA" },
        data: { read_at: new Date() },
      });
      check("notification.update（主键+2标量）跨租户被拒", false, "竟然成功了");
    } catch {
      check("notification.update（主键+2标量）跨租户被拒", true);
    }
  });
  await asTenant(null, async () => {
    const m = await base.notification.findUnique({ where: { id: "M1" } });
    check("越权 notification.update 后未被标记已读", m?.read_at === null);
    await base.notification.deleteMany({ where: { id: "M1" } });
    await base.user.deleteMany({ where: { id: { in: ["UA", "UB"] } } });
  });

  // --- 复合主键模型 TenantSetting：unique where + 注入的 tenant_id ---
  await asTenant(null, async () => {
    await base.tenantSetting.create({
      data: { tenant_id: "TB", key: "k1", value: { v: 1 } },
    });
  });
  await asTenant("TA", async () => {
    try {
      const found = await prisma.tenantSetting.findUnique({
        where: { tenant_id_key: { tenant_id: "TB", key: "k1" } },
      });
      check("复合主键模型跨租户读被拒", found === null, `拿到 ${JSON.stringify(found)}`);
    } catch (err) {
      const msg = (err as Error).message.split("\n")[0];
      check(
        "复合主键模型跨租户读被拒",
        err instanceof CrossTenantAccessError,
        err instanceof CrossTenantAccessError ? "以 CrossTenantAccessError 拒绝" : msg,
      );
    }
  });

  // --- 平台上下文（tenant_id 为 null）应能跨租户读取 ---
  await asTenant(null, async () => {
    const all = await prisma.note.findMany({});
    check("平台上下文可跨租户读取", all.length >= 2, `拿到 ${all.length} 条`);
  });

  // --- 清理 ---
  await asTenant(null, async () => {
    const ids = ["TA", "TB"];
    await base.tenantSetting.deleteMany({ where: { tenant_id: { in: ids } } });
    await base.note.deleteMany({ where: { tenant_id: { in: ids } } });
    await base.user.deleteMany({ where: { tenant_id: { in: ids } } });
    await base.tenant.deleteMany({ where: { id: { in: ids } } });
  });

  console.log(results.join("\n"));
  const failed = results.filter((r) => r.startsWith("FAIL"));
  console.log(`\n${results.length - failed.length}/${results.length} 通过`);
  await base.$disconnect();
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error(err);
  await base.$disconnect();
  process.exit(1);
});
