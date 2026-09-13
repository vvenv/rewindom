/**
 * 投递箱的读写。
 *
 * 只有失败的投递会落到这里，所以这张表平时应当是空的——行数持续不为零，
 * 说明某个 handler 在持续失败，那本身就是告警信号。
 */
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";

import {
  OUTBOX_MAX_ATTEMPTS,
  OUTBOX_STUCK_MS,
  hasAttemptsLeft,
  nextAttemptAt,
} from "../shared/index.js";

import type { JsonValue } from "@rewindom/shared";

export interface OutboxEnqueueInput {
  topic: string;
  payload: JsonValue;
  tenant_id?: string | null;
  /** 同 topic 下唯一；不传 = 不去重。 */
  dedupe_key?: string | null;
  /** 首次可投时间，默认立刻。 */
  available_at?: Date;
  last_error?: string;
}

export interface ClaimedOutboxMessage {
  id: string;
  topic: string;
  payload: JsonValue;
  tenant_id: string | null;
  attempts: number;
}

/**
 * 入队。**撞 `dedupe_key` 时不新增行**，回已有那一行的 id。
 *
 * 靠数据库唯一约束拦而不是「先查再写」，理由同 mailer 的幂等键：重试任务与在线
 * 投递并发时，查与写之间那道窗口正好会漏。
 */
export async function enqueueOutboxMessage(
  input: OutboxEnqueueInput,
): Promise<{ id: string; deduped: boolean }> {
  const data = {
    topic: input.topic,
    payload: input.payload as never,
    tenant_id: input.tenant_id ?? null,
    dedupe_key: input.dedupe_key ?? null,
    next_attempt_at: input.available_at ?? new Date(),
    last_error: input.last_error ?? null,
  };

  try {
    // eslint-disable-next-line tenant-scope/require-tenant-scope -- 入队时租户由调用方给定，不是过滤条件
    const created = await prisma.outboxMessage.create({ data });
    return { id: created.id, deduped: false };
  } catch (err) {
    if (!isUniqueViolation(err) || !input.dedupe_key) {
      throw err;
    }
    // eslint-disable-next-line tenant-scope/require-tenant-scope -- 撞唯一键后按 (topic, dedupe_key) 回找，该键本身全局唯一
    const existing = await prisma.outboxMessage.findFirst({
      where: { topic: input.topic, dedupe_key: input.dedupe_key },
      select: { id: true },
    });
    if (!existing) {
      throw err;
    }
    return { id: existing.id, deduped: true };
  }
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: string }).code === "P2002"
  );
}

/**
 * 把卡在 `processing` 太久的消息放回 pending。
 *
 * 派发器崩在 handler 中途时这条消息既不会继续、也不会被再次认领——没有这一步，
 * 它就永远停在 processing，比直接丢了更难发现。
 */
export async function recoverStuckMessages(now = new Date()): Promise<number> {
  // eslint-disable-next-line tenant-scope/require-tenant-scope -- 系统级重投队列，派发器须跨租户扫描
  const result = await prisma.outboxMessage.updateMany({
    where: {
      status: "processing",
      locked_at: { lt: new Date(now.getTime() - OUTBOX_STUCK_MS) },
    },
    data: { status: "pending", locked_at: null },
  });
  return result.count;
}

/**
 * 认领一批到点的消息。
 *
 * 先查候选再逐条带 `status: "pending"` 条件更新：`updateMany` 的返回行数就是
 * 认领成功与否，多实例同时醒来也只有一个能把某一行从 pending 改走。
 * 没用 `FOR UPDATE SKIP LOCKED` 是因为那要落到 `$queryRaw`，而这里的并发度
 * （每 30 秒一批、单进程部署）远不到需要它的量级。
 */
