# outbox（投递箱）

横切基础设施：给**失败的领域事件投递**一条补偿路径。

`EventBus.emitLoose` 对 handler 抛错的处理是**吞掉**——这对发布方是对的（副作用不该
拖垮主事务），但对订阅者意味着一次数据库抖动就能让那件事永久消失，只在日志里留一行
warn。订阅者若做的是必须留下的事（写审计），就把 payload 交给这里。

## 不是什么

**不是 Orbiteus 那种「与业务同事务落库」的 outbox。** 那种形态要求发布方在自己的
`$transaction` 里写队列行，本仓现有的 `events.emit` 调用点几乎都在**事务提交之后**，
要逐个改造发布方，那是另一轮的事（见 `MODULE.spec.yaml` 的 `out_of_scope`）。

因此本模块覆盖的是「**handler 抛错**」与「**派发器中途崩溃**」，不覆盖
「业务已提交、进程在 emit 之前就崩了」。别把它当成端到端 exactly-once。

## 数据

一张 `OutboxMessage`。平时应当是**空的**——行数持续不为零，说明某个 handler 在持续
失败，那本身就是信号。

| 状态 | 含义 |
| --- | --- |
| `pending` | 等下一次重投（`next_attempt_at` 到点才认领） |
| `processing` | 已认领，正在跑。超过 `OUTBOX_STUCK_MS`（5 分钟）会被回收成 pending |
| `dead` | 重试梯度用尽，等人处理 |

**成功重投后行被删除**，不留 `done`：消息是别处已有记录（审计行、通知行）的副本，
留着只会让表无限长，还得再配一个保留期清理任务。留下的只有死信。

退避梯度 1m / 5m / 15m / 1h / 6h，与 `mailer` 的 `BACKOFF_MS` 共用一把尺子——
两处失败成因相同（对端抖动、配额、短暂不可达），节奏错开会让排障时对不上。

## 怎么用

消费方**不 import 本模块**，经 ProviderRegistry 拿 `OutboxProvider`（同 mailer）。
因此谁都不写 `requires: ["outbox"]`，本模块也不 `requires` 谁。

```ts
const outbox = ctx.registry.getOutboxProvider();

// 1. 登记重投逻辑：复用同一条写入路径，不另写一份
outbox?.onMessage("audit.log", async (payload) => {
  await AuditService.log(payload as unknown as AuditLogInput);
});

// 2. 失败时入队
ctx.events.on("audit.log", async (payload) => {
  try {
    await AuditService.log(payload as AuditLogInput);
  } catch (err) {
    if (!outbox) return; // 没装本模块：维持旧行为，别假装排上了队
    await outbox.enqueue({ topic: "audit.log", payload, last_error: String(err) });
  }
});
```

`topic` 与 `DomainEventMap` 的事件名同形。`dedupe_key` 可选，同 topic 下唯一；
不传等于不去重（审计就是这种：每条都是独立事实）。

## 注册顺序

本模块必须排在**消费方之前**（见 `apps/server/src/enabled-modules.ts`）：消费方在
`onBoot` 里取 provider，而 provider 是在注册阶段才装进 registry 的。排在后面的话
`getOutboxProvider()` 返回 null，代码不报错、行为静默退回「失败即丢」。

## 派发

`outbox-drain` job，30 秒一轮（梯度最短一档是 1 分钟，扫描周期比它短才不会把
1 分钟拖成 1 分半），`run_on_start` —— 进程多半就是在上一次投递失败之后重启的。
运行态在平台页的定时任务区可见。

单条消息失败不影响同批其它消息：整批一起回滚的话，一个坏 payload 就能把队列堵死。

没有 handler 认领的 topic 会被放回队列并**退还这次尝试次数**——模块临时关掉、或
部署顺序让 handler 晚注册了一会儿，都属于这种情况，当失败扣次数的话一次滚动重启
就能把在途消息推进死信。

## 租户作用域

`OutboxMessage` 在 tenant-guard 里登记为 `service_enforced`：派发器是系统级的，
必须跨租户扫描。注入租户谓词会让它只认当前上下文那一个租户，其余租户的消息永远
排在队里没人重投——而且毫无动静。

## 如何单独测试

```bash
pnpm --filter @rewindom/builtin exec vitest --run --project 'outbox/*'
```

派发器的仓储操作全部经 `OutboxStore` 注入，所以「谁该重试、谁该进死信、handler
抛错会不会拖垮整批」这些真正容易出错的判断可以脱开数据库单测。

## 禁止

- 不要把 `enqueue` 当成通用任务队列：它只接**已经失败过一次**的领域事件投递。
  常规异步任务用 `registerJobs`，用户可见的长任务用 `background-job`
- 不要在 handler 里做与原事件不同的事：重投必须走原来那条写入路径，否则重试出来的
  结果和当场成功时不一样，排障时没人分得清
- 不要给 handler 加自己的 try-catch 吞错：抛出来才会被退避重排，吞掉等于消息被删
- 不要指望它保证顺序：同 topic 的多条消息按 `next_attempt_at` 认领，失败者会排到后面
