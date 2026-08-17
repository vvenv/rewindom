# events —— 事件雷达

> **Understand what's happening.**
> 跨来源发现事件 → 自动合并 → 重建时间线 → 关联证据 → 持续追踪。

**不是**「一个更好的热榜」。产品文案里刻意不出现「热榜」，用户看到的是 **Events**，
不是几个平台榜单的重新排列。

## 一期范围

本期交付主链路：**采集 → 聚类 → 事件详情（发生了什么 / 时间线 / 来源）→ Follow → 更新检测**。

明确**不在**本期：Related Events、Why it's trending、公开面（未登录可浏览的 What's happening）。
这三项都建立在同一套语料之上，加进来是增量，不需要动现有表结构。

## 为什么事件不按站点隔离

`EventFeed` / `EventSignal` / `NewsEvent` / `EventTimelineEntry` 在 `tenant-guard` 里登记为
`kind: "global"`，全平台共享一份；只有 `EventFollow` 带 `tenant_id`。

理由：「互联网正在发生什么」对所有站点是同一件事。按站点各存一份意味着同一个 RSS 被抓 N 次、
同一个事件被 AI 分析 N 次，成本乘以站点数，而结果完全一样。真正因人而异的只有
「谁关注了哪个事件、看到哪儿了」——那部分才是租户态。

> 副作用：service 层查询事件语料时**不带**租户谓词（也不该带）；查 `EventFollow` 时
> 必须显式 `withTenantScope`。`eslint-rules/tenant-models.json` 里只登记了 `eventFollow`，
> 越权兜底正是靠这条边界。

## 目录

```
shared/          事件域契约（状态、主题、来源分组、列表/详情 DTO）
server/
  events.routes.ts        只读面：列表 / 首页三区块 / 主题计数 / 详情
  follow/                 唯一的写入面（租户态）
  ingest/                 采集：connector、RSS 解析、调度任务
  event/                  领域：URL 规范化、分词聚类、热度、分析器、读服务
client/
  pages/                  events（探索+全量）、event-detail
  components/ hooks/ lib/ 四层拆分（frontend-page-structure）
  tenant/                 路由、导航、工作台卡片
```

## 流水线

```
connector.fetch()          外部平台 → RawSignal
      ↓
persistSignals()           canonical_url 规范化 + (connector, external_id) 幂等落库
      ↓
clusterSignals()           同 URL → 直接归属；否则同主题近 72h 内取相似度最高的事件
      ↓
refreshEvents()            热度 / 增速 / 阶段 / 计数 + 分析器产出摘要与时间线
```

每一步都是幂等的：信号有唯一键，事件有指纹唯一键，时间线整体重建。出问题可以直接重跑。

### 聚类能力边界（实测，别重复踩）

在一轮真实采集上量过：8 个源 / 232 条信号 / 231 个事件。合并率低**大部分是对的**——
HN 的 topstories 本来就是几十件互不相干的事。但词面聚类有一条明确的天花板：

| 两条标题 | 相似度 | 该不该合并 | 实际 |
| --- | --- | --- | --- |
| `Stripe Clinches $7B Deal to Buy OpenRouter` ⟷ `Stripe will acquire OpenRouter for $7B+` | 0.33 | 该 | ✗ 漏了 |
| `Write your first prompt with the GitHub Copilot app` ⟷ `A guide to slash commands in the GitHub Copilot app` | 0.33 | 不该 | ✓ 分开 |

**两者同分**，所以挪阈值不可能同时做对：调低会把第二对错并，调高第一对照样漏。

试过按词的稀有度加权（IDF，语料取候选窗口）——两对分别变成 0.29 与 0.29，**仍然同分**，
全语料新增合并 0 对。无收益，已撤掉，不留代码。

结论：跨过这道坎需要语义而非词面，那正是 LLM 分析器该做的事（MVP §11 把 Event Clustering
列为 AI 第一职责）。当前 `llm` 分析器只做摘要与时间线；把聚类裁决也交给它是明确的下一步。
这几个案例已经钉进 `title-tokens.test.ts` 的「真实语料案例」，改分词或阈值时先看它。

