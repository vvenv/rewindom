/**
 * 给指定站点铺一批无用句子，并开通 useless 模块。
 *
 * 幂等：句子按正文查重，可交互物按标题查重。
 * 可交互物的 HTML **会同步**：皮肤和手感改了，再跑一遍就把已入库的换上。
 * 句子仍不覆盖——那是站点后来可能改过的话。
 */
import { prisma, withTenantScope } from "@rewindom/module-sdk/server";

import { SEED_EMBEDS } from "./seed-embeds.js";
import { createThing } from "./thing.service.js";
import { localDateKey, parseDateKey } from "./thing.util.js";

const TENANT_MODULES_KEY = "tenant_modules";

/**
 * 只陈述，不给道理——句子在事实处停住就是「无用」的全部要求。
 * 想改口径直接改这个数组，重跑 seed 只会补新增的。
 */
const LINES: string[] = [
  "写过的代码，大部分已经不在运行了。",
  "一个标签页被关掉的时候，它占的内存立刻被回收，没有任何提示。",
  "刚才读这句话，用了大约两秒。",
  "电脑里有个文件夹叫「新建文件夹」，不敢删。",
  "地铁报站的那个声音，听了十年，不知道她叫什么。",
  "有一根头发卡在键盘缝里，已经很久了。",
  "再也不会打开的软件，正在后台等更新。",
  "打印机没人用的时候，偶尔会自己响一声。",
  /*
   * 下面这些够得着大的东西，但一律**停在事实上**——再多走一步就是鸡汤。
   * 判断标准很简单：如果一句话在告诉你该怎么感受，它就不该留在这里。
   */
  "身上大部分原子来自某颗爆炸过的恒星。它们不认识你。",
  "出生那天的报纸头条是什么，没有人记得了，包括当时读它的人。",
  "宇宙微波背景辐射此刻正落在你的皮肤上。你没有感觉。",
  "这辈子见过的人里，有一些已经见过最后一面了。当时不知道。",
  "说过的话，绝大部分没有留下任何记录。",
  "昨天做的梦，今天已经想不起来了。",
];

export interface SeedUselessResult {
  enabled_module: boolean;
  created: number;
  updated: number;
  skipped: number;
  backfilled: number;
}

/**
 * 往回补几天，让「回看」上线当天就有东西可翻。
 *
 * 实站上历史是随日子过去自然长出来的（只有今天会绑），本地要演示就得先造一段。
 * 已经绑过的日子不动。
 */
async function backfillDays(
  tenantId: string,
  days: number,
  now: Date,
): Promise<number> {
  let filled = 0;
  for (let i = 1; i <= days; i += 1) {
    const key = localDateKey(new Date(now.getTime() - i * 86_400_000));
    const published_on = parseDateKey(key);
    if (!published_on) continue;

    const taken = await prisma.thing.findFirst({
      where: withTenantScope(tenantId, { published_on }),
      select: { id: true },
    });
    if (taken) continue;

    const free = await prisma.thing.findFirst({
      where: withTenantScope(tenantId, { enabled: true, published_on: null }),
      orderBy: { created_at: "asc" },
      select: { id: true },
    });
    if (!free) break;

    await prisma.thing.update({
      where: withTenantScope(tenantId, { id: free.id }),
      data: { published_on },
    });
    filled += 1;
  }
  return filled;
}

async function enableUselessModule(tenantId: string): Promise<boolean> {
  const row = await prisma.tenantSetting.findUnique({
    where: { tenant_id_key: { tenant_id: tenantId, key: TENANT_MODULES_KEY } },
  });
  const current =
    row?.value && typeof row.value === "object" && !Array.isArray(row.value)
      ? { ...(row.value as Record<string, unknown>) }
      : {};
  if (current.useless === true) return false;
  const value = { ...current, useless: true };
  await prisma.tenantSetting.upsert({
    where: { tenant_id_key: { tenant_id: tenantId, key: TENANT_MODULES_KEY } },
    create: {
      tenant_id: tenantId,
      key: TENANT_MODULES_KEY,
      value,
      secret: null,
    },
    update: { value },
  });
  return true;
}

export async function seedUselessDemo(
  tenantId: string,
  userId: string,
): Promise<SeedUselessResult> {
  const enabled_module = await enableUselessModule(tenantId);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const embed of SEED_EMBEDS) {
    const existing = await prisma.thing.findFirst({
      where: withTenantScope(tenantId, { kind: "embed", title: embed.title }),
      select: { id: true, html: true },
    });
    if (existing) {
      if (existing.html !== embed.html) {
        await prisma.thing.update({
          where: withTenantScope(tenantId, { id: existing.id }),
          data: { html: embed.html },
        });
        updated += 1;
      } else {
        skipped += 1;
      }
      continue;
    }
    await createThing({
      tenant_id: tenantId,
      user_id: userId,
      kind: "embed",
      title: embed.title,
      html: embed.html,
      enabled: true,
    });
    created += 1;
  }

  for (const text of LINES) {
    const existing = await prisma.thing.findFirst({
      where: withTenantScope(tenantId, { kind: "text", text }),
      select: { id: true },
    });
    if (existing) {
      skipped += 1;
      continue;
    }
    await createThing({
      tenant_id: tenantId,
      user_id: userId,
      kind: "text",
      text,
      enabled: true,
    });
    created += 1;
  }

  const backfilled = await backfillDays(tenantId, 10, new Date());

  return { enabled_module, created, updated, skipped, backfilled };
}
