/**
 * 站内重定向的读写。
 *
 * 命中判定在 SSR 找不到页面**之后**才跑：重定向是给「曾经存在的路径」用的，让它抢在
 * 真实页面前面的话，租户后来又建了同名页就永远打不开——而那种错很难联想到是一条
 * 几个月前加的重定向造成的。
 */

import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { withTenantScope } from "@rewindom/server-kernel/lib/tenant-scope.js";

import {
  normalizeRedirectFrom,
  parseRedirectBody,
  type SiteRedirect,
} from "../shared/site-redirect.js";

interface RedirectRow {
  id: string;
  from_path: string;
  to_path: string;
  status_code: number;
  created_at: Date;
  updated_at: Date;
}

function toSiteRedirect(row: RedirectRow): SiteRedirect {
  return {
    id: row.id,
    from_path: row.from_path,
    to_path: row.to_path,
    status_code: row.status_code === 302 ? 302 : 301,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

/**
 * 查一条命中的重定向。
 *
 * **只跳一跳**：目标又是另一条规则的源时不继续解析。多跳解析要防环、要限深，而收益
 * 只是省访客一次请求——真串起来了，浏览器自己会走完，且它本来就有环保护。
 */
export async function findSiteRedirect(
  tenant_id: string,
  path: string,
): Promise<SiteRedirect | null> {
  let from_path: string;
  try {
    from_path = normalizeRedirectFrom(path);
  } catch {
    return null;
  }
  const row = await prisma.marketingRedirect.findFirst({
    where: withTenantScope(tenant_id, { from_path }),
  });
  return row ? toSiteRedirect(row) : null;
}

export async function listSiteRedirects(
  tenant_id: string,
): Promise<SiteRedirect[]> {
  const rows = await prisma.marketingRedirect.findMany({
    where: withTenantScope(tenant_id, {}),
    orderBy: { from_path: "asc" },
  });
  return rows.map(toSiteRedirect);
}

/**
 * 新建或按 `from_path` 覆盖。
 *
 * 同一个源路径只该有一条规则，所以这里是 upsert 而不是 create——不然租户重复添加
 * 只会撞唯一键报错，而他想表达的其实是「改成跳到新地方」。
 */
export async function saveSiteRedirect(
  tenant_id: string,
  body: unknown,
): Promise<SiteRedirect> {
  const parsed = parseRedirectBody(body);
  const row = await prisma.marketingRedirect.upsert({
    where: {
      tenant_id_from_path: { tenant_id, from_path: parsed.from_path },
    },
    create: { tenant_id, ...parsed },
    update: { to_path: parsed.to_path, status_code: parsed.status_code },
  });
  return toSiteRedirect(row);
}

export async function deleteSiteRedirect(
  tenant_id: string,
  id: string,
): Promise<boolean> {
  const result = await prisma.marketingRedirect.deleteMany({
    where: withTenantScope(tenant_id, { id }),
  });
  return result.count > 0;
}
