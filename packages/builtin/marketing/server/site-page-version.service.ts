/**
 * 页面正文的版本历史。
 *
 * 与既有的草稿 / 线上两列是**两回事**：那两列回答「有没有未发布的改动」（撤销只能回到
 * 最近一次发布），这里回答「上周三线上是什么样」。
 *
 * 只在**发布**时留快照，不在保存草稿时留：草稿保存是每敲几个字就发一次的自动动作，
 * 逐次留档会把历史淹没在几百条无意义的中间态里。发布是一次有意的「就它了」。
 */

import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { withTenantScope } from "@rewindom/server-kernel/lib/tenant-scope.js";

import { safePageSections } from "./site.util.js";

import type { SiteSection } from "../shared/section-schema.js";
import type { MarketingPageSettings } from "../shared/site-cms.js";
import type { Prisma } from "@rewindom/server-kernel/generated/prisma/client/client.js";

/** 每页保留多少版；超出的从最旧开始丢。 */
const KEEP_VERSIONS = 50;

export interface PageVersionListItem {
  id: string;
  version: number;
  title: string;
  description: string;
  /** 这一版有多少个顶层区块——列表里用来一眼看出改动幅度。 */
  section_count: number;
  created_by: string;
  created_at: string;
}

export interface PageVersionDetail extends PageVersionListItem {
  sections: SiteSection[];
  settings: MarketingPageSettings;
}

/**
 * 记一版。
 *
 * 与发布**同一个事务**，由调用方传入 `tx`：分开写的话，发布成功而留档失败会出现一版
 * 上线过、但历史里查不到的内容——回滚时看到的版本列表就是错的。
 */
export async function recordPageVersion(
  tx: Prisma.TransactionClient,
  input: {
    tenant_id: string;
    page_id: string;
    title: string;
    description: string;
    sections: unknown;
    settings: unknown;
    created_by: string;
  },
): Promise<void> {
  const latest = await tx.marketingPageVersion.findFirst({
    where: withTenantScope(input.tenant_id, { page_id: input.page_id }),
    orderBy: { version: "desc" },
    select: { version: true },
  });

  await tx.marketingPageVersion.create({
    data: {
      tenant_id: input.tenant_id,
      page_id: input.page_id,
      version: (latest?.version ?? 0) + 1,
      title: input.title,
      description: input.description,
      sections: input.sections as Prisma.InputJsonValue,
      settings: input.settings as Prisma.InputJsonValue,
      created_by: input.created_by,
    },
  });

  /*
   * 修剪：按 version 而不是按时间。时间戳可能撞（同一毫秒连发两次），
   * 而 version 是严格递增且唯一的，删起来不会误伤。
   */
  const cutoff = await tx.marketingPageVersion.findFirst({
    where: withTenantScope(input.tenant_id, { page_id: input.page_id }),
    orderBy: { version: "desc" },
    skip: KEEP_VERSIONS,
    select: { version: true },
  });
  if (cutoff) {
    await tx.marketingPageVersion.deleteMany({
      where: withTenantScope(input.tenant_id, {
        page_id: input.page_id,
        version: { lte: cutoff.version },
      }),
    });
  }
}

export async function listPageVersions(
  tenant_id: string,
  page_id: string,
): Promise<PageVersionListItem[]> {
  const rows = await prisma.marketingPageVersion.findMany({
    where: withTenantScope(tenant_id, { page_id }),
    orderBy: { version: "desc" },
    select: {
      id: true,
      version: true,
      title: true,
      description: true,
      sections: true,
      created_by: true,
      created_at: true,
    },
  });
  return rows.map((row) => ({
    id: row.id,
    version: row.version,
    title: row.title,
    description: row.description,
    section_count: Array.isArray(row.sections) ? row.sections.length : 0,
    created_by: row.created_by,
    created_at: row.created_at.toISOString(),
  }));
}

export async function getPageVersion(
  tenant_id: string,
  page_id: string,
  version: number,
): Promise<PageVersionDetail | null> {
  const row = await prisma.marketingPageVersion.findFirst({
    where: withTenantScope(tenant_id, { page_id, version }),
  });
  if (!row) return null;
  return {
    id: row.id,
    version: row.version,
    title: row.title,
    description: row.description,
    // 历史快照按**当前**这份 schema 重新解析：期间删掉的段会走 unsupported 兜住
    sections: safePageSections(row.sections),
    section_count: Array.isArray(row.sections) ? row.sections.length : 0,
    settings: (row.settings ?? {}) as MarketingPageSettings,
    created_by: row.created_by,
    created_at: row.created_at.toISOString(),
  };
}

/**
 * 把某一版恢复到**草稿**，而不是直接覆盖线上。
 *
 * 直接覆盖线上等于「一键把访客看到的页面换成三周前的样子」，没有任何复核余地；恢复成
 * 草稿之后租户可以在预览里看一眼、再决定发不发布——而发布本身又会留下新的一版，
 * 所以「恢复错了」也还退得回去。
 */
export async function restorePageVersion(
  tenant_id: string,
  page_id: string,
  version: number,
): Promise<boolean> {
  const snapshot = await prisma.marketingPageVersion.findFirst({
    where: withTenantScope(tenant_id, { page_id, version }),
  });
  if (!snapshot) return false;

  const result = await prisma.marketingPage.updateMany({
    where: withTenantScope(tenant_id, { id: page_id }),
    data: {
      title_draft: snapshot.title,
      description_draft: snapshot.description,
      sections_draft: snapshot.sections as Prisma.InputJsonValue,
      settings_draft: snapshot.settings as Prisma.InputJsonValue,
    },
  });
  return result.count > 0;
}
