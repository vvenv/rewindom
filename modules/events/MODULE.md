# events —— 事件雷达

> **Understand what's happening.**
> 跨来源发现事件 → 自动合并 → 重建时间线 → 关联证据 → 持续追踪。

**不是**「一个更好的热榜」。产品文案里刻意不出现「热榜」，用户看到的是 **Events**，
不是几个平台榜单的重新排列。

## 范围

已交付：

- **主链路**：采集 → 聚类 → 事件详情（发生了什么 / 时间线 / 来源）→ Follow → 更新检测
- **官网面**：两个贡献段 + `/events` 与 `/events/:slug` 两张模板页，未登录访客可直接浏览

明确**不在**当前范围：Related Events、Why it's trending。两者都建立在同一套语料之上，
加进来是增量，不需要动现有表结构。

### 不做翻译

事件**只显示来源原文**，不按访客语言翻译标题或摘要。

曾经做过：免费机器翻译（MyMemory）补译标题 + LLM 在写摘要的同一次调用里顺带产出双语，
文案按 locale map 存取。撤掉的原因是免费那条路的成品质量撑不起产品面——专有名词被译坏
（`Direct File` → 「直接文件」这类），而它恰恰是没有 LLM key 时唯一的译文来源。
与其留一套「有时对、有时明显错」的译文，不如只显示原文：原文永远是准确的，
也与「来源是事件的证据」这条产品口径一致。

界面文案（主题名、阶段名、时间线 code、段设置）仍然是完整多语言的——那是**代码 i18n**，
走 `client/locales/*.json`，与事件内容无关。

## 为什么事件按站点隔离

`EventFeed` / `EventSignal` / `NewsEvent` / `EventTimelineEntry` 都带 `tenant_id`，
与 `EventFollow` 一样走 tenant-guard。

各站点要配自己的采集源与规则，公开面也只展示本站语料。共享一份全平台语料
会让 A 站的源出现在 B 站官网上，也没法在工作台改摘要而不影响别人。

代价是同一条 RSS 可能被多个站点各抓一次——这是产品选择，不是疏忽。
采集任务按开通了事件雷达的站点循环；站点还没有任何源时写入内置目录，
之后由工作台 `/app/events/sources` 增删改，不再被目录覆盖。

## 目录

```
shared/          事件域契约 + 官网段定义 + 公开视图映射
  events-*-section.ts     官网段定义（events.feed / events.detail）
  events-page-templates.ts 模板页 kind + 预设
  public-view.ts          领域 DTO → 公开视图（两端共用）
  sections/*-html.ts      段 markup（SSR 与编辑器预览共用同一份）
  site-css/               CSS 真源 → site-css.generated.ts
server/
  events.routes.ts        列表 / 首页三区块 / 主题计数 / 详情 / 人工编辑
  feed/                   采集源 CRUD（本站）
  follow/                 关注（站点 + 用户态）
  ingest/                 采集：connector、RSS 解析、调度任务
  event/                  领域：URL 规范化、分词聚类、热度、分析器、读服务
  ssr/                    公开面：path handler、模板页渲染、公开读取
  sections/register.ts    段 / 上下文 provider / sitemap / 链接候选登记
client/
  pages/                  events（探索+全量）、event-detail、event-sources
  components/ hooks/ lib/ 四层拆分（frontend-page-structure）
  tenant/                 路由、导航、工作台卡片
  editor-context.ts       主题编辑器预览取数
```

## 官网面（公开访客）

| 贡献物 | 说明 |
| --- | --- |
| 段 `events.feed` | 「正在发生什么」列表，可摆在**任意**页面；可配取哪一批（升温/正在发生/今天）、主题、条数。「查看全部」打开 `/events?source=&topic=`，同一查询的完整列表 |
| 段 `events.detail` | 公开详情正文，`page_kinds` 限定只能落在事件详情模板页上 |
| 模板页 `events_index` | `/events` 枢纽（预设三段各摆一次）；带 `?source=` 时是该批次的查询列表，不再用三段版式 |
| 模板页 `events_detail` | `/events/:slug` |
| path handler | 接 `/events` 与 `/events/:slug`（`/en/...` 同一条，locale 已被剥掉）|
| sitemap / 链接候选 | 近 30 天事件进 sitemap；链接下拉只给 `/events` 一条 |

marketing 内核**一行没改**——定义全在贡献方 `shared/`，登记在 server `onBoot` 与
client manifest 各调一次。

### 三段同页的去重

默认版式把 Rising / Now / Today 摆在同一张页面上，而三段取数各自独立——一个又热又在
升温的事件会同时命中三段。去重**做在渲染层**（`feed-html.ts` 的 `takeUnseen`，按上下文
对象分桶的 WeakMap = 天然按请求隔离），不做在取数层：那样「只摆 Today 一段」的页面
会莫名少掉最热的那几条。效果是先来先得——单独摆一段拿到完整列表，三段同页时后面的自动让开。

## 流水线

```
connector.fetch()          外部平台 → RawSignal
      ↓
fillEmptyExcerpts()        摘录为空时抓目标页 og/meta description
      ↓
persistSignals()           canonical_url 规范化 + (connector, external_id) 幂等落库
      ↓
clusterSignals()           同 URL → 直接归属；否则同主题近 72h 内取相似度最高的事件
      ↓
refreshEvents()            热度 / 增速 / 阶段 / 计数 + 分析器产出摘要与时间线
```

