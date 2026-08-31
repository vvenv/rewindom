/**
 * 给指定站点铺一批无用之物，并开通 useless 模块。
 *
 * 幂等：可交互物按标题查重。HTML 有 diff 会同步。
 * 目录里已经拿掉的（句子、靠字成立的 embed）会从库里删掉。
 * 缺缩略图、还是 JPEG、或 HTML 变了就再截一张，写入媒体库。
 * `USELESS_RECAPTURE_THUMBS=1` 则不论现有图是什么格式都重截。
 */
import { initializeTenantSite } from "@rewindom/builtin/marketing/server/site-init.service.js";
import {
  applyHomeLayout,
  publishEditorDraft,
} from "@rewindom/builtin/marketing/server/site.service.js";
import { HOME_PAGE_KIND } from "@rewindom/builtin/marketing/shared/page-templates.js";
import { normalizeLocale, prisma, withTenantScope } from "@rewindom/module-sdk/server";

import { slugifyThing } from "../shared/slug.js";
import {
  USELESS_HOME_LAYOUT_KEY,
  USELESS_THING_PAGE_KIND,
} from "../shared/useless-page-templates.js";
import { captureEmbedThumbnails } from "./capture-thumbnail.js";
import { saveThingThumbnail } from "./save-thumbnail.js";
import { registerUselessSiteContributions } from "./sections/register.js";
import { SEED_EMBEDS } from "./seed-embeds.js";
import { createThing, updateThing } from "./thing.service.js";

const TENANT_MODULES_KEY = "tenant_modules";

export interface SeedUselessResult {
  enabled_module: boolean;
  created: number;
  updated: number;
  skipped: number;
  deleted: number;
  thumbnails: number;
}

async function pruneRemoved(
  tenantId: string,
  keepTitles: Set<string>,
): Promise<number> {
  const texts = await prisma.thing.findMany({
    where: withTenantScope(tenantId, { kind: "text" }),
    select: { id: true },
  });
  const stale = await prisma.thing.findMany({
    where: withTenantScope(tenantId, {
      kind: "embed",
      NOT: { title: { in: [...keepTitles] } },
    }),
    select: { id: true },
  });
  const ids = [...texts, ...stale].map((row) => row.id);
  if (ids.length === 0) return 0;
  const deleted = await prisma.thing.deleteMany({
    where: withTenantScope(tenantId, { id: { in: ids } }),
  });
  return deleted.count;
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

  // 开通后把详情模板快照进库，并把首页套成目录版式。tsx 直跑没有 onBoot，必须先登记。
  registerUselessSiteContributions();
  const site = await prisma.marketingSite.findFirst({
    where: withTenantScope(tenantId),
  });
  if (site) {
    await initializeTenantSite(tenantId, normalizeLocale(site.default_locale), {
      only_kinds: [USELESS_THING_PAGE_KIND],
    });
    await applyHomeLayout(tenantId, USELESS_HOME_LAYOUT_KEY);
    const homes = await prisma.marketingPage.findMany({
      where: withTenantScope(tenantId, { kind: HOME_PAGE_KIND }),
      select: { id: true },
    });
    for (const home of homes) {
      await publishEditorDraft(tenantId, home.id, userId);
    }
    const stalePages = await prisma.marketingPage.findMany({
      where: withTenantScope(tenantId, { kind: "useless_index" }),
      select: { id: true },
    });
    if (stalePages.length) {
      const ids = stalePages.map((page) => page.id);
      await prisma.marketingPageVersion.deleteMany({
        where: withTenantScope(tenantId, { page_id: { in: ids } }),
      });
      await prisma.marketingPage.deleteMany({
        where: withTenantScope(tenantId, { id: { in: ids } }),
      });
    }
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { slug: true },
  });
  const tenantSlug = tenant?.slug ?? "";

  const keepTitles = new Set(SEED_EMBEDS.map((embed) => embed.title));
  const deleted = await pruneRemoved(tenantId, keepTitles);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const needThumb: {
    id: string;
    title: string;
    html: string;
    url: string;
  }[] = [];

  for (const embed of SEED_EMBEDS) {
    const slug = slugifyThing(embed.title);
    const existing = await prisma.thing.findFirst({
      where: withTenantScope(tenantId, { kind: "embed", title: embed.title }),
      select: {
        id: true,
        html: true,
        enabled: true,
        slug: true,
        thumbnail: true,
      },
    });
    if (existing) {
      const htmlChanged = existing.html !== embed.html;
      const patch: { html?: string; enabled?: boolean; slug?: string } = {};
      if (htmlChanged) patch.html = embed.html;
      if (!existing.enabled) patch.enabled = true;
      if (!existing.slug && slug) patch.slug = slug;
      if (Object.keys(patch).length) {
        await updateThing({
          tenant_id: tenantId,
          user_id: userId,
          thing_id: existing.id,
          ...patch,
        });
        updated += 1;
      } else {
        skipped += 1;
      }
      const staleJpeg = /\.jpe?g(\?|#|$)/i.test(existing.thumbnail);
      const recapture =
        process.env.USELESS_RECAPTURE_THUMBS === "1";
      if (htmlChanged || !existing.thumbnail || staleJpeg || recapture) {
        needThumb.push({
          id: existing.id,
          title: embed.title,
          html: embed.html,
          url: existing.thumbnail,
        });
      }
      continue;
    }
    const createdThing = await createThing({
      tenant_id: tenantId,
      user_id: userId,
      kind: "embed",
      title: embed.title,
      slug,
      html: embed.html,
      enabled: true,
    });
    created += 1;
    needThumb.push({
      id: createdThing.id,
      title: embed.title,
      html: embed.html,
      url: createdThing.thumbnail,
    });
  }

  let thumbnails = 0;
  if (needThumb.length && tenantSlug) {
    const shots = await captureEmbedThumbnails(
      needThumb.map((item) => ({ title: item.title, html: item.html })),
    );
    for (const item of needThumb) {
      const png = shots.get(item.title);
      if (!png) continue;
      const url = await saveThingThumbnail({
        tenant_id: tenantId,
        tenant_slug: tenantSlug,
        png,
        existing_url: item.url,
      });
      await updateThing({
        tenant_id: tenantId,
        user_id: userId,
        thing_id: item.id,
        thumbnail: url,
      });
      thumbnails += 1;
    }
  }

  return {
    enabled_module,
    created,
    updated,
    skipped,
    deleted,
    thumbnails,
  };
}
