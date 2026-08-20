/* eslint-disable no-console */
/**
 * 把一个租户的内容复制成另一个租户（新 UUID，重写官网资源 URL）。
 *
 * 复制：站点 / 文档 / 事件 / 笔记书签待办 / 店面目录与运费 / 会员套餐 /
 * 工作台用户与角色 / 租户设置。不复制：会话、OAuth、支付订购、通知、审计、
 * API Key、表单提交。
 *
 * 用法:
 *   pnpm --filter server exec tsx scripts/clone-tenant.ts --dry-run \
 *     --from default --to yestino --name yestino --domain yestino.com
 *   pnpm --filter server exec tsx scripts/clone-tenant.ts \
 *     --from default --to yestino --name yestino --domain yestino.com
 *   pnpm --filter server exec tsx scripts/clone-tenant.ts --force ...
 */
import { randomUUID } from "node:crypto";
import { extname } from "node:path";

import {
  buildSiteAssetStorageKey,
  publicSiteAssetUrl,
} from "@rewindom/builtin/marketing/server/site-asset.service.js";
import { ensureTenantImpersonationUser } from "@rewindom/builtin/platform/server/services/ensure-tenant-impersonation-user.service.js";
import { Prisma } from "@rewindom/server-kernel/generated/prisma/client/client.js";
import { getFileStorageProvider } from "@rewindom/server-kernel/infra/file-storage/index.js";
import {
  invalidateHostTenantCache,
  normalizeCustomDomain,
} from "@rewindom/server-kernel/lib/host-tenant.js";
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import {
  PLATFORM_ADMIN_USER_ID,
  TENANT_IMPERSONATION_USERNAME,
} from "@rewindom/shared";

type InputJson = Prisma.InputJsonValue | typeof Prisma.JsonNull;

function toInputJson(value: unknown): InputJson {
  if (value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

interface Args {
  dryRun: boolean;
  force: boolean;
  fromSlug: string;
  toSlug: string;
  name: string;
  domain: string | null;
}

const BATCH = 200;

function parseArgs(argv: string[]): Args {
  const raw = new Map<string, string>();
  let dryRun = false;
  let force = false;
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (token === "--force") {
      force = true;
      continue;
    }
    if (token.startsWith("--") && i + 1 < argv.length) {
      raw.set(token.slice(2), argv[i + 1] ?? "");
      i += 1;
    }
  }
  const fromSlug = (raw.get("from") ?? "rewindom").trim();
  const toSlug = (raw.get("to") ?? "").trim();
  const name = (raw.get("name") ?? toSlug).trim();
  const domainRaw = raw.get("domain")?.trim() ?? "";
  if (!fromSlug || !toSlug || !name) {
    throw new Error("需要 --from <slug> --to <slug> --name <名称>");
  }
  return {
    dryRun,
    force,
    fromSlug,
    toSlug,
    name,
    domain: domainRaw ? normalizeCustomDomain(domainRaw) : null,
  };
}

function newId(): string {
  return randomUUID();
}

function mapId(ids: Map<string, string>, oldId: string): string {
  const existing = ids.get(oldId);
  if (existing) return existing;
  const id = newId();
  ids.set(oldId, id);
  return id;
}

function mappedOr(
  ids: Map<string, string>,
  oldId: string | null | undefined,
  fallback: string | null = null,
): string | null {
  if (!oldId) return fallback;
  return ids.get(oldId) ?? fallback;
}

function rewriteJson(
  value: unknown,
  replacements: Array<[string, string]>,
): unknown {
  if (typeof value === "string") {
    let out = value;
    for (const [from, to] of replacements) {
      if (from && out.includes(from)) out = out.split(from).join(to);
    }
    return out;
  }
  if (Array.isArray(value)) {
    return value.map((item) => rewriteJson(item, replacements));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = rewriteJson(item, replacements);
    }
    return out;
  }
  return value;
}

