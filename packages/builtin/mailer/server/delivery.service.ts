/**
 * 投递记录的查询面。发信本身在 `mail.service.ts`，这里只读。
 */

import { resolveSortField, resolveSortOrder } from "@rewindom/server-kernel/http/list-sort.js";
import { NotFoundError } from "@rewindom/server-kernel/lib/app-errors.js";
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { withTenantScope } from "@rewindom/server-kernel/lib/tenant-scope.js";

import { toMailDeliveryDetail, toMailDeliveryListItem } from "./mailer.mapper.js";

import type {
  MailDeliveryDetail,
  MailDeliveryListItem,
} from "../shared/index.js";

const SORTABLE_FIELDS = new Set(["created_at", "sent_at", "status", "source"]);

export interface ListDeliveriesParams {
  tenant_id: string;
  page: number;
  page_size: number;
  q?: string;
  status?: string;
  source?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
  /** 看全址要单独放行，默认掩码——见 mailer.mapper.ts 的 maskEmail 注释。 */
  unmask?: boolean;
}

export interface ListDeliveriesResult {
  items: MailDeliveryListItem[];
  page: number;
  page_size: number;
  total: number;
  page_count: number;
}

function buildWhere(params: ListDeliveriesParams) {
  const q = params.q?.trim();
  return withTenantScope(params.tenant_id, {
    ...(params.status ? { status: params.status } : {}),
    ...(params.source ? { source: params.source } : {}),
    ...(q
      ? {
          OR: [
            { to_email: { contains: q, mode: "insensitive" as const } },
            { subject: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  });
}

export async function listDeliveries(
  params: ListDeliveriesParams,
): Promise<ListDeliveriesResult> {
  const skip = (params.page - 1) * params.page_size;
  const where = buildWhere(params);
  const field = resolveSortField(params.sort_by, SORTABLE_FIELDS, "created_at");
  const order = resolveSortOrder(params.sort_dir, "desc");

  const [records, total] = await Promise.all([
    prisma.mailDelivery.findMany({
      where,
      orderBy: { [field]: order },
      skip,
      take: params.page_size,
    }),
    prisma.mailDelivery.count({ where }),
  ]);

  return {
    items: records.map((record) =>
      toMailDeliveryListItem(record, { unmask: params.unmask }),
    ),
    page: params.page,
    page_size: params.page_size,
    total,
    page_count: Math.ceil(total / params.page_size),
  };
}

export async function getDelivery(
  tenantId: string,
  deliveryId: string,
  options: { unmask?: boolean } = {},
): Promise<MailDeliveryDetail> {
  const record = await prisma.mailDelivery.findFirst({
    where: withTenantScope(tenantId, { id: deliveryId }),
  });
  if (!record) throw new NotFoundError("mailer.delivery_not_found");
  return toMailDeliveryDetail(record, options);
}
