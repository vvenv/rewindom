/**
 * 给指定站点铺一批无用句子，并开通 useless 模块。
 *
 * 幂等：正文已存在的跳过，不覆盖站点后来的编辑。
 */
import { prisma, withTenantScope } from "@rewindom/module-sdk/server";

import { createThing } from "./thing.service.js";

const TENANT_MODULES_KEY = "tenant_modules";

/**
 * 只陈述，不给道理——句子在事实处停住就是「无用」的全部要求。
 * 想改口径直接改这个数组，重跑 seed 只会补新增的。
 */
const LINES = [
  "电梯里的关门按钮，很多根本没有接线。人还是会按。",
  "一张纸对折七次以后就折不动了。",
  "你写过的代码，大部分已经不在运行了。",
  "一个标签页被关掉的时候，它占的内存立刻被回收，没有任何提示。",
  "今天全世界大约有四千万人过生日。这个数字不需要你做什么。",
  "老二学说话的时候，老大在旁边玩手机。这两件事同时发生。",
  "雨落在空院子里，也是湿的。",
  "你刚才读这句话，用了大约两秒。",
  "这个网站没装统计代码。有多少人来过，我也不知道。",
  "你电脑里有个文件夹叫「新建文件夹」，你不敢删。",
  "宜家的铅笔，你拿回家过。",
  "地铁报站的那个声音，你听了十年，不知道她叫什么。",
  "有一根头发卡在你键盘缝里，已经很久了。",
  "某个你再也不会打开的软件，正在后台等更新。",
  "你昨天走了多少步，手机知道，你不知道。",
  "打印机没人用的时候，偶尔会自己响一声。",
  "你手机相册里有一张拍糊的照片，你一直没删。",
  "你家路由器的指示灯，昨晚也一直在闪。",
];

export interface SeedUselessResult {
  enabled_module: boolean;
  created: number;
  skipped: number;
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
  let skipped = 0;

  for (const text of LINES) {
    const existing = await prisma.thing.findFirst({
      where: withTenantScope(tenantId, { text }),
      select: { id: true },
    });
    if (existing) {
      skipped += 1;
      continue;
    }
    await createThing({
      tenant_id: tenantId,
      user_id: userId,
      text,
      enabled: true,
    });
    created += 1;
  }

  return { enabled_module, created, skipped };
}