另外 `canonical_url` 精确合并这条路径在这轮采样里一次都没触发（0 组共享 URL）——
它只在「HN 链到某篇官方博客，而该博客的 RSS 也收了同一篇」时才生效，属于低频但零误判的兜底。

## AI 边界

分析器是可插拔的（`server/event/analyzer/`）：

| 实现 | 何时启用 | 行为 |
| --- | --- | --- |
| `heuristic` | 默认；没配 `OPENAI_API_KEY` 时 | 标题从候选里挑，摘要取**一手来源的原文摘录**，时间线由信号时间戳重建。永远不会说一句没有出处的话 |
| `llm` | 配了 key（或 `EVENTS_ANALYZER=llm`） | 提示词里写死了 MVP §11 的边界：不给建议、不做预测、不判断谁对、不引入来源外的事实 |

两条硬约束：

1. **时间戳不由模型给**。模型只为「已经存在的信号」配一句标签，`occurred_at` 一律取信号自身的时间——
   否则它会编造「11:08 开发者开始测试」这种看似合理、实则没有出处的格子。
2. **LLM 失败一律退回规则实现**（超时、限流、返回前言+JSON 都算失败），事件页不开天窗。
   实际用的实现记在 `NewsEvent.analyzer` 上，详情页会如实告诉用户这段摘要是谁写的。

`EVENTS_ANALYZER=heuristic` 可以在配了 key 的环境里强制走规则实现。

## 采集源

内置目录在 `server/ingest/feed-catalog.ts`，启动时 **只新建、不覆盖**——运维在库里禁用或改过的源
不会被下次启动重新打开。加源只需往 `EventFeed` 插一行，不必改代码。

一期两个 connector：

- `hackernews` —— 官方 Firebase 端点，无需凭据
- `rss` —— 通用 RSS/Atom，一个实现吃掉所有新闻站与官方 Blog

RSS 解析器是本模块自带的（`server/ingest/feed-parser.ts`）：仓库没有 XML 依赖，
为一个 connector 引入解析库要让整个 monorepo 承担其供应链成本，而 feed 的结构只有五个字段。

## 后台任务

`events-ingest` 注册在内核 `JobRegistry` 上，进程级（语料不分站点），
默认每 15 分钟一轮，启动后 20 秒跑第一轮。上一轮没结束时本轮直接跳过，不叠加。

**多实例部署**：每个实例都会跑。写入路径幂等，重复抓取只浪费带宽，不会产生重复事件；
真要收敛成单实例，用 `EVENTS_INGEST_ENABLED=false` 关掉其余实例即可。

## 环境变量

| 变量 | 默认 | 作用 |
| --- | --- | --- |
| `EVENTS_INGEST_ENABLED` | `true` | 关掉后不注册采集任务，只读已有语料 |
| `EVENTS_INGEST_INTERVAL_MINUTES` | `15` | 采集周期（5 ~ 1440） |
| `EVENTS_ANALYZER` | `auto` | `auto` / `heuristic` / `llm` |
| `OPENAI_API_KEY` | 空 | 内核已有；`auto` 模式下决定走不走 LLM |

## 权限

| key | 覆盖 |
| --- | --- |
| `events.read` | 所有读接口（列表、首页区块、主题、详情、关注状态） |
| `events.follow` | 关注 / 取关 / 标记已读 |

「标记已读」刻意不记审计——那是用户自己的阅读进度，不是需要向管理员交代的操作
（与 notification 的已读回执同口径）。

## 后续（不在本期）

- **把聚类裁决交给 LLM**：见上面「聚类能力边界」，这是收益最大的一步
- **Related Events**：`NewsEvent.tokens` 已经是现成的相似度输入，做法与聚类同源，只是阈值更低
- **Why it's trending**：分析器接口再加一个方法即可，需要严格区分 Confirmed 与 Discussion
- **公开面**：对标 shop 的 storefront（`server/ssr` + 官网段），让未登录访客直接浏览
