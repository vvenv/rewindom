/* eslint-disable no-console */
/**
 * 把 Yestino 品牌标（两条来源汇成一条时间线的 Y）写入指定租户的官网
 * logo / favicon / og:image / apple-touch / maskable，以及字标字体与全大写。
 * 资产真源见 `scripts/yestino-brand/README.md`。
 *
 * 主题字段写 `theme_settings` 两列。页头字标全大写只改 chrome_brand 块的
 * `text_case`，线上与草稿各写一份，**不**走 `publishSiteDraft`，避免把未发布的
 * 其它页头页脚改动一并推上线。
 *
 * 用法:
 *   pnpm --filter server exec tsx scripts/apply-yestino-brand.ts --dry-run --slug yestino
 *   pnpm --filter server exec tsx scripts/apply-yestino-brand.ts --slug yestino
 *   pnpm --filter server exec tsx scripts/apply-yestino-brand.ts --slug yestino --no-primary
 *   pnpm --filter server exec tsx scripts/apply-yestino-brand.ts --slug yestino --favicon-svg
 *   pnpm --filter server exec tsx scripts/apply-yestino-brand.ts --slug yestino --favicon-png
 *   pnpm --filter server exec tsx scripts/apply-yestino-brand.ts --slug yestino --og-only
 */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  updateSiteAssetAlt,
  uploadSiteAsset,
} from "@rewindom/builtin/marketing/server/site-asset.service.js";
import { resolveThemeSettings } from "@rewindom/builtin/marketing/shared/theme-sections.js";
import { type Prisma } from "@rewindom/server-kernel/generated/prisma/client/client.js";
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { sanitizeSvg } from "@rewindom/server-kernel/lib/svg-sanitize.js";

const BRAND_DIR = dirname(fileURLToPath(import.meta.url));
const ASSET_DIR = join(BRAND_DIR, "yestino-brand");
const PRIMARY_COLOR = "#4F46E5";
const BRAND_FONT_FAMILY = "newsreader";

interface Args {
  dryRun: boolean;
  slug: string;
  setPrimary: boolean;
  /** 不重新上传，只把 favicon 指到现有的 SVG logo。 */
  faviconSvg: boolean;
  /**
   * 只换 favicon：传 512 PNG 并指过去。给 SVG favicon 支持不佳的浏览器兜底，
   * logo 仍然用 SVG（页头是矢量场景）。
   */
  faviconPng: boolean;
  /** 只换 OG 图，不动 logo / favicon / 主色。 */
  ogOnly: boolean;
}

function parseArgs(argv: string[]): Args {
  let dryRun = false;
  let setPrimary = true;
  let faviconSvg = false;
  let faviconPng = false;
  let ogOnly = false;
  let slug = "yestino";
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (token === "--no-primary") {
      setPrimary = false;
      continue;
    }
    if (token === "--favicon-svg") {
      faviconSvg = true;
      continue;
    }
    if (token === "--favicon-png") {
      faviconPng = true;
      continue;
    }
    if (token === "--og-only") {
      ogOnly = true;
      continue;
    }
    if (token === "--slug" && i + 1 < argv.length) {
      slug = (argv[i + 1] ?? "").trim();
      i += 1;
    }
  }
  if (!slug) {
    throw new Error("需要 --slug <tenant-slug>");
  }
  return { dryRun, slug, setPrimary, faviconSvg, faviconPng, ogOnly };
}