每一步都是幂等的：信号有唯一键，事件有指纹唯一键，时间线整体重建。出问题可以直接重跑。

### 热度的权威：下降必须有基线

`velocity_pct` 比较的是近 6h 与再往前 6h。新事件的唯一一批信号滑出近窗、落入上一窗时，数学上是 -100%，但那不是「热度回落」——事件从来没有第二个可比较的窗口。这种情况下增速记 0，阶段仍是 active，界面不写「↓」。

只有两种情况才主张下降：

1. **两个窗口都有量**，近窗更弱——可观察的减速
2. **近窗已空、上一窗有量**，且事件在上一窗打开之前就存在——上一窗是对已有事件的观察，不是出生爆发跟着时间窗滑过去

阶段 `cooling` 的中文是「降温中」，不写「热度下降」：超过 24h 没动静也是这个阶段，那是生命周期，不一定经历过峰值。

### 信号的身份是 canonical_url，不是源给的 guid

`(connector, external_id)` 不够：BBC 的 RSS guid 是
`https://…/c77ggpgrp2do#0`，文章更新后同一篇会以 `#1` 再来一次。按 guid 去重时它们是
两条信号，于是**同一篇报道在事件时间线上占了两格、字字相同**（线上真实撞到过）。

真实身份是 `(connector, source_name, canonical_url)`——`canonicalizeUrl` 已经把锚点与
追踪参数剥掉了。数据库唯一约束 + `dedupeSignalsByIdentity` 两道都设了，并发实例也不会漏。

`source_name` 必须在键里：**不同来源指向同一篇原文要保留两条**，那正是跨源印证的证据，
事件聚类也靠 canonical_url 相等来合并（见上文流水线第 3 步）。同一来源发了两篇**不同**
文章报道同一件事仍是两格，标签会降级成「跟进报道」——那是真实进展，不是重复。

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
| `heuristic` | 默认；没配 `OPENAI_API_KEY` 时 | 标题从候选里挑，摘要取**一手来源的原文摘录**（RSS 正文、HN 自帖 `text`、目标页 og/meta description），时间线由信号时间戳重建。永远不会说一句没有出处的话 |
| `llm` | 配了 key（或 `EVENTS_ANALYZER=llm`） | 提示词里写死了 MVP §11 的边界：不给建议、不做预测、不判断谁对、不引入来源外的事实 |

两条硬约束：

1. **时间戳不由模型给**。模型只为「已经存在的信号」配一句标签，`occurred_at` 一律取信号自身的时间——
   否则它会编造「11:08 开发者开始测试」这种看似合理、实则没有出处的格子。
2. **LLM 失败一律退回规则实现**（超时、限流、返回前言+JSON 都算失败），事件页不开天窗。
   实际用的实现记在 `NewsEvent.analyzer` 上，详情页会如实告诉用户这段摘要是谁写的。

`EVENTS_ANALYZER=heuristic` 可以在配了 key 的环境里强制走规则实现。

## 采集源

内置目录在 `server/ingest/feed-catalog.ts`。站点还没有任何采集源时写入——
**只在空目录时新建**。工作台 `/app/events/sources` 可增删改、开关每个源
（名称、地址、类型、默认主题）。关掉不想要的默认源即可，删光后再被写成空目录
会在下一轮采集重新种入内置清单。

一期两个 connector：

- `hackernews` —— 官方 Firebase 端点，无需凭据
- `rss` —— 通用 RSS/Atom，一个实现吃掉所有新闻站与官方 Blog

RSS 解析器是本模块自带的（`server/ingest/feed-parser.ts`）：仓库没有 XML 依赖，
为一个 connector 引入解析库要让整个 monorepo 承担其供应链成本，而 feed 的结构只有五个字段。

HN 的链接帖本身没有正文。采集时若摘录仍空，会再请求目标页，只取 `og:description` /
`twitter:description` / `meta description` / 第一段 `<p>`——仍然是原文，不是生成。
HN 讨论页、PDF、图片不抓。单篇失败不影响整轮；旧的空摘录每轮最多补 40 条。

## 后台任务

`events-ingest` 注册在内核 `JobRegistry` 上，进程级调度、按站点执行
（每个开通事件雷达的站点抓自己的源），
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
| `events.read` | 所有读接口（列表、首页区块、主题、详情、关注状态、采集源列表） |
| `events.follow` | 关注 / 取关 / 标记已读 |
| `events.write` | 编辑事件标题/摘要/主题；增删改采集源 |

工作台改过的标题与摘要会打上 `manual_content`，采集刷新仍更新热度与时间线，
但不再覆盖这段文案。详情页会标明「由本站编辑修改」。

「标记已读」刻意不记审计——那是用户自己的阅读进度，不是需要向管理员交代的操作
（与 notification 的已读回执同口径）。

## 后续（不在本期）

- **把聚类裁决交给 LLM**：见上面「聚类能力边界」，这是收益最大的一步
- **中文源**：加 36氪 / 机器之心这类中文 RSS 会带来中文**事件**，但不会给英文事件配中文标题——
  分词器对中文走二元切分、对英文走词切分，中英标题 token 交集恒为 0，中文报道会成为
  **另一个独立事件**。要跨语言合并同一件事，得先有语义层
- **Related Events**：`NewsEvent.tokens` 已经是现成的相似度输入，做法与聚类同源，只是阈值更低
- **Why it's trending**：分析器接口再加一个方法即可，需要严格区分 Confirmed 与 Discussion
