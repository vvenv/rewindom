/* eslint-disable no-console */
/**
 * 把 Rewindom 品牌标（玉玦本身，不套圆角色块）写入指定租户的官网
 * logo / favicon / og:image / apple-touch / maskable，以及字标字体。
 * 资产真源见 `scripts/rewindom-brand/README.md`。
 *
 * 主题字段写 `theme_settings` 两列。产品名保持混排，**不**改 chrome_brand
 * 的 `text_case`。不走 `publishSiteDraft`，避免把未发布的其它页头页脚改动一并推上线。
 *
 * 用法:
 *   pnpm --filter server exec tsx scripts/apply-rewindom-brand.ts --dry-run --slug rewindom
 *   pnpm --filter server exec tsx scripts/apply-rewindom-brand.ts --slug rewindom
 *   pnpm --filter server exec tsx scripts/apply-rewindom-brand.ts --slug rewindom --no-primary
 *   pnpm --filter server exec tsx scripts/apply-rewindom-brand.ts --slug rewindom --favicon-svg
 *   pnpm --filter server exec tsx scripts/apply-rewindom-brand.ts --slug rewindom --favicon-png
 *   pnpm --filter server exec tsx scripts/apply-rewindom-brand.ts --slug rewindom --og-only
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
import { DEFAULT_TENANT_SLUG } from "@rewindom/shared";

const BRAND_DIR = dirname(fileURLToPath(import.meta.url));
const ASSET_DIR = join(BRAND_DIR, "rewindom-brand");
const PRIMARY_COLOR = "#0369a1";
const BRAND_FONT_FAMILY = "inter";
const BRAND_ALT = "Rewindom";

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
  let slug = DEFAULT_TENANT_SLUG;
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
    if (!clean || !clean.includes("M87.54 27.86")) {
      throw new Error(`SVG 消毒后丢失玉玦 path: ${name}`);
    }
    return { buffer: Buffer.from(clean, "utf8"), mime_type };
  }
  return { buffer, mime_type };
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
      `[apply-rewindom-brand] tenant=${tenant.slug} favicon ${live.favicon_url ?? ""} → ${logoUrl}`,
    );
    if (args.dryRun) {
      console.log("[apply-rewindom-brand] dry-run, no writes");
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
    console.log("[apply-rewindom-brand] favicon now uses the SVG mark");
    return;
  }

  if (args.faviconPng) {
    const favicon = await readAsset("favicon-512.png", "image/png");
    console.log(
      `[apply-rewindom-brand] tenant=${tenant.slug} favicon ${live.favicon_url ?? ""} ← ${favicon.buffer.byteLength}B png`,
    );
    if (args.dryRun) {
      console.log("[apply-rewindom-brand] dry-run, no writes");
      return;
    }
    const faviconAsset = await uploadSiteAsset({
      tenant_id: tenant.id,
      tenant_slug: tenant.slug,
      buffer: favicon.buffer,
      mime_type: favicon.mime_type,
    });
    await updateSiteAssetAlt(tenant.id, tenant.slug, faviconAsset.id, BRAND_ALT);
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
    console.log(`[apply-rewindom-brand] wrote favicon=${faviconAsset.url}`);
    return;
  }

  if (args.ogOnly) {
    const og = await readAsset("og.png", "image/png");
    console.log(
      `[apply-rewindom-brand] tenant=${tenant.slug} og ${live.og_image ?? ""} ← ${og.buffer.byteLength}B`,
    );
    if (args.dryRun) {
      console.log("[apply-rewindom-brand] dry-run, no writes");
      return;
    }
    const ogAsset = await uploadSiteAsset({
      tenant_id: tenant.id,
      tenant_slug: tenant.slug,
      buffer: og.buffer,
      mime_type: og.mime_type,
    });
    await updateSiteAssetAlt(tenant.id, tenant.slug, ogAsset.id, BRAND_ALT);
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
    console.log(`[apply-rewindom-brand] wrote og=${ogAsset.url}`);
    return;
  }

  const mark = await readAsset("mark.svg", "image/svg+xml");
  const og = await readAsset("og.png", "image/png");
  const appleTouch = await readAsset("apple-touch-icon.png", "image/png");
  const maskable = await readAsset("maskable-512.png", "image/png");

  console.log(
    `[apply-rewindom-brand] tenant=${tenant.slug} domain=${tenant.custom_domain ?? ""}`,
  );
  console.log(
    `[apply-rewindom-brand] current logo=${live.logo_url ?? ""} favicon=${live.favicon_url ?? ""} og=${live.og_image ?? ""} apple=${live.apple_touch_icon_url ?? ""} maskable=${live.maskable_icon_url ?? ""} font=${live.brand_font_family ?? "(body)"} primary=${live.primary_color ?? ""}`,
  );
  console.log(
    `[apply-rewindom-brand] files mark=${mark.buffer.byteLength}B favicon=svg og=${og.buffer.byteLength}B apple=${appleTouch.buffer.byteLength}B maskable=${maskable.buffer.byteLength}B brand_font=${BRAND_FONT_FAMILY} primary=${args.setPrimary ? PRIMARY_COLOR : "(keep)"}`,
  );

  if (args.dryRun) {
    console.log("[apply-rewindom-brand] dry-run, no writes");
    return;
  }

  const logoAsset = await uploadSiteAsset({
    tenant_id: tenant.id,
    tenant_slug: tenant.slug,
    buffer: mark.buffer,
    mime_type: mark.mime_type,
  });
  await updateSiteAssetAlt(tenant.id, tenant.slug, logoAsset.id, BRAND_ALT);

  const ogAsset = await uploadSiteAsset({
    tenant_id: tenant.id,
    tenant_slug: tenant.slug,
    buffer: og.buffer,
    mime_type: og.mime_type,
  });
  await updateSiteAssetAlt(tenant.id, tenant.slug, ogAsset.id, BRAND_ALT);

  const appleAsset = await uploadSiteAsset({
    tenant_id: tenant.id,
    tenant_slug: tenant.slug,
    buffer: appleTouch.buffer,
    mime_type: appleTouch.mime_type,
  });
  await updateSiteAssetAlt(tenant.id, tenant.slug, appleAsset.id, BRAND_ALT);

  const maskableAsset = await uploadSiteAsset({
    tenant_id: tenant.id,
    tenant_slug: tenant.slug,
    buffer: maskable.buffer,
    mime_type: maskable.mime_type,
  });
  await updateSiteAssetAlt(tenant.id, tenant.slug, maskableAsset.id, BRAND_ALT);

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
    },
  });

  console.log(
    `[apply-rewindom-brand] wrote logo=${logoAsset.url} favicon=${logoAsset.url} og=${ogAsset.url} apple=${appleAsset.url} maskable=${maskableAsset.url} brand_font=${BRAND_FONT_FAMILY}`,
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