async function readAsset(
  name: string,
  mime_type: string,
): Promise<{ buffer: Buffer; mime_type: string }> {
  const buffer = await readFile(join(ASSET_DIR, name));
  if (buffer.byteLength === 0) {
    throw new Error(`空文件: ${name}`);
  }
  if (mime_type === "image/svg+xml") {
    const clean = sanitizeSvg(buffer.toString("utf8"));
    if (!clean || !clean.includes("linearGradient")) {
      throw new Error(`SVG 消毒后丢失渐变: ${name}`);
    }
    return { buffer: Buffer.from(clean, "utf8"), mime_type };
  }
  return { buffer, mime_type };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 只改 chrome_brand 的 `text_case`，其它块原样留下。
 * 全大写是排版处理，不改 `brand_text` 存的值。
 */
function withUppercaseBrand(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withUppercaseBrand);
  if (!isPlainObject(value)) return value;
  const next: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    next[key] = withUppercaseBrand(child);
  }
  if (value.type === "chrome_brand") {
    const settings = isPlainObject(next.settings) ? next.settings : {};
    next.settings = { ...settings, text_case: "upper" };
  }
  return next;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const tenant = await prisma.tenant.findUnique({
    where: { slug: args.slug },
    select: { id: true, slug: true, name: true, custom_domain: true },
  });
  if (!tenant) {
    throw new Error(`租户不存在: ${args.slug}`);
  }

  const site = await prisma.marketingSite.findUnique({
    where: { tenant_id: tenant.id },
    select: {
      site_name: true,
      theme_settings: true,
      theme_settings_draft: true,
      nav_json: true,
      footer_json: true,
      nav_draft_json: true,
      footer_draft_json: true,
    },
  });
  if (!site) {
    throw new Error(`租户 ${args.slug} 没有官网`);
  }

  const live = resolveThemeSettings(site.theme_settings);
  const draft = resolveThemeSettings(site.theme_settings_draft);

  if (args.faviconSvg) {
    const logoUrl = live.logo_url ?? draft.logo_url;
    if (!logoUrl || !logoUrl.endsWith(".svg")) {
      throw new Error("当前 logo 不是 SVG，无法把 favicon 指过去");
    }
    console.log(
      `[apply-yestino-brand] tenant=${tenant.slug} favicon ${live.favicon_url ?? ""} → ${logoUrl}`,
    );
    if (args.dryRun) {
      console.log("[apply-yestino-brand] dry-run, no writes");
      return;
    }
    await prisma.marketingSite.update({
      where: { tenant_id: tenant.id },
      data: {
        theme_settings: { ...live, favicon_url: logoUrl } as Prisma.InputJsonValue,
        theme_settings_draft: {
          ...draft,
          favicon_url: logoUrl,
        } as Prisma.InputJsonValue,
      },
    });
    console.log("[apply-yestino-brand] favicon now uses the SVG mark");
    return;
  }

  if (args.faviconPng) {
    const favicon = await readAsset("favicon-512.png", "image/png");
    console.log(
      `[apply-yestino-brand] tenant=${tenant.slug} favicon ${live.favicon_url ?? ""} ← ${favicon.buffer.byteLength}B png`,
    );
    if (args.dryRun) {
      console.log("[apply-yestino-brand] dry-run, no writes");
      return;
    }
    const faviconAsset = await uploadSiteAsset({
      tenant_id: tenant.id,
      tenant_slug: tenant.slug,
      buffer: favicon.buffer,
      mime_type: favicon.mime_type,
    });
    await updateSiteAssetAlt(tenant.id, tenant.slug, faviconAsset.id, "Yestino");
    await prisma.marketingSite.update({
      where: { tenant_id: tenant.id },
      data: {
        theme_settings: {
          ...live,
          favicon_url: faviconAsset.url,
        } as Prisma.InputJsonValue,
        theme_settings_draft: {
          ...draft,
          favicon_url: faviconAsset.url,
        } as Prisma.InputJsonValue,
      },
    });
    console.log(`[apply-yestino-brand] wrote favicon=${faviconAsset.url}`);
    return;
  }

  if (args.ogOnly) {
    const og = await readAsset("og.png", "image/png");
    console.log(
      `[apply-yestino-brand] tenant=${tenant.slug} og ${live.og_image ?? ""} ← ${og.buffer.byteLength}B`,
    );
    if (args.dryRun) {
      console.log("[apply-yestino-brand] dry-run, no writes");
      return;
    }
    const ogAsset = await uploadSiteAsset({
      tenant_id: tenant.id,
      tenant_slug: tenant.slug,
      buffer: og.buffer,
      mime_type: og.mime_type,
    });
    await updateSiteAssetAlt(tenant.id, tenant.slug, ogAsset.id, "Yestino");
    await prisma.marketingSite.update({
      where: { tenant_id: tenant.id },
      data: {
        theme_settings: {
          ...live,
          og_image: ogAsset.url,
        } as Prisma.InputJsonValue,
        theme_settings_draft: {
          ...draft,
          og_image: ogAsset.url,
        } as Prisma.InputJsonValue,
      },
    });
    console.log(`[apply-yestino-brand] wrote og=${ogAsset.url}`);
    return;
  }

  const mark = await readAsset("mark.svg", "image/svg+xml");
  const og = await readAsset("og.png", "image/png");
  const appleTouch = await readAsset("apple-touch-icon.png", "image/png");
  const maskable = await readAsset("maskable-512.png", "image/png");

  console.log(
    `[apply-yestino-brand] tenant=${tenant.slug} domain=${tenant.custom_domain ?? ""}`,
  );
  console.log(
    `[apply-yestino-brand] current logo=${live.logo_url ?? ""} favicon=${live.favicon_url ?? ""} og=${live.og_image ?? ""} apple=${live.apple_touch_icon_url ?? ""} maskable=${live.maskable_icon_url ?? ""} font=${live.brand_font_family ?? "(body)"} primary=${live.primary_color ?? ""}`,
  );
  console.log(
    `[apply-yestino-brand] files mark=${mark.buffer.byteLength}B favicon=svg og=${og.buffer.byteLength}B apple=${appleTouch.buffer.byteLength}B maskable=${maskable.buffer.byteLength}B brand_font=${BRAND_FONT_FAMILY} text_case=upper primary=${args.setPrimary ? PRIMARY_COLOR : "(keep)"}`,
  );

  if (args.dryRun) {
    console.log("[apply-yestino-brand] dry-run, no writes");
    return;
  }

  const logoAsset = await uploadSiteAsset({
    tenant_id: tenant.id,
    tenant_slug: tenant.slug,
    buffer: mark.buffer,
    mime_type: mark.mime_type,
  });
  await updateSiteAssetAlt(tenant.id, tenant.slug, logoAsset.id, "Yestino");

  const ogAsset = await uploadSiteAsset({
    tenant_id: tenant.id,
    tenant_slug: tenant.slug,
    buffer: og.buffer,
    mime_type: og.mime_type,
  });
  await updateSiteAssetAlt(tenant.id, tenant.slug, ogAsset.id, "Yestino");

  const appleAsset = await uploadSiteAsset({
    tenant_id: tenant.id,
    tenant_slug: tenant.slug,
    buffer: appleTouch.buffer,
    mime_type: appleTouch.mime_type,
  });
  await updateSiteAssetAlt(tenant.id, tenant.slug, appleAsset.id, "Yestino");

  const maskableAsset = await uploadSiteAsset({
    tenant_id: tenant.id,
    tenant_slug: tenant.slug,
    buffer: maskable.buffer,
    mime_type: maskable.mime_type,
  });
  await updateSiteAssetAlt(tenant.id, tenant.slug, maskableAsset.id, "Yestino");

  const patch = {
    logo_url: logoAsset.url,
    favicon_url: logoAsset.url,
    og_image: ogAsset.url,
    apple_touch_icon_url: appleAsset.url,
    maskable_icon_url: maskableAsset.url,
    brand_font_family: BRAND_FONT_FAMILY,
    ...(args.setPrimary ? { primary_color: PRIMARY_COLOR } : {}),
  };
  const nextLive = { ...live, ...patch };
  const nextDraft = { ...draft, ...patch };

  await prisma.marketingSite.update({
    where: { tenant_id: tenant.id },
    data: {
      theme_settings: nextLive as Prisma.InputJsonValue,
      theme_settings_draft: nextDraft as Prisma.InputJsonValue,
      nav_json: withUppercaseBrand(site.nav_json) as Prisma.InputJsonValue,
      footer_json: withUppercaseBrand(site.footer_json) as Prisma.InputJsonValue,
      nav_draft_json: withUppercaseBrand(
        site.nav_draft_json,
      ) as Prisma.InputJsonValue,
      footer_draft_json: withUppercaseBrand(
        site.footer_draft_json,
      ) as Prisma.InputJsonValue,
    },
  });

  console.log(
    `[apply-yestino-brand] wrote logo=${logoAsset.url} favicon=${logoAsset.url} og=${ogAsset.url} apple=${appleAsset.url} maskable=${maskableAsset.url} brand_font=${BRAND_FONT_FAMILY} text_case=upper`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
