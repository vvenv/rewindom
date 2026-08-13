import { resolveSortOrder } from "@rewindom/server-kernel/http/list-sort.js";
import { NotFoundError } from "@rewindom/server-kernel/lib/app-errors.js";
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";

import {
  SITE_MEMBER_SORTABLE_FIELDS,
  type SiteMemberListItem,
  type SiteMemberSortField,
  type SiteMemberUpdateBody,
} from "../shared/site-member.js";

import { toSiteMemberListItem } from "./site-member.mapper.js";


import type { Prisma } from "@rewindom/server-kernel/generated/prisma/client/client.js";

export interface ListSiteMembersInput {
  tenant_id: string;
  page: number;
  page_size: number;
  q?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}

export interface ListSiteMembersResult {
  items: SiteMemberListItem[];
  page: number;
  page_size: number;
  total: number;
  page_count: number;
}

function resolveSortField(sortBy?: string): SiteMemberSortField {
  return SITE_MEMBER_SORTABLE_FIELDS.includes(sortBy as SiteMemberSortField)
    ? (sortBy as SiteMemberSortField)
    : "created_at";
}

export async function listSiteMembers(
  input: ListSiteMembersInput,
): Promise<ListSiteMembersResult> {
  const where: Prisma.SiteMemberWhereInput = {
    tenant_id: input.tenant_id,
    ...(input.q
      ? {
          OR: [
            { email: { contains: input.q, mode: "insensitive" as const } },
            {
              display_name: {
                contains: input.q,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.siteMember.findMany({
      where,
      orderBy: {
        [resolveSortField(input.sort_by)]: resolveSortOrder(input.sort_dir),
      },
      skip: (input.page - 1) * input.page_size,
      take: input.page_size,
    }),
    prisma.siteMember.count({ where }),
  ]);

  return {
    items: rows.map(toSiteMemberListItem),
    page: input.page,
    page_size: input.page_size,
    total,
    page_count: Math.ceil(total / input.page_size),
  };
}

export async function getSiteMember(
  tenantId: string,
  memberId: string,
): Promise<SiteMemberListItem> {
  const member = await prisma.siteMember.findFirst({
    where: { id: memberId, tenant_id: tenantId },
  });
  if (!member) {
    throw new NotFoundError("site_member.not_found");
  }
  return toSiteMemberListItem(member);
}

export async function updateSiteMember(
  tenantId: string,
  memberId: string,
  input: SiteMemberUpdateBody,
): Promise<SiteMemberListItem> {
  await getSiteMember(tenantId, memberId);

  const member = await prisma.siteMember.update({
    where: { id: memberId, tenant_id: tenantId },
    data: {
      enabled: input.enabled,
      display_name: input.display_name?.trim(),
    },
  });

  // 停用即刻失效已签发的会话，否则最长还能用满一个 access token 周期。
  if (input.enabled === false) {
    await prisma.siteMemberRefreshToken.updateMany({
      where: { member_id: memberId, revoked: false },
      data: { revoked: true },
    });
  }

  return toSiteMemberListItem(member);
}

export async function deleteSiteMember(
  tenantId: string,
  memberId: string,
): Promise<SiteMemberListItem> {
  const member = await getSiteMember(tenantId, memberId);
  await prisma.siteMember.delete({
    where: { id: memberId, tenant_id: tenantId },
  });
  return member;
}
