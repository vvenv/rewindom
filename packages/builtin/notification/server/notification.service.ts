import { withTenantScope } from "@rewindom/server-kernel/lib/tenant-scope.js";

import { createEmptyNotificationUnreadCount, NOTIFICATION_SEVERITIES, type NotificationItem, type NotificationSeverity, type NotificationType, type NotificationUnreadCount, type NotificationsPage } from "../shared/index.js";

import type {
  Prisma,
  PrismaClient,
} from "@rewindom/server-kernel/generated/prisma/client/client.js";

const NOTIFICATION_RETENTION_DAYS = 90;
const MAX_UNREAD_PER_USER = 500;

export interface CreateNotificationInput {
  tenant_id: string;
  user_id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  body: string;
  link_path?: string;
  metadata?: Record<string, unknown>;
  dedupe_key?: string;
}

function isNotificationSeverity(value: string): value is NotificationSeverity {
  return value === "info" || value === "warning" || value === "critical";
}

function toInputJsonMetadata(
  metadata: Record<string, unknown> | undefined,
): Prisma.InputJsonValue | undefined {
  if (metadata === undefined) return undefined;
  return metadata as Prisma.InputJsonValue;
}

function toJsonMetadata(
  metadata: Prisma.JsonValue | null,
): Record<string, unknown> | null {
  if (metadata === null || metadata === undefined) return null;
  if (typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }
  return null;
}

async function enforceUserNotificationLimits(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
): Promise<void> {
  let unreadCount = await prisma.notification.count({
    where: { tenant_id: tenantId, user_id: userId, read_at: null },
  });

  if (unreadCount < MAX_UNREAD_PER_USER) {
    return;
  }

  const readRows = await prisma.notification.findMany({
    where: {
      tenant_id: tenantId,
      user_id: userId,
      read_at: { not: null },
    },
    orderBy: { created_at: "asc" },
    select: { id: true },
  });

  if (readRows.length > 0) {
    await prisma.notification.deleteMany({
      where: {
        tenant_id: tenantId,
        user_id: userId,
        id: { in: readRows.map((row) => row.id) },
      },
    });
  }

  unreadCount = await prisma.notification.count({
    where: { tenant_id: tenantId, user_id: userId, read_at: null },
  });

  if (unreadCount < MAX_UNREAD_PER_USER) {
    return;
  }

  const overflow = unreadCount - MAX_UNREAD_PER_USER + 1;
  const oldestUnread = await prisma.notification.findMany({
    where: { tenant_id: tenantId, user_id: userId, read_at: null },
    orderBy: { created_at: "asc" },
    take: overflow,
    select: { id: true },
  });

  if (oldestUnread.length > 0) {
    await prisma.notification.deleteMany({
      where: {
        tenant_id: tenantId,
        user_id: userId,
        id: { in: oldestUnread.map((row) => row.id) },
      },
    });
  }
}

function mapNotificationRow(row: {
  id: string;
  type: string;
  severity: string;
  title: string;
  body: string;
  link_path: string | null;
  metadata: Prisma.JsonValue | null;
  read_at: Date | null;
  created_at: Date;
}): NotificationItem {
  const type: NotificationType = row.type;
  const severity = isNotificationSeverity(row.severity) ? row.severity : "info";

  return {
    id: row.id,
    type,
    severity,
    title: row.title,
    body: row.body,
    link_path: row.link_path,
    metadata: toJsonMetadata(row.metadata),
    read_at: row.read_at?.toISOString() ?? null,
    created_at: row.created_at.toISOString(),
  };
}

