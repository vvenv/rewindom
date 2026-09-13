import {
  drainOutboxOnce,
  registerOutboxHandler,
} from "./outbox.dispatcher.js";
import { enqueueOutboxMessage } from "./outbox.service.js";

import type { ServerAppModule } from "@rewindom/server-kernel/runtime/module-contract.js";

/** 每轮最多认领多少条。够大到能追上积压，又不至于一轮把连接池占满。 */
const DRAIN_BATCH_SIZE = 50;

/**
 * 30 秒一轮：退避梯度最短一档是 1 分钟，扫描周期比它短才不会把 1 分钟拖成 1 分半。
 * 空转一轮只是一条 `status + next_attempt_at` 索引上的查询。
 */
const DRAIN_INTERVAL_MS = 30_000;

export const outboxServerModule: ServerAppModule = {
  id: "outbox",
  version: "1.0.0",
  label: "Outbox",
  kind: "infrastructure",
  description:
    "领域事件的持久化投递箱：EventBus handler 失败后落库重试，耗尽转死信",
  server: {
    /**
     * 没有 `requires`，也没人 `requires` 本模块：消费方一律经 ProviderRegistry
     * 拿 `OutboxProvider`（同 mailer）。因此本模块必须在**消费方之前**注册，
     * 见 `apps/server/src/enabled-modules.ts` 的排序说明。
     */
    registerProviders: (registry) => {
      registry.setOutboxProvider({
        enqueue: (input) => enqueueOutboxMessage(input),
        onMessage: (topic, handler) => registerOutboxHandler(topic, handler),
      });
    },

    registerJobs: (ctx) => {
      ctx.registry.register({
        id: "outbox-drain",
        moduleId: "outbox",
        label: "Outbox redelivery",
        schedules: [
          {
            kind: "interval",
            every_ms: DRAIN_INTERVAL_MS,
            // 启动先跑一轮：进程多半就是在上一次投递失败之后重启的
            run_on_start: true,
            // 躲开迁移与缓存预热，别和启动期的连接争抢
            initial_delay_ms: 10_000,
          },
        ],
        run: () =>
          drainOutboxOnce({
            batchSize: DRAIN_BATCH_SIZE,
            log: ctx.app.log,
          }),
      });
    },
  },
};
