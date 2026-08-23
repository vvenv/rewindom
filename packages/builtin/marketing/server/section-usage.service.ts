/**
 * 「哪几张页面摆了某个段」——给贡献方登记链接候选用的**通用只读接口**。
 *
 * 存在的理由：贡献方知道自己的段叫什么 type，但不知道租户把它摆到了哪一页；
 * 而正文（`MarketingPage.sections`）是 marketing 的模型，跨限界上下文读不该让别人
 * 直接查（决策表：跨上下文读走 provider / 只读接口）。所以这层由 marketing 提供，
 * 按 type 回答，不认识任何具体业务段。
 *
 * 只在**编辑时**被调（打开「填链接」下拉），不在公开渲染路径上——所以这里扫 JSON
 * 是可以的：一个站几十张页，一次 O(页数 × 段数) 的内存遍历，比让每个模块各查一遍
 * 数据库便宜得多。
 */
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { withTenantScope } from "@rewindom/server-kernel/lib/tenant-scope.js";
import { normalizeLocale, type AppLocale } from "@rewindom/shared";

import {
  canonicalizePageIdentity,
  marketingPagePath,
} from "../shared/site-cms.js";
import { interpolateSiteText } from "../shared/site-interpolation.js";

export interface SectionUsage {
  /** 逻辑路径（不带 locale 前缀），可直接当 href。 */
  page_path: string;
  /** 页面 kind。调用方拿它给「同页锚点」这类候选钉 `page_kinds`。 */
  page_kind: string;
  page_title: string;
  /**
   * 这一段的锚点（`layout.anchor`，租户填了才有）。
   *
   * 有它才能生成 `/path#anchor` 这种「跳过去并定位到区块」的候选。
   */
  anchor: string | null;
  /** 页面还没发布。照列——先配导航后发布是常见顺序。 */
  draft: boolean;
}

interface RawSection {
  type?: unknown;
  settings?: unknown;
  blocks?: unknown;
  /** 容器 block 的列：段可以嵌一层。 */
  sections?: unknown;
}

/** `site_name` / `tagline` 存的是纯字符串或 `{__i18n}` 表，取当前语言那一格。 */
function plainText(value: unknown, locale: string): string {
  if (typeof value === "string") return value;
  const table = (value as { __i18n?: Record<string, string> } | null)?.__i18n;
  if (!table) return "";
  return table[locale] ?? Object.values(table).find(Boolean) ?? "";
}

/**
 * 页面标题里的 `{site}` 之类要替掉再当标签用。
 *
 * 首页标题默认就存着 `{site}`——原样拿去当链接候选的名字，租户看到的是
 * 「邮件订阅：{site}」。替不掉的（页面上下文才有的 token）退回路径，
 * 总好过把花括号摊给人看。
 */
function displayTitle(
  title: string,
  tokens: Record<string, string>,
  fallbackPath: string,
): string {
  const resolved = interpolateSiteText(title, tokens).trim();
  if (!resolved || resolved.includes("{")) return fallbackPath;
  return resolved;
}

