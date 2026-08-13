/**
 * 公开表单的提交与查看。
 *
 * 提交是这个模块唯一一条**匿名写库**的路径，所以校验口径写死在这里、不信任何客户端
 * 送来的东西：字段表从**已发布**的那份页面正文里现取，客户端只能送值。它想多送一个
 * 字段、改一个下拉选项、把必填改成选填，都过不来。
 */

import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { withTenantScope } from "@rewindom/server-kernel/lib/tenant-scope.js";

import { settingText, type SiteSection } from "../shared/section-schema.js";
import {
  resolveFormFields,
  validateFormValues,
  type FormEntry,
  type FormValues,
} from "../shared/sections/form/fields.js";

import { getPublishedPublicPage } from "./site.service.js";

import type { AppLocale } from "@rewindom/shared";

/** 一个 IP 在一个租户站点上，每个窗口能提交多少次。 */
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;

/**
 * 进程内的滑动窗口限流。
 *
 * 明确其边界：**按进程计**，多实例部署时每个实例各有一份配额，重启即清零。它挡的是
 * 「脚本对着一个表单猛灌」这种最常见的骚扰，不是有组织的分布式刷量——那需要共享存储
 * （Redis）或网关层的限流，等真出现再上，不必现在为它引一层依赖。
 */
const hits = new Map<string, number[]>();

function rateLimited(key: string, now: number): boolean {
  const window = (hits.get(key) ?? []).filter(
    (at) => now - at < RATE_WINDOW_MS,
  );
  if (window.length >= RATE_LIMIT) {
    hits.set(key, window);
    return true;
  }
  window.push(now);
  hits.set(key, window);
  // 顺手清掉过期条目，别让这张表随访客数无限涨
  if (hits.size > 5000) {
    for (const [entry, times] of hits) {
      if (times.every((at) => now - at >= RATE_WINDOW_MS)) hits.delete(entry);
    }
  }
  return false;
}

/** 仅供测试：把限流窗口清空。 */
export function resetSiteFormRateLimit(): void {
  hits.clear();
}

/** 段可能在容器段的列里，得往下找一层。 */
function findSection(
  sections: SiteSection[],
  sectionId: string,
): SiteSection | null {
  for (const section of sections) {
    if (section.id === sectionId) return section;
    for (const block of section.blocks) {
      if (!block.sections) continue;
      const found = findSection(block.sections, sectionId);
      if (found) return found;
    }
  }
  return null;
}

export type SubmitResult =
  | { status: "ok" }
  | { status: "not_found" }
  | { status: "rate_limited" }
  | { status: "invalid"; fields: Record<string, string> };

export async function submitSiteForm(input: {
  tenant_id: string;
  tenant_slug: string;
  path: string;
  locale: AppLocale | null;
  section_id: string;
  values: FormValues;
  ip: string;
  user_agent: string;
}): Promise<SubmitResult> {
  const view = await getPublishedPublicPage(
    input.tenant_id,
    input.path,
    input.tenant_slug,
    input.locale,
  );
  if (!view) return { status: "not_found" };

  const section = findSection(view.page.sections, input.section_id);
  // 段不在这一页、或它压根不是表单：不区分地一律 404，别给探测者任何反馈
  if (!section || section.type !== "form") return { status: "not_found" };

  const fields = resolveFormFields(section);
  if (fields.length === 0) return { status: "not_found" };

  // 限流放在「确认这是个真表单」之后：不认识的路径不该消耗配额
  if (rateLimited(`${input.tenant_id}:${input.ip}`, Date.now())) {
    return { status: "rate_limited" };
  }

  const checked = validateFormValues(fields, input.values);
  if (!checked.ok) return { status: "invalid", fields: checked.errors };

  await prisma.marketingFormSubmission.create({
    data: {
      tenant_id: input.tenant_id,
      page_slug: view.page.slug,
      page_locale: view.page.locale,
      section_id: section.id,
      // 段随时会被改名或删掉，存一份提交当时的标题，后台列表才认得出来源
      form_title: settingText(section.settings, "heading"),
      data: checked.entries as unknown as object,
      ip: input.ip.slice(0, 64),
      user_agent: input.user_agent.slice(0, 512),
    },
  });

  return { status: "ok" };
}

export interface FormSubmissionListItem {
  id: string;
  page_slug: string;
  page_locale: string;
  section_id: string;
  form_title: string;
  data: FormEntry[];
  created_at: string;
}

export interface FormSubmissionPage {
  items: FormSubmissionListItem[];
  page: number;
  page_size: number;
  total: number;
  page_count: number;
}

/**
 * 提交列表。
 *
 * 用页码而不是游标：与工作台其余列表页同一套分页控件（`DataTable` + 分页器），
 * 表单提交也不会多到让 offset 成为瓶颈。
 */
export async function listFormSubmissions(
  tenant_id: string,
  options: { page?: number; page_size?: number } = {},
): Promise<FormSubmissionPage> {
  const page_size = Math.min(Math.max(options.page_size ?? 20, 1), 100);
  const page = Math.max(options.page ?? 1, 1);
  const where = withTenantScope(tenant_id, {});

  const [total, rows] = await Promise.all([
    prisma.marketingFormSubmission.count({ where }),
    prisma.marketingFormSubmission.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * page_size,
      take: page_size,
    }),
  ]);

  return {
    items: rows.map((row) => ({
      id: row.id,
      page_slug: row.page_slug,
      page_locale: row.page_locale,
      section_id: row.section_id,
      form_title: row.form_title,
      data: Array.isArray(row.data) ? (row.data as unknown as FormEntry[]) : [],
      created_at: row.created_at.toISOString(),
    })),
    page,
    page_size,
    total,
    page_count: Math.max(Math.ceil(total / page_size), 1),
  };
}

export async function deleteFormSubmission(
  tenant_id: string,
  id: string,
): Promise<boolean> {
  const result = await prisma.marketingFormSubmission.deleteMany({
    where: withTenantScope(tenant_id, { id }),
  });
  return result.count > 0;
}
