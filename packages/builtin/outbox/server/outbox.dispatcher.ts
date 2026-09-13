/**
 * 派发器：认领一批消息，交给按 topic 注册的 handler，按结果重排或转死信。
 *
 * 仓储操作全部经 `OutboxStore` 注入，于是这一层——也就是真正容易出错的那一层
 * （谁该重试、谁该进死信、handler 抛错会不会拖垮整批）——可以脱开数据库单测。
 */
import {
  claimOutboxBatch,
  completeOutboxMessage,
  failOutboxMessage,
  recoverStuckMessages,
  releaseUnhandledMessage,
  type ClaimedOutboxMessage,
} from "./outbox.service.js";

import type { JsonValue } from "@rewindom/shared";

export type OutboxHandler = (payload: JsonValue) => Promise<void>;

export interface OutboxStore {
  recoverStuck: typeof recoverStuckMessages;
  claim: typeof claimOutboxBatch;
  complete: typeof completeOutboxMessage;
  fail: typeof failOutboxMessage;
  releaseUnhandled: typeof releaseUnhandledMessage;
}

const defaultStore: OutboxStore = {
  recoverStuck: recoverStuckMessages,
  claim: claimOutboxBatch,
  complete: completeOutboxMessage,
  fail: failOutboxMessage,
  releaseUnhandled: releaseUnhandledMessage,
};

export interface DrainLogger {
  warn: (obj: object, msg: string) => void;
  error: (obj: object, msg: string) => void;
}

export interface DrainResult {
  claimed: number;
  completed: number;
  retried: number;
  dead: number;
  unhandled: number;
  recovered: number;
}

const handlers = new Map<string, OutboxHandler>();

/**
 * 登记某个 topic 的重投逻辑。
 *
 * 同 topic 只保留**先注册**的那个，与前端各注册表（`dashboardWidgets` 等）一致：
 * 重复注册几乎总是复制粘贴，静默顶掉先注册者会让排查变成猜谜。
 */
export function registerOutboxHandler(
  topic: string,
  handler: OutboxHandler,
): void {
  if (handlers.has(topic)) {
    return;
  }
  handlers.set(topic, handler);
}

export function getOutboxHandlerTopics(): string[] {
  return [...handlers.keys()];
}

/** 仅供测试：进程内注册表是模块级单例，用例之间必须能清干净。 */
export function resetOutboxHandlers(): void {
  handlers.clear();
}

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}


export interface DrainOptions {
  batchSize?: number;
  now?: Date;
  store?: OutboxStore;
  log?: DrainLogger;
}

/**
 * 跑一轮。单条消息失败不影响同批其它消息——整批一起回滚的话，一个坏 payload
 * 就能把队列堵死。
 */
export async function drainOutboxOnce(
  options: DrainOptions = {},
): Promise<DrainResult> {
  const { batchSize = 50, now = new Date(), store = defaultStore, log } = options;

  const recovered = await store.recoverStuck(now);
  const claimed = await store.claim(batchSize, now);

  const result: DrainResult = {
    claimed: claimed.length,
    completed: 0,
    retried: 0,
    dead: 0,
    unhandled: 0,
    recovered,
  };

  for (const message of claimed) {
    const handler = handlers.get(message.topic);

    if (!handler) {
      await store.releaseUnhandled(message, now);
      result.unhandled += 1;
      log?.warn(
        { topic: message.topic, messageId: message.id },
        "[outbox] 没有 handler 认领该 topic，已放回队列",
      );
      continue;
    }

    try {
      await handler(message.payload);
      await store.complete(message.id);
      result.completed += 1;
    } catch (err) {
      const outcome = await store.fail(message, toErrorMessage(err), now);
      if (outcome === "dead") {
        result.dead += 1;
        log?.error(
          { err, topic: message.topic, messageId: message.id },
          "[outbox] 重试耗尽，消息转死信",
        );
      } else {
        result.retried += 1;
        log?.warn(
          { err, topic: message.topic, messageId: message.id },
          "[outbox] 投递失败，已退避重排",
        );
      }
    }
  }

  return result;
}

export type { ClaimedOutboxMessage };
