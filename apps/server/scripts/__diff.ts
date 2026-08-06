import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { DEFAULT_TENANT_ID } from "@be-water/shared";

const PAGE = "f54348f3-7157-49e7-8fe5-ff7438e9c36c";
const p = await prisma.marketingPage.findFirst({ where: { id: PAGE } });
const s = await prisma.marketingSite.findFirst({ where: { tenant_id: DEFAULT_TENANT_ID } });
if (!p) { console.warn("页面不存在"); } else {
  console.warn("page tenant:", p.tenant_id, "| 是否默认租户:", p.tenant_id === DEFAULT_TENANT_ID);
  console.warn("status:", p.status, "| slug:", p.slug, "| locale:", p.locale);
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  console.warn("正文 draft==live ?", same(p.sections_draft, p.sections));
  console.warn("标题 draft==live ?", same(p.title_draft, p.title));
  console.warn("settings draft==live ?", same(p.settings_draft, p.settings));
  console.warn("页头 draft==live ?", same(s?.nav_draft_json, s?.nav_json));
  console.warn("页脚 draft==live ?", same(s?.footer_draft_json, s?.footer_json));
}
await prisma.$disconnect();