export async function createNotification(
  prisma: PrismaClient,
  input: CreateNotificationInput,
): Promise<NotificationItem> {
  const data: Prisma.NotificationUncheckedCreateInput = {
    tenant_id: input.tenant_id,
    user_id: input.user_id,
    type: input.type,
    severity: input.severity,
    title: input.title,
    body: input.body,
    link_path: input.link_path ?? null,
    metadata: toInputJsonMetadata(input.metadata),
    dedupe_key: input.dedupe_key ?? null,
  };

  if (input.dedupe_key) {
    const existing = await prisma.notification.findUnique({
      where: {
        tenant_id_dedupe_key: {
          tenant_id: input.tenant_id,
          dedupe_key: input.dedupe_key,
        },
      },
    });
    if (existing) {
      return mapNotificationRow(existing);
    }
  }

  await enforceUserNotificationLimits(prisma, input.tenant_id, input.user_id);

  try {
    const created = await prisma.notification.create({ data });
    return mapNotificationRow(created);
  } catch (err) {
    if (
      input.dedupe_key &&
      err instanceof Error &&
      "code" in err &&
      err.code === "P2002"
    ) {
      const existing = await prisma.notification.findUnique({
        where: {
          tenant_id_dedupe_key: {
            tenant_id: input.tenant_id,
            dedupe_key: input.dedupe_key,
          },
        },
      });
      if (existing) {
        return mapNotificationRow(existing);
      }
    }
    throw err;
  }
}

export async function listNotifications(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
  options: { page: number; page_size: number; unread_only?: boolean },
): Promise<NotificationsPage> {
  const page = Math.max(1, options.page);
  const page_size = Math.min(100, Math.max(1, options.page_size));
  const skip = (page - 1) * page_size;

  const where = {
    tenant_id: tenantId,
    user_id: userId,
    ...(options.unread_only ? { read_at: null } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: page_size,
    }),
    prisma.notification.count({ where }),
  ]);

  return {
    items: rows.map(mapNotificationRow),
    total,
    page,
    page_size,
  };
}

export async function getUnreadCount(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
): Promise<NotificationUnreadCount> {
  const groups = await prisma.notification.groupBy({
    by: ["severity"],
    where: {
      tenant_id: tenantId,
      user_id: userId,
      read_at: null,
    },
    _count: { _all: true },
  });

  const result = createEmptyNotificationUnreadCount();
  for (const group of groups) {
    if (!isNotificationSeverity(group.severity)) continue;
    result.by_severity[group.severity] = group._count._all;
    result.total += group._count._all;
  }
  return result;
}

export async function listUnreadNotificationsSince(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
  since: Date,
  limit = 50,
): Promise<NotificationItem[]> {
  const rows = await prisma.notification.findMany({
    where: {
      tenant_id: tenantId,
      user_id: userId,
      read_at: null,
      created_at: { gt: since },
    },
    orderBy: { created_at: "asc" },
    take: limit,
  });
  return rows.map(mapNotificationRow);
}

export async function markNotificationRead(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
  notificationId: string,
): Promise<NotificationItem | null> {
  const existing = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      tenant_id: tenantId,
      user_id: userId,
    },
  });
  if (!existing) return null;

  const updated = existing.read_at
    ? existing
    : await prisma.notification.update({
        // 归属条件并进 update 自身：上面的 findFirst 负责判空，
        // 这里再带一次，避免「校验」与「写入」之间存在时间窗。
        where: {
          id: notificationId,
          tenant_id: tenantId,
          user_id: userId,
        },
        data: { read_at: new Date() },
      });

  return mapNotificationRow(updated);
}

export async function markAllNotificationsRead(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
): Promise<{ updated_count: number }> {
  const result = await prisma.notification.updateMany({
    where: {
      tenant_id: tenantId,
      user_id: userId,
      read_at: null,
    },
    data: { read_at: new Date() },
  });
  return { updated_count: result.count };
}

export async function purgeOldNotifications(
  prisma: PrismaClient,
  tenantId?: string,
): Promise<{ deleted_count: number }> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - NOTIFICATION_RETENTION_DAYS);

  const result = await prisma.notification.deleteMany({
    where: {
      AND: [
        { read_at: { not: null } },
        { created_at: { lt: cutoff } },
        ...(tenantId ? [withTenantScope(tenantId, {})] : []),
      ],
    },
  });
  return { deleted_count: result.count };
}

export {
  NOTIFICATION_RETENTION_DAYS,
  MAX_UNREAD_PER_USER,
  NOTIFICATION_SEVERITIES,
};