async function readStorageBuffer(storageKey: string): Promise<Buffer | null> {
  const object = await getFileStorageProvider().open(storageKey);
  if (!object) return null;
  const chunks: Buffer[] = [];
  for await (const chunk of object.stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function createManyBatched<T>(
  label: string,
  rows: T[],
  write: (batch: T[]) => Promise<{ count: number }>,
): Promise<number> {
  let total = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const result = await write(batch);
    total += result.count;
  }
  console.log(`  ${label}: ${total}`);
  return total;
}

async function wipeTenant(tenantId: string): Promise<void> {
  await prisma.eventFollow.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.eventTimelineEntry.deleteMany({
    where: { tenant_id: tenantId },
  });
  await prisma.eventSignal.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.newsEvent.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.eventFeed.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.marketingPageVersion.deleteMany({
    where: { tenant_id: tenantId },
  });
  await prisma.marketingRedirect.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.marketingPage.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.marketingAsset.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.marketingSite.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.siteDoc.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.siteDocCategory.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.siteFormSubmission.deleteMany({
    where: { tenant_id: tenantId },
  });
  await prisma.shopCartItem.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.shopCart.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.shopPayment.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.shopShipment.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.shopOrderLine.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.shopOrder.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.shopCollectionProduct.deleteMany({
    where: { tenant_id: tenantId },
  });
  await prisma.shopVariant.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.shopProduct.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.shopCollection.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.shopDiscount.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.shopShippingRate.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.shopShippingZone.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.shopSetting.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.memberPayment.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.memberSubscription.deleteMany({
    where: { tenant_id: tenantId },
  });
  await prisma.memberPlan.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.siteMemberOAuthExchangeCode.deleteMany({
    where: { tenant_id: tenantId },
  });
  await prisma.siteMemberOAuthAccount.deleteMany({
    where: { tenant_id: tenantId },
  });
  await prisma.siteMember.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.note.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.todo.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.bookmark.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.notification.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.notificationLog.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.dashboardPreference.deleteMany({
    where: { tenant_id: tenantId },
  });
  await prisma.tenantApiKey.deleteMany({ where: { tenant_id: tenantId } });
  const roles = await prisma.role.findMany({
    where: { tenant_id: tenantId },
    select: { id: true },
  });
  const roleIds = roles.map((role) => role.id);
  if (roleIds.length > 0) {
    await prisma.rolePermission.deleteMany({
      where: { role_id: { in: roleIds } },
    });
  }
  const users = await prisma.user.findMany({
    where: { tenant_id: tenantId },
    select: { id: true },
  });
  const userIds = users.map((user) => user.id);
  if (userIds.length > 0) {
    await prisma.userRole.deleteMany({ where: { user_id: { in: userIds } } });
  }
  await prisma.user.deleteMany({
    where: {
      tenant_id: tenantId,
      id: { not: PLATFORM_ADMIN_USER_ID },
    },
  });
  await prisma.role.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.tenantSetting.deleteMany({ where: { tenant_id: tenantId } });
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const source = await prisma.tenant.findUnique({
    where: { slug: args.fromSlug },
  });
  if (!source) {
    throw new Error(`源租户不存在: ${args.fromSlug}`);
  }
  if (source.status !== "active") {
    throw new Error(`源租户未激活: ${args.fromSlug}`);
  }

  let dest = await prisma.tenant.findUnique({ where: { slug: args.toSlug } });
  if (dest && !args.force && !args.dryRun) {
    throw new Error(`目标租户已存在: ${args.toSlug}（加 --force 覆盖其内容）`);
  }
  if (args.domain) {
    const taken = await prisma.tenant.findFirst({
      where: {
        custom_domain: args.domain,
        ...(dest ? { NOT: { id: dest.id } } : {}),
      },
      select: { slug: true },
    });
    if (taken) {
      throw new Error(`自定义域名已被 ${taken.slug} 绑定: ${args.domain}`);
    }
  }

  const counts = {
    settings: await prisma.tenantSetting.count({
      where: { tenant_id: source.id },
    }),
    users: await prisma.user.count({
      where: {
        tenant_id: source.id,
        id: { not: PLATFORM_ADMIN_USER_ID },
        username: { not: TENANT_IMPERSONATION_USERNAME },
      },
    }),
    roles: await prisma.role.count({ where: { tenant_id: source.id } }),
    pages: await prisma.marketingPage.count({
      where: { tenant_id: source.id },
    }),
    assets: await prisma.marketingAsset.count({
      where: { tenant_id: source.id },
    }),
    docs: await prisma.siteDoc.count({ where: { tenant_id: source.id } }),
    feeds: await prisma.eventFeed.count({ where: { tenant_id: source.id } }),
    events: await prisma.newsEvent.count({ where: { tenant_id: source.id } }),
    signals: await prisma.eventSignal.count({
      where: { tenant_id: source.id },
    }),
  };
  console.log(
    `[clone-tenant] ${args.fromSlug} → ${args.toSlug} name=${args.name} domain=${args.domain ?? ""} dry_run=${args.dryRun} force=${args.force}`,
  );
  console.log(`[clone-tenant] source counts ${JSON.stringify(counts)}`);
  if (args.dryRun) {
    console.log("[clone-tenant] dry-run，未写入");
    return;
  }

  dest = await prisma.$transaction(async (tx) => {
    if (dest) {
      return tx.tenant.update({
        where: { id: dest.id },
        data: {
          name: args.name,
          custom_domain: args.domain,
          status: "active",
          plan: source.plan,
          plan_since: source.plan_since,
          plan_ends_at: source.plan_ends_at,
          onboarding_completed: source.onboarding_completed,
          remark: source.remark,
        },
      });
    }
    return tx.tenant.create({
      data: {
        slug: args.toSlug,
        name: args.name,
        custom_domain: args.domain,
        status: "active",
        plan: source.plan,
        plan_since: source.plan_since,
        plan_ends_at: source.plan_ends_at,
        onboarding_completed: source.onboarding_completed,
        remark: source.remark,
      },
    });
  });

  await wipeTenant(dest.id);

  const userIds = new Map<string, string>();
  const roleIds = new Map<string, string>();
  const pageIds = new Map<string, string>();
  const assetIds = new Map<string, string>();
  const eventIds = new Map<string, string>();
  const signalIds = new Map<string, string>();
  const productIds = new Map<string, string>();
  const collectionIds = new Map<string, string>();
  const variantIds = new Map<string, string>();
  const zoneIds = new Map<string, string>();
  const urlReplacements: Array<[string, string]> = [
    [`/tenants/${args.fromSlug}/`, `/tenants/${args.toSlug}/`],
  ];

  const sourceUsers = await prisma.user.findMany({
    where: {
      tenant_id: source.id,
      id: { not: PLATFORM_ADMIN_USER_ID },
      username: { not: TENANT_IMPERSONATION_USERNAME },
    },
  });
  await prisma.user.createMany({
    data: sourceUsers.map((row) => {
      const id = mapId(userIds, row.id);
      return {
        id,
        tenant_id: dest.id,
        username: row.username,
        password: row.password,
        is_system_admin: row.is_system_admin,
        enabled: row.enabled,
        failed_login_attempts: 0,
        locked_until: null,
      };
    }),
  });
  console.log(`  users: ${sourceUsers.length}`);

  const sourceRoles = await prisma.role.findMany({
    where: { tenant_id: source.id },
  });
  await prisma.role.createMany({
    data: sourceRoles.map((row) => ({
      id: mapId(roleIds, row.id),
      tenant_id: dest.id,
      name: row.name,
      description: row.description,
      scope: row.scope,
      is_builtin: row.is_builtin,
    })),
  });
  const sourceRoleIds = sourceRoles.map((row) => row.id);
  const permissions =
    sourceRoleIds.length === 0
      ? []
      : await prisma.rolePermission.findMany({
          where: { role_id: { in: sourceRoleIds } },
        });
  await prisma.rolePermission.createMany({
    data: permissions.map((row) => ({
      role_id: mapId(roleIds, row.role_id),
      permission: row.permission,
    })),
    skipDuplicates: true,
  });
  const userRoles =
    sourceUsers.length === 0
      ? []
      : await prisma.userRole.findMany({
          where: { user_id: { in: sourceUsers.map((row) => row.id) } },
        });
  await prisma.userRole.createMany({
    data: userRoles.flatMap((row) => {
      const userId = userIds.get(row.user_id);
      const mappedRole = roleIds.get(row.role_id);
      if (!userId || !mappedRole) return [];
      return [{ user_id: userId, role_id: mappedRole }];
    }),
    skipDuplicates: true,
  });
  console.log(
    `  roles: ${sourceRoles.length} permissions=${permissions.length} user_roles=${userRoles.length}`,
  );

  const settings = await prisma.tenantSetting.findMany({
    where: { tenant_id: source.id },
  });
  await prisma.tenantSetting.createMany({
    data: settings.map((row) => ({
      tenant_id: dest.id,
      key: row.key,
      value: toInputJson(rewriteJson(row.value, urlReplacements)),
      secret: row.secret,
    })),
  });
  console.log(`  tenant_settings: ${settings.length}`);

  const assets = await prisma.marketingAsset.findMany({
    where: { tenant_id: source.id },
  });
  const storage = getFileStorageProvider();
  let copiedFiles = 0;
  for (const asset of assets) {
    const id = mapId(assetIds, asset.id);
    const ext = extname(asset.filename);
    const filename = `${id}${ext}`;
    urlReplacements.unshift([
      publicSiteAssetUrl(args.fromSlug, asset.filename),
      publicSiteAssetUrl(args.toSlug, filename),
    ]);
    const sourceKey = buildSiteAssetStorageKey(
      source.id,
      asset.id,
      asset.mime_type,
    );
    const destKey = buildSiteAssetStorageKey(dest.id, id, asset.mime_type);
    const buffer = await readStorageBuffer(sourceKey);
    if (buffer) {
      await storage.put(destKey, buffer, {
        mime_type: asset.mime_type,
        visibility: "public",
      });
      copiedFiles += 1;
    }
    await prisma.marketingAsset.create({
      data: {
        id,
        tenant_id: dest.id,
        filename,
        mime_type: asset.mime_type,
        size_bytes: asset.size_bytes,
        width: asset.width,
        height: asset.height,
        alt: asset.alt,
      },
    });
  }
  console.log(`  marketing_assets: ${assets.length} files=${copiedFiles}`);

  const site = await prisma.marketingSite.findUnique({
    where: { tenant_id: source.id },
  });
  if (site) {
    await prisma.marketingSite.create({
      data: {
        tenant_id: dest.id,
        site_name: toInputJson(rewriteJson(site.site_name, urlReplacements)),
        tagline: toInputJson(rewriteJson(site.tagline, urlReplacements)),
        theme_settings: toInputJson(rewriteJson(site.theme_settings, urlReplacements)),
        theme_settings_draft: toInputJson(rewriteJson(site.theme_settings_draft, urlReplacements)),
        theme_key: site.theme_key,
        default_locale: site.default_locale,
        nav_json: toInputJson(rewriteJson(site.nav_json, urlReplacements)),
        footer_json: toInputJson(rewriteJson(site.footer_json, urlReplacements)),
        nav_draft_json: toInputJson(rewriteJson(site.nav_draft_json, urlReplacements)),
        footer_draft_json: toInputJson(rewriteJson(site.footer_draft_json, urlReplacements)),
        published: site.published,
      },
    });
    console.log(`  marketing_site: published=${site.published}`);
  }

  const pages = await prisma.marketingPage.findMany({
    where: { tenant_id: source.id },
  });
  await prisma.marketingPage.createMany({
    data: pages.map((row) => ({
      id: mapId(pageIds, row.id),
      tenant_id: dest.id,
      slug: row.slug,
      locale: row.locale,
      kind: row.kind,
      title: String(rewriteJson(row.title, urlReplacements)),
      description: String(rewriteJson(row.description, urlReplacements)),
      sections: toInputJson(rewriteJson(row.sections, urlReplacements)),
      settings: toInputJson(rewriteJson(row.settings, urlReplacements)),
      title_draft: String(rewriteJson(row.title_draft, urlReplacements)),
      description_draft: String(
        rewriteJson(row.description_draft, urlReplacements),
      ),
      sections_draft: toInputJson(rewriteJson(row.sections_draft, urlReplacements)),
      settings_draft: toInputJson(rewriteJson(row.settings_draft, urlReplacements)),
      visibility: row.visibility,
      status: row.status,
      sort_order: row.sort_order,
    })),
  });
  console.log(`  marketing_pages: ${pages.length}`);

  const redirects = await prisma.marketingRedirect.findMany({
    where: { tenant_id: source.id },
  });
  await prisma.marketingRedirect.createMany({
    data: redirects.map((row) => ({
      tenant_id: dest.id,
      from_path: row.from_path,
      to_path: String(rewriteJson(row.to_path, urlReplacements)),
      status_code: row.status_code,
    })),
  });
  const versions = await prisma.marketingPageVersion.findMany({
    where: { tenant_id: source.id },
  });
  await prisma.marketingPageVersion.createMany({
    data: versions.flatMap((row) => {
      const pageId = pageIds.get(row.page_id);
      if (!pageId) return [];
      return [
        {
          tenant_id: dest.id,
          page_id: pageId,
          version: row.version,
          title: String(rewriteJson(row.title, urlReplacements)),
          description: String(rewriteJson(row.description, urlReplacements)),
          sections: toInputJson(rewriteJson(row.sections, urlReplacements)),
          settings: toInputJson(rewriteJson(row.settings, urlReplacements)),
          created_by: mappedOr(userIds, row.created_by, "") ?? "",
        },
      ];
    }),
  });
  console.log(
    `  marketing_redirects: ${redirects.length} versions=${versions.length}`,
  );

  const docCategories = await prisma.siteDocCategory.findMany({
    where: { tenant_id: source.id },
  });
  await prisma.siteDocCategory.createMany({
    data: docCategories.map((row) => ({
      tenant_id: dest.id,
      key: row.key,
      label: toInputJson(rewriteJson(row.label, urlReplacements)),
      sort_order: row.sort_order,
    })),
  });
  const docs = await prisma.siteDoc.findMany({
    where: { tenant_id: source.id },
  });
  await prisma.siteDoc.createMany({
    data: docs.map((row) => ({
      tenant_id: dest.id,
      slug: row.slug,
      locale: row.locale,
      title: String(rewriteJson(row.title, urlReplacements)),
      description: String(rewriteJson(row.description, urlReplacements)),
      body_md: String(rewriteJson(row.body_md, urlReplacements)),
      category: row.category,
      sort_order: row.sort_order,
      status: row.status,
      title_draft: String(rewriteJson(row.title_draft, urlReplacements)),
      description_draft: String(
        rewriteJson(row.description_draft, urlReplacements),
      ),
      body_md_draft: String(rewriteJson(row.body_md_draft, urlReplacements)),
      category_draft: row.category_draft,
      sort_order_draft: row.sort_order_draft,
    })),
  });
  console.log(`  site_docs: ${docs.length} categories=${docCategories.length}`);

  const feeds = await prisma.eventFeed.findMany({
    where: { tenant_id: source.id },
  });
  await prisma.eventFeed.createMany({
    data: feeds.map((row) => ({
      tenant_id: dest.id,
      connector: row.connector,
      name: row.name,
      url: row.url,
      source_kind: row.source_kind,
      topic: row.topic,
      enabled: row.enabled,
      last_fetched_at: row.last_fetched_at,
      last_error: row.last_error,
    })),
  });
  const events = await prisma.newsEvent.findMany({
    where: { tenant_id: source.id },
  });
  await createManyBatched("news_events", events, (batch) =>
    prisma.newsEvent.createMany({
      data: batch.map((row) => ({
        id: mapId(eventIds, row.id),
        tenant_id: dest.id,
        slug: row.slug,
        title: row.title,
        summary: row.summary,
        topic: row.topic,
        status: row.status,
        fingerprint: row.fingerprint,
        tokens: row.tokens,
        source_names: row.source_names,
        signal_count: row.signal_count,
        source_count: row.source_count,
        heat_score: row.heat_score,
        velocity_pct: row.velocity_pct,
        first_seen_at: row.first_seen_at,
        last_activity_at: row.last_activity_at,
        analyzed_at: row.analyzed_at,
        analyzer: row.analyzer,
        manual_content: row.manual_content,
      })),
    }),
  );
  const signals = await prisma.eventSignal.findMany({
    where: { tenant_id: source.id },
  });
  await createManyBatched("event_signals", signals, (batch) =>
    prisma.eventSignal.createMany({
      data: batch.map((row) => ({
        id: mapId(signalIds, row.id),
        tenant_id: dest.id,
        connector: row.connector,
        external_id: row.external_id,
        source_name: row.source_name,
        source_kind: row.source_kind,
        title: row.title,
        url: row.url,
        canonical_url: row.canonical_url,
        excerpt: row.excerpt,
        author: row.author,
        topic: row.topic,
        score: row.score,
        comment_count: row.comment_count,
        published_at: row.published_at,
        fetched_at: row.fetched_at,
        event_id: mappedOr(eventIds, row.event_id),
      })),
    }),
  );
  const timeline = await prisma.eventTimelineEntry.findMany({
    where: { tenant_id: source.id },
  });
  await createManyBatched("event_timeline", timeline, (batch) =>
    prisma.eventTimelineEntry.createMany({
      data: batch.flatMap((row) => {
        const eventId = eventIds.get(row.event_id);
        if (!eventId) return [];
        return [
          {
            tenant_id: dest.id,
            event_id: eventId,
            occurred_at: row.occurred_at,
            label_code: row.label_code,
            label_text: row.label_text,
            source_kind: row.source_kind,
            source_name: row.source_name,
            signal_id: mappedOr(signalIds, row.signal_id),
            url: row.url,
          },
        ];
      }),
    }),
  );
  const follows = await prisma.eventFollow.findMany({
    where: { tenant_id: source.id },
  });
  await prisma.eventFollow.createMany({
    data: follows.flatMap((row) => {
      const eventId = eventIds.get(row.event_id);
      const userId = userIds.get(row.user_id);
      if (!eventId || !userId) return [];
      return [
        {
          tenant_id: dest.id,
          user_id: userId,
          event_id: eventId,
          last_seen_at: row.last_seen_at,
        },
      ];
    }),
    skipDuplicates: true,
  });
  console.log(`  event_feeds: ${feeds.length} follows=${follows.length}`);

  const notes = await prisma.note.findMany({ where: { tenant_id: source.id } });
  await prisma.note.createMany({
    data: notes.map((row) => ({
      tenant_id: dest.id,
      title: row.title,
      content: String(rewriteJson(row.content, urlReplacements)),
      created_by: mappedOr(userIds, row.created_by, "") ?? "",
      updated_by: mappedOr(userIds, row.updated_by),
    })),
  });
  const todos = await prisma.todo.findMany({ where: { tenant_id: source.id } });
  await prisma.todo.createMany({
    data: todos.map((row) => ({
      tenant_id: dest.id,
      title: row.title,
      completed: row.completed,
      created_by: mappedOr(userIds, row.created_by, "") ?? "",
      updated_by: mappedOr(userIds, row.updated_by),
    })),
  });
  const bookmarks = await prisma.bookmark.findMany({
    where: { tenant_id: source.id },
  });
  await prisma.bookmark.createMany({
    data: bookmarks.map((row) => ({
      tenant_id: dest.id,
      url: row.url,
      host: row.host,
      title: row.title,
      description: row.description,
      created_by: mappedOr(userIds, row.created_by, "") ?? "",
      updated_by: mappedOr(userIds, row.updated_by),
    })),
  });
  console.log(
    `  notes: ${notes.length} todos=${todos.length} bookmarks=${bookmarks.length}`,
  );

  const shopSetting = await prisma.shopSetting.findUnique({
    where: { tenant_id: source.id },
  });
  if (shopSetting) {
    await prisma.shopSetting.create({
      data: {
        tenant_id: dest.id,
        currency: shopSetting.currency,
        origin_country: shopSetting.origin_country,
        ioss_number: shopSetting.ioss_number,
        eori_number: shopSetting.eori_number,
        stripe_tax_enabled: shopSetting.stripe_tax_enabled,
      },
    });
  }
  const products = await prisma.shopProduct.findMany({
    where: { tenant_id: source.id },
  });
  await prisma.shopProduct.createMany({
    data: products.map((row) => ({
      id: mapId(productIds, row.id),
      tenant_id: dest.id,
      slug: row.slug,
      status: row.status,
      title: toInputJson(rewriteJson(row.title, urlReplacements)),
      subtitle: toInputJson(rewriteJson(row.subtitle, urlReplacements)),
      description: toInputJson(rewriteJson(row.description, urlReplacements)),
      images: toInputJson(rewriteJson(row.images, urlReplacements)),
      product_type: row.product_type,
      vendor: row.vendor,
      tags: toInputJson(row.tags),
      seo_title: toInputJson(rewriteJson(row.seo_title, urlReplacements)),
      seo_description: toInputJson(rewriteJson(row.seo_description, urlReplacements)),
      options: toInputJson(rewriteJson(row.options, urlReplacements)),
      published_at: row.published_at,
      created_by: mappedOr(userIds, row.created_by, "") ?? "",
      updated_by: mappedOr(userIds, row.updated_by),
    })),
  });
  const collections = await prisma.shopCollection.findMany({
    where: { tenant_id: source.id },
  });
  await prisma.shopCollection.createMany({
    data: collections.map((row) => ({
      id: mapId(collectionIds, row.id),
      tenant_id: dest.id,
      slug: row.slug,
      status: row.status,
      title: toInputJson(rewriteJson(row.title, urlReplacements)),
      description: toInputJson(rewriteJson(row.description, urlReplacements)),
      seo_title: toInputJson(rewriteJson(row.seo_title, urlReplacements)),
      seo_description: toInputJson(rewriteJson(row.seo_description, urlReplacements)),
      image_url: row.image_url
        ? String(rewriteJson(row.image_url, urlReplacements))
        : row.image_url,
      parent_id: null,
      sort_order: row.sort_order,
      published_at: row.published_at,
    })),
  });
  for (const row of collections) {
    const parentId = mappedOr(collectionIds, row.parent_id);
    if (!parentId) continue;
    await prisma.shopCollection.update({
      where: { id: mapId(collectionIds, row.id) },
      data: { parent_id: parentId },
    });
  }
  const collectionProducts = await prisma.shopCollectionProduct.findMany({
    where: { tenant_id: source.id },
  });
  await prisma.shopCollectionProduct.createMany({
    data: collectionProducts.flatMap((row) => {
      const collectionId = collectionIds.get(row.collection_id);
      const productId = productIds.get(row.product_id);
      if (!collectionId || !productId) return [];
      return [
        {
          tenant_id: dest.id,
          collection_id: collectionId,
          product_id: productId,
          position: row.position,
        },
      ];
    }),
  });
  const variants = await prisma.shopVariant.findMany({
    where: { tenant_id: source.id },
  });
  await prisma.shopVariant.createMany({
    data: variants.flatMap((row) => {
      const productId = productIds.get(row.product_id);
      if (!productId) return [];
      return [
        {
          id: mapId(variantIds, row.id),
          tenant_id: dest.id,
          product_id: productId,
          sku: row.sku,
          title: toInputJson(rewriteJson(row.title, urlReplacements)),
          option_values: toInputJson(row.option_values),
          price_cents: row.price_cents,
          compare_at_price_cents: row.compare_at_price_cents,
          currency: row.currency,
          stock_qty: row.stock_qty,
          weight_g: row.weight_g,
          barcode: row.barcode,
          hs_code: row.hs_code,
          origin_country: row.origin_country,
          inventory_policy: row.inventory_policy,
          track_inventory: row.track_inventory,
          requires_shipping: row.requires_shipping,
          taxable: row.taxable,
        },
      ];
    }),
  });
  const discounts = await prisma.shopDiscount.findMany({
    where: { tenant_id: source.id },
  });
  await prisma.shopDiscount.createMany({
    data: discounts.map((row) => ({
      tenant_id: dest.id,
      code: row.code,
      type: row.type,
      value: row.value,
      min_subtotal_cents: row.min_subtotal_cents,
      max_uses: row.max_uses,
      used_count: 0,
      starts_at: row.starts_at,
      ends_at: row.ends_at,
      status: row.status,
    })),
  });
  const zones = await prisma.shopShippingZone.findMany({
    where: { tenant_id: source.id },
  });
  await prisma.shopShippingZone.createMany({
    data: zones.map((row) => ({
      id: mapId(zoneIds, row.id),
      tenant_id: dest.id,
      name: row.name,
      countries: toInputJson(row.countries),
    })),
  });
  const rates = await prisma.shopShippingRate.findMany({
    where: { tenant_id: source.id },
  });
  await prisma.shopShippingRate.createMany({
    data: rates.flatMap((row) => {
      const zoneId = zoneIds.get(row.zone_id);
      if (!zoneId) return [];
      return [
        {
          tenant_id: dest.id,
          zone_id: zoneId,
          name: row.name,
          carrier_code: row.carrier_code,
          price_cents: row.price_cents,
          min_days: row.min_days,
          max_days: row.max_days,
        },
      ];
    }),
  });
  console.log(
    `  shop: products=${products.length} collections=${collections.length} variants=${variants.length}`,
  );

  const memberPlans = await prisma.memberPlan.findMany({
    where: { tenant_id: source.id },
  });
  await prisma.memberPlan.createMany({
    data: memberPlans.map((row) => ({
      tenant_id: dest.id,
      slug: row.slug,
      name: toInputJson(rewriteJson(row.name, urlReplacements)),
      description: toInputJson(rewriteJson(row.description, urlReplacements)),
      price_cents: row.price_cents,
      currency: row.currency,
      interval: row.interval,
      provider_product_id: row.provider_product_id,
      sort_order: row.sort_order,
      enabled: row.enabled,
    })),
  });
  const prefs = await prisma.dashboardPreference.findMany({
    where: { tenant_id: source.id },
  });
  await prisma.dashboardPreference.createMany({
    data: prefs.flatMap((row) => {
      const userId = userIds.get(row.user_id);
      if (!userId) return [];
      return [
        {
          tenant_id: dest.id,
          user_id: userId,
          hidden_widgets: row.hidden_widgets,
          widget_order: row.widget_order,
        },
      ];
    }),
  });
  console.log(
    `  member_plans: ${memberPlans.length} dashboard_prefs=${prefs.length}`,
  );

  await ensureTenantImpersonationUser(dest.id);
  invalidateHostTenantCache();

  console.log(
    `[clone-tenant] done tenant_id=${dest.id} slug=${dest.slug} domain=${dest.custom_domain ?? ""}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