function anchorOf(section: RawSection): string | null {
  const settings = section.settings;
  if (!settings || typeof settings !== "object") return null;
  const raw = (settings as Record<string, unknown>).anchor;
  // `anchor` 声明了 `localizable: false`，所以一定是裸字符串，不会是 `{__i18n}`
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

/**
 * 找出正文里所有该 type 的段。
 *
 * 容器段的列里也要找一层：租户很可能把订阅段摆进两列布局里，
 * 只扫顶层会让那些页面凭空消失。
 */
function collect(sections: unknown, type: string, out: RawSection[]): void {
  if (!Array.isArray(sections)) return;
  for (const raw of sections) {
    if (!raw || typeof raw !== "object") continue;
    const section = raw as RawSection;
    if (section.type === type) out.push(section);
    if (Array.isArray(section.blocks)) {
      for (const block of section.blocks) {
        if (block && typeof block === "object") {
          collect((block as RawSection).sections, type, out);
        }
      }
    }
  }
}

export async function findPagesUsingSection(
  tenant_id: string,
  sectionType: string,
): Promise<SectionUsage[]> {
  const site = await prisma.marketingSite.findFirst({
    where: withTenantScope(tenant_id),
    select: { default_locale: true, site_name: true, tagline: true },
  });
  const defaultLocale: AppLocale = normalizeLocale(site?.default_locale);
  const siteTokens: Record<string, string> = {
    site: plainText(site?.site_name, defaultLocale),
    tagline: plainText(site?.tagline, defaultLocale),
  };

  const pages = await prisma.marketingPage.findMany({
    where: withTenantScope(tenant_id),
    orderBy: [{ sort_order: "asc" }, { title_draft: "asc" }],
    select: {
      slug: true,
      locale: true,
      kind: true,
      status: true,
      title: true,
      title_draft: true,
      sections: true,
      sections_draft: true,
    },
  });

  /*
   * 按**逻辑路径**归并，「任一语言版本含有即算」。
   *
   * 这里刻意与 `listSiteLinkTargets` 的「只看默认语言那一版」不同——两者问的不是
   * 同一件事：列页面时每种语言共用一个地址，列一次就够；而正文是**逐语言各一份**的，
   * 段完全可能只摆在其中一种语言的版本上。照抄那条规则的后果是：站点默认语言是 en、
   * 租户把订阅段加在中文版首页上时，这个接口什么都找不到（真出过这个 bug）。
   */
  interface Entry extends SectionUsage {
    /** 标题是否来自默认语言那一版——它优先，其余语言只在缺省时兜底。 */
    from_default_locale: boolean;
  }
  const byPath = new Map<string, Entry>();

  for (const record of pages) {
    const { kind, slug } = canonicalizePageIdentity(record.kind, record.slug);
    const found: RawSection[] = [];
    // 优先看草稿：编辑器里刚摆上去还没发布的那一版才是租户正在配的
    collect(record.sections_draft ?? record.sections, sectionType, found);
    if (found.length === 0) continue;

    const path = marketingPagePath(kind, slug);
    /*
     * 判据是**路径带不带参数**，不是「它是不是模板页」。
     *
     * 排除的理由从来只有一个：`/docs/:slug` 这种模板路径链不过去，它代表的是
     * 「这一类内容的全部详情」而不是一个能打开的地址。而首页（`/`）、订阅页
     * （`/subscribe`）、会员登录页（`/member/login`）同样登记成模板 kind，
     * 却都是实打实能打开的地址。
     *
     * 先按 kind 一刀切过——首页被误杀过一次，订阅页又被误杀了第二次。
     */
    if (path.includes(":")) continue;
    const title = displayTitle(
      record.title_draft || record.title,
      siteTokens,
      path,
    );
    // 同一页摆了两个的话只取第一个有锚点的，避免下拉里冒出两条一模一样的候选
    const anchor = found.map(anchorOf).find(Boolean) ?? null;
    const published = record.status === "published";
    const isDefaultLocale =
      normalizeLocale(record.locale, defaultLocale) === defaultLocale;

    const existing = byPath.get(path);
    if (!existing) {
      byPath.set(path, {
        page_path: path,
        page_kind: kind,
        page_title: title,
        anchor,
        draft: !published,
        from_default_locale: isDefaultLocale,
      });
      continue;
    }
    // 默认语言的标题最贴近租户对这张页的称呼，其余语言只兜底
    if (isDefaultLocale && !existing.from_default_locale) {
      existing.page_title = title;
      existing.from_default_locale = true;
    }
    existing.anchor ??= anchor;
    // 任一语言已发布，这个地址就是通的
    if (published) existing.draft = false;
  }

  return [...byPath.values()].map(
    ({ from_default_locale: _drop, ...usage }) => usage,
  );
}
