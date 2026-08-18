/**
 * 语料保留期清理。
 *
 * 在这之前全模块**没有任何回收路径**：采集每 15 分钟按站点追加信号，永不删除。
 * `event-refresh.service.ts` 里那句「事件的信号被清空（保留期清理）后留着一个空壳
 * 没有意义」曾经指向一个不存在的东西——现在指向这里。
 *
 * 一条产品约束，不是性能取舍：**被关注过的事件一律豁免，无论多旧**。
 * 用户按关注键收藏的东西不该被后台任务收走。
 */
import { config, prisma, withTenantScope } from "@rewindom/module-sdk/server";

import { refreshEvents } from "../event/event-refresh.service.js";

import type { FastifyBaseLogger } from "fastify";

const DAY_MS = 24 * 60 * 60 * 1000;
/**
 * 每批删多少行。一条语句删几十万行会把复制槽和 WAL 撑爆，
 * 也会长时间持锁挡住采集写入。
 */
const DELETE_BATCH = 1000;
/** 单站点单轮最多删几批，避免一次清理跑成一个长事务风暴。 */
const MAX_BATCHES = 50;

export interface RetentionSummary {
  tenants: number;
  signals_deleted: number;
  events_deleted: number;
}

export async function runRetention(options?: {
  now?: Date;
  tenant_ids?: readonly string[];
  log?: FastifyBaseLogger;
}): Promise<RetentionSummary> {
  const now = options?.now ?? new Date();
  const tenantIds = options?.tenant_ids ?? [];
  const summary: RetentionSummary = {
    tenants: tenantIds.length,
    signals_deleted: 0,
    events_deleted: 0,
  };

  for (const tenantId of tenantIds) {
    const part = await runRetentionForTenant(tenantId, now, options?.log);
    summary.signals_deleted += part.signals_deleted;
    summary.events_deleted += part.events_deleted;
  }

  return summary;
}

async function runRetentionForTenant(
  tenantId: string,
  now: Date,
  log?: FastifyBaseLogger,
): Promise<Omit<RetentionSummary, "tenants">> {
  const signalCutoff = new Date(
    now.getTime() - config.events.signalRetentionDays * DAY_MS,
  );
  const eventCutoff = new Date(
    now.getTime() - config.events.eventRetentionDays * DAY_MS,
  );

  /*
   * 顺序是固定的，反过来会留下悬挂的时间线与修订：
   *   1. 删过期信号
   *   2. 对受影响的事件跑 refreshEvents —— 信号被清空的会走「删空壳」分支
   *   3. 删超期且已经没有信号的事件
   */
  const { deleted: signalsDeleted, touched } = await deleteExpiredSignals(
    tenantId,
    signalCutoff,
  );

  if (touched.size > 0) {
    await refreshEvents(touched, { now });
  }

  const eventsDeleted = await deleteExpiredEvents(tenantId, eventCutoff);

  if (signalsDeleted > 0 || eventsDeleted > 0) {
    log?.info(
      { tenantId, signalsDeleted, eventsDeleted },
      "[events] 保留期清理完成",
    );
  }
  return { signals_deleted: signalsDeleted, events_deleted: eventsDeleted };
}

async function deleteExpiredSignals(
  tenantId: string,
  cutoff: Date,
): Promise<{ deleted: number; touched: Set<string> }> {
  const touched = new Set<string>();
  let deleted = 0;

  for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
    const rows = await prisma.eventSignal.findMany({
      where: withTenantScope(tenantId, {
        published_at: { lt: cutoff },
        // 被关注过的事件豁免：它的信号也要留着，否则详情页会变成一张空壳
        OR: [{ event_id: null }, { event: { follows: { none: {} } } }],
      }),
      select: { id: true, event_id: true },
      take: DELETE_BATCH,
    });
    if (rows.length === 0) {
      break;
    }

    await prisma.eventSignal.deleteMany({
      where: { id: { in: rows.map((row) => row.id) } },
    });
    deleted += rows.length;
    for (const row of rows) {
      if (row.event_id) {
        touched.add(row.event_id);
      }
    }
  }

  return { deleted, touched };
}

/**
 * 删超期事件。时间线与修订靠 `onDelete: Cascade` 跟着走，不用单独处理；
 * `EventSignal` 是 `SetNull`，所以这里只删**已经没有信号**的事件——
 * 还有信号的说明它没到期，或者它的信号被豁免留下了。
 */
async function deleteExpiredEvents(
  tenantId: string,
  cutoff: Date,
): Promise<number> {
  let deleted = 0;

  for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
    const rows = await prisma.newsEvent.findMany({
      where: withTenantScope(tenantId, {
        last_activity_at: { lt: cutoff },
        signals: { none: {} },
        follows: { none: {} },
      }),
      select: { id: true },
      take: DELETE_BATCH,
    });
    if (rows.length === 0) {
      break;
    }
    await prisma.newsEvent.deleteMany({
      where: { id: { in: rows.map((row) => row.id) } },
    });
    deleted += rows.length;
  }

  return deleted;
}