export async function claimOutboxBatch(
  limit: number,
  now = new Date(),
): Promise<ClaimedOutboxMessage[]> {
  // eslint-disable-next-line tenant-scope/require-tenant-scope -- 系统级重投队列，派发器须跨租户扫描
  const candidates = await prisma.outboxMessage.findMany({
    where: { status: "pending", next_attempt_at: { lte: now } },
    orderBy: { next_attempt_at: "asc" },
    take: limit,
    select: { id: true },
  });

  const claimed: ClaimedOutboxMessage[] = [];

  for (const candidate of candidates) {
    // eslint-disable-next-line tenant-scope/require-tenant-scope -- 系统级重投队列，派发器须跨租户扫描
    const result = await prisma.outboxMessage.updateMany({
      where: { id: candidate.id, status: "pending" },
      data: {
        status: "processing",
        locked_at: now,
        attempts: { increment: 1 },
      },
    });
    if (result.count === 0) {
      continue;
    }

    // eslint-disable-next-line tenant-scope/require-tenant-scope -- 按主键取刚认领的那一行
    const row = await prisma.outboxMessage.findUnique({
      where: { id: candidate.id },
      select: {
        id: true,
        topic: true,
        payload: true,
        tenant_id: true,
        attempts: true,
      },
    });
    if (row) {
      claimed.push({ ...row, payload: row.payload as JsonValue });
    }
  }

  return claimed;
}

/**
 * 投递成功后**删除**该行。
 *
 * 不留 `done`：消息是别处已有记录（审计行、通知行）的副本，留着只会让表无限长，
 * 还得再配一个保留期清理任务。想知道补投发生过，看日志与 job 运行态。
 */
export async function completeOutboxMessage(id: string): Promise<void> {
  // eslint-disable-next-line tenant-scope/require-tenant-scope -- 按主键删除已重投成功的那一行
  await prisma.outboxMessage.delete({ where: { id } });
}

/** 还有重试机会就退避重排，用完梯度就进死信。返回落到哪个状态，供调用方决定日志级别。 */
export async function failOutboxMessage(
  message: Pick<ClaimedOutboxMessage, "id" | "attempts">,
  error: string,
  now = new Date(),
): Promise<"pending" | "dead"> {
  if (!hasAttemptsLeft(message.attempts)) {
    // eslint-disable-next-line tenant-scope/require-tenant-scope -- 按主键更新自己刚认领的那一行
    await prisma.outboxMessage.update({
      where: { id: message.id },
      data: { status: "dead", locked_at: null, last_error: error },
    });
    return "dead";
  }

  // eslint-disable-next-line tenant-scope/require-tenant-scope -- 按主键更新自己刚认领的那一行
  await prisma.outboxMessage.update({
    where: { id: message.id },
    data: {
      status: "pending",
      locked_at: null,
      last_error: error,
      next_attempt_at: nextAttemptAt(message.attempts, now),
    },
  });
  return "pending";
}

/**
 * 没人认领这个 topic 时把消息放回去，**并且不白扣一次尝试**。
 *
 * 模块被临时关掉、或部署顺序让 handler 晚注册了一会儿，都属于这种情况。
 * 当成失败扣次数的话，一次滚动重启就能把在途消息推进死信。
 */
export async function releaseUnhandledMessage(
  message: Pick<ClaimedOutboxMessage, "id" | "attempts" | "topic">,
  now = new Date(),
): Promise<void> {
  // eslint-disable-next-line tenant-scope/require-tenant-scope -- 按主键更新自己刚认领的那一行
  await prisma.outboxMessage.update({
    where: { id: message.id },
    data: {
      status: "pending",
      locked_at: null,
      attempts: Math.max(message.attempts - 1, 0),
      last_error: `no handler registered for topic ${message.topic}`,
      next_attempt_at: nextAttemptAt(message.attempts, now),
    },
  });
}

export async function countOutboxByStatus(): Promise<
  Record<"pending" | "processing" | "dead", number>
> {
  // eslint-disable-next-line tenant-scope/require-tenant-scope -- 系统级队列的整体计数，跨租户即本意
  const rows = await prisma.outboxMessage.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const counts = { pending: 0, processing: 0, dead: 0 };
  for (const row of rows) {
    if (row.status in counts) {
      counts[row.status as keyof typeof counts] = row._count._all;
    }
  }
  return counts;
}

export { OUTBOX_MAX_ATTEMPTS };
