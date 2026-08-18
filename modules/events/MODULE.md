# events —— 事件雷达

> **Understand what's happening.**
> 跨来源发现事件 → 自动合并 → 重建时间线 → 关联证据 → 持续追踪。

**不是**「一个更好的热榜」。产品文案里刻意不出现「热榜」，用户看到的是 **Events**，
不是几个平台榜单的重新排列。

## 范围

已交付：

- **主链路**：采集 → 聚类 → 事件详情（发生了什么 / 时间线 / 来源）→ Follow → 更新检测
- **官网面**：升温 / 正在发生 / 详情三段 + `/events` 与 `/events/:slug` 两张模板页（把 `/events` 设为首页后，访客 URL 收到 `/` 与 `/:slug`），未登录访客可直接浏览

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
  events-*-section.ts     段定义（events.rising / events.now / events.detail）
  events-page-templates.ts 模板页 kind + 预设
  nav-sources.ts          页头 / 页脚主题导航源
  public-view.ts          领域 DTO → 公开视图（两端共用）
  sections/*-html.ts      段 markup（SSR 与编辑器预览共用同一份）
  site-css/               CSS 真源 → site-css.generated.ts
server/
  events.routes.ts        列表 / 首页两区块 / 主题计数 / 详情 / 人工编辑
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
| 段 `events.rising` | 「正在升温」列表，可摆在任意页面。标题默认就是升温文案。「查看全部」打开 `/events?source=rising`（枢纽当首页时是 `/?source=rising`） |
| 段 `events.now` | 「正在发生」列表，可摆在任意页面。标题默认就是正在发生文案。「查看全部」打开 `/events?source=now`（枢纽当首页时是 `/?source=now`） |
| 段 `events.detail` | 公开详情正文，`page_kinds` 限定只能落在事件详情模板页上 |
| 模板页 `events_index` | `/events` 枢纽（预设 Rising + Now 各摆一次）；带 `?source=` 时是该批次的查询列表，不再用两段版式；带 `?topic=` 时两段都只显示该主题 |
| 首页版式 `events.home` | 套在站点首页（`/`）上，与枢纽同构。站点设置里选这项会套首页草稿并把公开 URL 收到 `/`、`/:slug` |
| 模板页 `events_detail` | `/events/:slug`（枢纽当首页时访客地址是 `/:slug`） |
| 段 `events.entity` | 实体页正文，`page_kinds` 限定只能落在实体模板页上 |
| 模板页 `events_entity` | `/events/entity/:slug`（枢纽当首页时访客地址是 `/entity/:slug`） |
| 导航源 `events` | 页头 / 页脚：默认 flat 铺成 AI / Tech / Gaming… 七条，点进 `/events?topic=`（当首页时 `/?topic=`）；`children` 则收成「事件」一条下挂七格 |
| 导航源 `events.topic` | 页头 / 页脚：某一个主题一条。编辑器从下拉选格子，不手填 |
| path handler | 接 `/events`、`/events/:slug` 与 `/events/entity/:slug`（`/en/...` 同一条，locale 已被剥掉）。选了事件雷达版式（或存量把 `/events` 设为首页）后：旧前缀 301 到 `/`、`/:slug`、`/entity/:slug`；`/` 由首页 CMS 渲染，`/?source=` / `/?topic=` 才接管列表；根上的详情在 CMS 未命中后再认，避免抢走已发布的 CMS 页 |
| sitemap / 链接候选 | 近 30 天事件、近 30 天还有事件的实体各进 sitemap；链接下拉只给 `/events` 一条（页身份，不随首页改） |

段 / 模板页 / 导航源仍登记在贡献方 `shared/`。首页版式走 marketing 的
`registerHomeLayout`（events 填表，内核不认识「雷达」这个概念）。

## 页头 / 页脚导航

`shared/nav-sources.ts` 往 marketing 登记两个导航源（`registerNavSource`，server
`onBoot` 与 client manifest 各调一次），租户不必再手填七条主题链接：

| source         | `children`                 | `flat`（默认）      |
| -------------- | -------------------------- | ------------------- |
| `events`       | 「事件」一条，下挂 7 个主题 | 七格各占一条        |
| `events.topic` | 该主题一条                 | 同左（叶子）        |

链接是 `/events?topic=ai` 这种枢纽地址（枢纽当首页时是 `/?topic=ai`），不是查询列表。枢纽按 topic 取数，「查看全部」
也会带上，不会掉回未过滤的 `?source=rising`。主题是编译期枚举，展开不查库；
页头只挂本源、页面上没有事件段时，context provider 不会为了导航去拉 feed。没开通
`events` 时这两项不进添加菜单，残留条目也不渲染。

### 两段同页的去重

默认版式把 Rising / Now 摆在同一张页面上，而两段取数各自独立——一个又热又在
升温的事件会同时命中两段。去重**做在渲染层**（`feed-html.ts` 的 `takeUnseen`，按上下文
对象分桶的 WeakMap = 天然按请求隔离），不做在取数层：那样「只摆 Now 一段」的页面
会莫名少掉最热的那几条。效果是先来先得——单独摆一段拿到完整列表，两段同页时后面的自动让开。

## 流水线

```
connector.fetch()          外部平台 → RawSignal
      ↓
fillEmptyExcerpts()        摘录为空时抓目标页 og/meta description
      ↓
persistSignals()           canonical_url 规范化 + (connector, external_id) 幂等落库
      ↓
clusterSignals()           同 URL → 直接归属；否则近 72h 内按词面 / 语义取最像的事件
      ↓
refreshEvents()            热度 / 增速 / 阶段 / 计数 + 分析器产出摘要与时间线
```

每一步都是幂等的：信号有唯一键，事件有指纹唯一键，时间线整体重建。出问题可以直接重跑。

### 热度的权威：增速必须有基线（正负都是）

`velocity_pct` 比较的是近 6h 与再往前 6h。**没有上一窗口就没有增速**——那不是 0% 也不是
400%，是「还说不出来」，落在 `has_velocity_baseline = false` 上。

只有两种情况才谈得上比率：

1. **两个窗口都有量**——可观察的加速或减速，哪怕事件还很新
2. **近窗已空、上一窗有量**，且事件在上一窗打开之前就存在——上一窗是对已有事件的观察，
   不是出生爆发跟着时间窗滑过去

阶段 `cooling` 的中文是「降温中」，不写「热度下降」：超过 24h 没动静也是这个阶段，那是生命周期，不一定经历过峰值。

#### 为什么 Rising 不排 velocity_pct（线上撞过）

曾经缺基线时取 `base = 1` 硬算一个百分比出来，于是

```
velocity_pct = ((recent - 0) / 1) * 100 = heat_score * 100
```

两个指标对「信号全落在同一个 6h 窗内」的事件**恒等**——而线上几乎所有事件都是这种。
后果是 Rising 排 `velocity_pct`、Now 排 `heat_score`，看着两把尺子，实际排出同一串：
`yestino.com/events` 上「正在升温」与「正在发生」是同一个排序的前 4 条与第 5~12 条，
16 张卡的增速全部落在 376%~516%（就是那条 HN 帖子的 engagement 权重 ×100）。

现在 Rising 排的是 **`recent_source_count`（近窗有几个不同来源在跟进）**，次级键是
`recent_signal_count`。跨源印证是可核对的事实，而且正好是「这件事在扩散」与
「这件事分数高」的真正区别——后者才是 Now 那把尺子。

卡片角标同源：`describeEventMomentum`（`shared/events.ts`，SSR 与 React 共用一份）
有基线时写「↑ 42%」，没基线但有 ≥2 个来源时写「3 个来源正在跟进」，其余留白。
单来源不叫扩散，那只是一条帖子。

> 副作用：`developing`（快速发展）会明显变少——它现在要求 `velocity_pct ≥ 50`，
> 也就是真的有两个窗口在加速。新事件默认落在 `active`。这是口径变准，不是回归。

### 主题是内容的属性，不是采集源的属性

`EventFeed.topic` / `EventSignal.topic` 只是**提示**（「这个源平时在报什么」）。
事件主题由 `topic-classifier.ts` 按整簇信号的文本判定，每轮重算；有 LLM key 时
分析器读得懂内容，它给的 topic 优先。工作台指定过的主题打 `manual_topic`，分类器不覆盖。

以前 topic 跟着第一条信号一路写死，两个后果：

1. **界面错标**——HN 默认 topic 是 tech，于是「投石机唯一已知死者」被标成「科技」。
2. **跨源合并被封死**——聚类候选曾经带 `topic: signal.topic`，而目录里 OpenAI/HF 是 ai、
   BBC 是 world、其余是 tech，「OpenAI 发公告 + TechCrunch 报道 + HN 讨论」永远聚不到一起。

所以聚类候选**不按 topic 过滤**，`buildFingerprint` 也**不带 topic 前缀**——带前缀时
同一件事被不同主题的源报道会算出 `ai:foo` 与 `tech:foo` 两个指纹，而那正是最该合并的一对。

分类法只有七格，语料里真实存在落不进任何一格的事件（那条投石机）。这种情况回落到
源提示，不硬凑——加主题枚举是产品决策，分类器不替它做。

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

结论：跨过这道坎需要语义而非词面。**已经做了**，见下一节。
这几个案例已经钉进 `title-tokens.test.ts` 的「真实语料案例」，改分词或阈值时先看它。

### 语义聚类（embedding）

判据是**或**关系，按成本排序：`canonical_url` 相等 → 词面 → 语义 → 另起一个事件。
词面那条一个字没改，它零成本、零网络依赖，且从未误判过；语义只接住词面够不着的。

阈值 `CLUSTER_SEMANTIC_THRESHOLD = 0.85`，在单站点真实语料上校准（72h 窗口 194 事件，
人工判读全部 ≥0.78 的事件对）：

| 余弦 | 事件对 | 该不该合并 |
| --- | --- | --- |
| 0.9580 | Uber/Zipline 无人机送餐 | ✓ |
| 0.9379 | Stripe 收购 OpenRouter | ✓ **词面同分 0.33，判不出来的那对** |
| 0.8930 | Amazon 销毁珍本书训练 AI | ✓ |
| 0.8597 | Hayden Panettiere 去世 | ✓ **一条把名字拼错成 Panetierre，词面永远合不了** |
| 0.8537 | 印尼地震救援 | ✓ |
| 0.8523 | GitHub 故障 | ✓ |
| — 0.85 — | | |
| 0.8447 | GitHub Copilot 两篇教程 | ✗ 上一节那个反例 |
| 0.8366 | 两条无关的 HN AI 讨论 | ✗ |

分离区间是 `[0.8366, 0.8523]`，0.85 落在里面：6 对正确合并、0 对误合并。
**误合并比漏合并有害得多**——把两件事说成一件会直接毁掉事件页的可信度，漏合并只是多一张卡片。
所以阈值取在区间偏上。改这个数之前先重跑校准，别凭感觉调。

事件向量是成员信号向量的**均值**（按 `signal_count` 增量更新），不是立事件那条信号的向量：
后者会让事件永远停留在第一次措辞上，越贴近事件全貌的跟进报道反而越难并进来。

**没配 `OPENAI_EMBEDDING_*` 时行为与没有这一层完全一致**：`embedTexts` 返回空数组，
余弦对空向量返回 0（= 不相似），聚类退回纯词面。这条必须成立——否则没配 key 的环境
会把所有事件合成一个。

不上 pgvector 是刻意的：候选窗口实测每站点不到 200 个事件，ANN 索引要到 10⁴ 量级才有意义；
而换 `pgvector/pgvector:pg16` 会把 Postgres 从 alpine(musl) 换到 Debian(glibc)，
**collation 提供者一变，既有文本索引都要全量 REINDEX 才安全**。存 `Float[]` 在进程内算精确
余弦：零基建变更、零 collation 风险，而且是精确解不是近似解。候选窗口稳定超过 10⁴ 时再回来。

供应商会间歇性超时（实测单条请求约有两成会失败），所以 `embedTexts` 每批重试 3 次；
仍失败则该批退回空向量，其余批次照常——一次限流不该让整轮采集失去语义判据，
更不该让采集本身失败。

另外 `canonical_url` 精确合并这条路径在这轮采样里一次都没触发（0 组共享 URL）——
它只在「HN 链到某篇官方博客，而该博客的 RSS 也收了同一篇」时才生效，属于低频但零误判的兜底。

### 事件修订史：自你上次看之后发生了什么

`EventRevision` **只追加，永不更新**。它是观察记录，当前状态在 `NewsEvent` 上。

以前 `EventFollow.last_seen_at` 只能推出一个布尔（有更新 / 没更新）。现在能说清楚：
官方发了公告、又有 3 家来源跟进、阶段从 developing 变成 active、摘要因新证据被改写。

四类：`source_joined` / `status_changed` / `summary_rewritten` / `title_changed`。
`source_joined` 最有价值——它把「跨源印证」变成了带时刻的事实，`after.lag_ms` 记着
该来源相对事件首条信号的滞后，详情页可以直接写「Acme Blog 最先发布，TechCrunch 2h17m 后跟进」，
渲染时不必回查信号表。

三条硬约束：

1. **`occurred_at` 取可核对的时刻**。来源加入取该来源第一条信号的发布时间，其余取本轮刷新时刻。
   绝不编造时间戳——与分析器同一条约束。
2. **文案变化按规范化文本比对，不看 `analyzed_at`**。heuristic 每轮都重算且绝大多数时候
   产出同一串字符，按 `analyzed_at` 判断会把每 15 分钟记一次「摘要被改写」。
3. **写入幂等**。唯一键 `(event_id, kind, occurred_at)` + `skipDuplicates`：
   `refreshEvents` 可以放心重跑。

**为什么竞品给不出这个**：Techmeme / Google News 每轮重新聚类，没有连续观察记录，
事后补算不出来。这是本模块唯一越跑越值钱的数据——只能靠持续观察积累，新入场者复制不了。

### 时间线是增量的，不是每轮重建

按 `(event_id, signal_id)` upsert，再删掉不在本轮信号集合里的格子。

以前每轮 `deleteMany` + `createMany`：heuristic 下 `shouldReanalyze` 恒为 true，
叠加最多 200 条降温扫描 = 每 15 分钟每租户约 400 删 + 400 插，内容还一模一样。
更要命的是 `id` 每轮都变，格子无法锚定、无法引用，也就无法回答「这一格是新出现的吗」。

因此 `AnalyzedTimelineEntry.signal_id` **不可为空**：格子的身份就是信号。

### 实体图

事件的信号里抽出实体（公司 / 产品 / 人物 / 地点），落 `EventEntity` + `EventEntityLink`。
身份键是 `(tenant_id, kind, normalized)`，normalized 只做大小写、空白与所有格归一，
**不做别名合并**——把 `Meta` 与 `Facebook` 合并需要外部知识，猜错比不合并更糟。

价值不在聚类（见下），在**订阅与聚合**：事件是易逝的，实体不是。关注「OpenAI」
比关注一个 24h 后就凉的事件留存高一个量级；实体也是稳定的聚合面，而事件页只有一次索引机会。

抽取沿用分析器那套可插拔口径。规则实现**刻意保守**，三道闸：

1. **Title Case 标题整条弃权**。很多来源把每个实词都大写，此时大写不携带任何信息。
   实测：不加这道闸，真实语料上的假阳性约占一半（「Buy Your Friends Batteries」
   「Won't Clear Up」这类整段短语）。加上后 120 条标题的覆盖率从 84% 降到 36%，
   但留下的基本都是真实体。**精度换召回是刻意的**——错的实体会把事件挂到不相干的
   聚合面上，而用户没有办法核对。
2. **句首单词要等印证**。英文标题句首恒大写，单看一条分不出 `Stripe will acquire…`
   （真实体）与 `Models Are Getting Dumber`（普通名词）。只有当它在同一簇的别处以
   非句首身份出现过才放行——还是跨来源印证那条原则。
3. **不猜类型**。规则实现分不出公司 / 产品 / 人物，一律记 `org`；类型由 LLM 路径给。

有 key 时 LLM 在**同一次分析调用**里顺带产出实体，不新增模型调用。

已知能力边界（别当 bug 修）：实词几乎全是专名的短标题（`Report from The New York Times`）
在版式上与 Title Case 无法区分，会被一起弃权。放宽阈值能救它，但实测会把上面那些
整段短语一起放回来。

#### Related Events

与聚类同源、只是阈值更低：聚类回答「**这是不是同一件事**」（0.85），
相关回答「**这两件事有没有关系**」（0.75）。输入是同一个 `NewsEvent.centroid`。

阈值同样在真实语料上量过（单站点 400 个带向量的事件，人工判读 0.70~0.85 两段）：

| 余弦 | 事件对 | 相关？ |
| --- | --- | --- |
| 0.8465 | WHO 与瑞士签署合作 ⟷ WHO 与荷兰深化伙伴关系 | ✓ |
| 0.8417 | Llamafile v0.8.14 发布 ⟷ Llamafile 四个月进展 | ✓ |
| 0.8411 | Chrome 刷新 Speedometer ⟷ Core Web Vitals 节省的等待时间 | ✓ |
| — 0.75 — | | |
| 0.7496 | Firefox 加固 ⟷ Llamafile 发版（只是都属于开源工具） | ✗ |
| 0.7494 | Cloudflare 办公方式 ⟷ AlphaEvolve（不同公司不同主题） | ✗ |

**必须预计算**（`NewsEvent.related_event_ids`）。读路径上算的话，每次打开详情页都要
载入候选事件的全部向量：400 个事件 × 1536 维 float8 ≈ 4.9MB/请求，公开面 SSR 承受不起。

计算放在采集之后**单独一趟**，不并进 `refreshEvents`——候选向量要整批载入一次，
塞进按事件的循环会把同一份几 MB 的数据重复读几十遍。

候选窗口 30 天，比聚类的 72h 宽得多：相关本来就该跨越更长的时间跨度
（「Llamafile 四个月进展」与「v0.8.14 发布」正是隔了几个月）。

两条刻意不做的：**不保证双向一致**（A 的 top5 里有 B，不要求 B 的 top5 里有 A——
强求对称要么多存一份反向表，要么让 top5 名不副实）；**同分按 id 排**保证幂等，
否则每轮采集都会把列表洗一遍而内容毫无变化。

#### 实体页 `/events/entity/:slug`

路径默认挂在 `/events` 下而不是新开一个根路径：事件与实体是同一个域，共用前缀让 sitemap、
面包屑与 path handler 都只有一处。把 `/events` 设为首页后访客地址收到 `/entity/:slug`，
旧 `/events/entity/:slug` 301 过来。**事件 slug 永远是一段，实体路径恒为两段且首段是
`entity`**，两者不会撞；三段以上不接，交回给普通页面查找。已发布的 CMS 页优先于
根上的事件 / 实体路径。

页面是「模板页 + 段」的组合，与详情页同构：租户可以在编辑器里改版式。实体与其事件由
path handler 直接带进 `EventsRenderContext.entity`，**不走 contributed provider**——
只有 path handler 知道当前是哪个实体。

卡片沿用 `.events-card`，并**保留势头角标**：实体页上「哪几件事正在扩散」和首页上一样重要，
少画一个角标不会让页面更干净，只会让它更没有信息。

sitemap 只收**最近 30 天还有事件**的实体（不是按实体自身更新时间）。实体页比事件页更值得
索引——事件 24h 后就凉，实体不会——但也正因为它长期存在，更要挡住「三年前提过一次就
永远进 sitemap」的长尾。

#### 实体不能用来兜底聚类（实测，别再试）

曾经预期共享实体能救回线上那组被拆成 4 个的 GitHub 故障。**在真实语料上量过，结论是反的**：

| 余弦 | 共享实体 | 该不该合并 |
| --- | --- | --- |
| 0.8523 | 无 | ✓ GitHub 故障（HN 转述） |
| 0.8125 | 无 | ✓ GitHub 故障（HN 追问） |
| 0.7564 | 无 | ✓ GitHub 故障（原始报告） |
| 0.8447 | `github copilot` | ✗ Copilot 两篇教程 |

该合并的三对**共享 0 个实体**（保守抽取把它们的 `GitHub` 都扣掉了），
唯一共享实体的那对恰恰是不该合并的。任何「共享实体 + 语义阈值」的组合都是
**救回 0 对、误并 1 对**。规则与目标恰好反向，不是调参能解决的。

所以聚类判据仍然只有三条：`canonical_url` 相等 → 词面 → 语义。**没有实体兜底这一条**。

### 关注实体：留存的支点

关注事件与关注实体是同一件事的两个维度，**共用 `events.follow` 权限**——
为一个维度多开一个权限键，只会让管理员多勾一个框。

区别在**时间尺度**：事件 24h 后就凉，关注它第三天就没意义了；实体不会凉——
关注「OpenAI」之后只要它再出现在任何事件里就有东西可推。

三条口径：

1. 刚关注时 `last_seen_at` 设成当下（与关注事件同理由：不然一关注就看到「有更新」）。
2. **「新」按 `EventEntityLink.created_at` 判，不按事件的 `last_activity_at`**——
   后者会让一个早就读过的老事件因为来了条新信号又冒出来算「新」。
   那不是「这个实体有了新动静」，是「一件旧事又抖了一下」。
3. 计数与关注事件那条**合成一个数字**：用户关心的是「有多少东西要看」，
   不是「事件 3 条、实体 2 条」。实体侧按事件去过重（同一事件挂两个被关注实体只算一次）。

事件与实体的状态形状**刻意不同**：事件是 `has_update`（布尔），实体是 `new_event_count`（数量）。
实体是持续订阅面，「新增了 3 件事」比「有更新」有用得多。

### Why it's trending

最容易做砸的一个功能：它天然诱导人去**解释**、去推断动机，而 MVP §11 写得很死——
不给建议、不做预测、不判断谁对、不引入来源外的事实。

所以它**只陈述可核对的事实**，产出的是 **i18n code + 参数，不是自由文案**。
理由和「时间线不由模型给时间戳」完全一样：一旦允许自由文案，就会出现
「因为开发者社区普遍担忧」这种看似合理、实则没有出处的句子。

纯函数，**不落库、不调模型**：它是「信号集合」的函数，算出来就行。

`confirmed` / `discussion` 必须分开标，**这条区分就是这个功能存在的理由**：

- `confirmed` —— 有一手来源，或 ≥2 个不同来源印证
- `discussion` —— 只有社区来源。**哪怕十条 HN 帖子也仍然只是讨论**

单条社区信号也要给「仅讨论」的警示。曾经把它压掉（理由是「一条信号没什么可讲」），
但真实语料上量过：整个语料里**没有一个**纯社区来源的多信号事件——HN 帖子之间极少
聚到一起——压掉单条就等于这条警示永远不出现，而线上首页 16 张卡有 13 张正是单来源 HN。
最该提醒的地方反而没提醒。改回来之后全库 400 个事件的分布是
confirmed 187 / discussion 106 / 留白 107。

留白的是「单独一篇新闻稿」这类：没有一手来源、没有跨源、近窗也没动静，确实没什么可讲。

## AI 边界

分析器是可插拔的（`server/event/analyzer/`）：

| 实现 | 何时启用 | 行为 |
| --- | --- | --- |
| `heuristic` | 默认；该站点解析后没有 API Key 时 | 标题从候选里挑，摘要取**一手来源的原文摘录**（RSS 正文、HN 自帖 `text`、目标页 og/meta description），时间线由信号时间戳重建，主题与实体走规则判定。永远不会说一句没有出处的话 |
| `llm` | 该站点有 key（本站 BYOK 或平台 fallback；或 `EVENTS_ANALYZER=llm`） | 提示词里写死了 MVP §11 的边界：不给建议、不做预测、不判断谁对、不引入来源外的事实 |

两条硬约束：

1. **时间戳不由模型给**。模型只为「已经存在的信号」配一句标签，`occurred_at` 一律取信号自身的时间——
   否则它会编造「11:08 开发者开始测试」这种看似合理、实则没有出处的格子。
2. **LLM 失败一律退回规则实现**（超时、限流、返回前言+JSON 都算失败），事件页不开天窗。
   实际用的实现记在 `NewsEvent.analyzer` 上，详情页会如实告诉用户这段摘要是谁写的。

`EVENTS_ANALYZER=heuristic` 可以在配了 key 的环境里强制走规则实现。

### 分析器只在信号变过时跑（否则一轮跑不完）

`shouldReanalyze` 判的是**信号集合变没变**（比对 `NewsEvent.signal_count` 与本轮载入的条数），
不是「距上次分析过了多久」。

曾经按时间判：heuristic 恒为 true、llm 只看 30 分钟冷却。而降温扫描每轮捞最多 200 个
**空闲 ≥6h** 的事件——按定义没有新信号——于是每轮几百次无谓分析，llm 下就是几百次模型调用。
实测 10 个事件跑不完 2 分钟，而采集周期是 15 分钟：一轮跑不完就被 `running` 标志跳过，
热度与阶段反而长期不更新，正好废掉降温扫描存在的理由；生产上还是一条持续的钱漏。

改完实测：60 个无新信号的事件 10.9 秒（181ms/个，零模型调用）。

三条要点：

1. **顺序不能反**——先看信号变没变，再看 LLM 冷却。反过来等于没改。
2. 不用「最新信号的 `published_at` > `analyzed_at`」做判据：`published_at` 是**来源的发布时间**，
   一条三小时前发布的 RSS 条目现在才抓到，比时间会漏掉它。条数比对不会。
3. 跳过分析时**热度 / 增速 / 阶段 / 计数照常重算**——那才是降温扫描的目的；
   时间线与实体照常不动（分析器产物，没重算就不该覆盖）。

`analyzed_at = null` 仍然强制重分析：摘录补齐那条路径就是靠置空来要求重来的。

事件刷新按 4 路有界并发。不设更高是因为瓶颈在模型侧：撞限流会**静默退回规则实现**——
事件页不开天窗，但摘要质量会悄悄变差。宁可慢一点，也不要用一堆退化的摘要把周期填满。

## 采集源

内置目录在 `server/ingest/feed-catalog.ts`，36 个源，每个 topic 至少 3 个。

种植按**目录项的 key**（`connector:url`）记账，记录存在 `TenantSetting`
的 `events.seeded_feed_keys` 上：每轮采集前把该站点从没种过的补进去。

以前的口径是「只在空目录时新建」，后果是**扩充目录对所有存量站点完全无效**
——线上那个站早就有源了，新增目录项永远到不了它。按 key 记账后两件事同时成立：

1. 目录新增的源能补给存量站点；
2. 站点删掉 / 关掉的源不会被塞回来（它的 key 已经在记录里）。

存量站点没有这条记录，此时把它**当前已有的源全部视为「种过」**再补差集——
否则会把它早就删掉的初版默认源全部复活。这是一次性升级，写在 `feed-seed.ts` 里，
不需要 migration。

工作台 `/app/events/sources` 可增删改、开关每个源（名称、地址、类型、默认主题）。

> 目录里每个 URL 都实际请求验证过。`GitHub Blog` 与 `Hugging Face` 在部分网络环境下
> 会 `terminated`（连接被中断，不是 404，既有目录里就有这个现象）；单个源失败不影响
> 整轮采集，错误记在 `EventFeed.last_error` 上。

一期两个 connector：

- `hackernews` —— 官方 Firebase 端点，无需凭据
- `rss` —— 通用 RSS/Atom，一个实现吃掉所有新闻站与官方 Blog

RSS 解析器是本模块自带的（`server/ingest/feed-parser.ts`）：仓库没有 XML 依赖，
为一个 connector 引入解析库要让整个 monorepo 承担其供应链成本，而 feed 的结构只有五个字段。

HN 的链接帖本身没有正文。采集时若摘录仍空，会再请求目标页，只取 `og:description` /
`twitter:description` / `meta description` / 第一段 `<p>`——仍然是原文，不是生成。
HN 讨论页、PDF、图片不抓。单篇失败不影响整轮；旧的空摘录每轮最多补 40 条。

## 对外发布 RSS

这个产品一直在**消费** RSS，现在也产出 RSS。订阅是**留存的第三条腿**：

| 方式 | 需要账号？ | 时间尺度 |
| --- | --- | --- |
| 关注事件 | 要 | 24h 后就凉 |
| 关注实体 | 要 | 长期 |
| **订阅 RSS** | **不要** | 长期 |

前两条都要求先注册，而 RSS 恰恰是技术读者最可能采用的那条。三个入口：

```
/events/feed.xml                    这个站在报什么
/events/feed.xml?topic=ai           只看某个主题
/events/entity/<slug>/feed.xml      只看某个公司 / 产品
```

`/en/...` 前缀同样接（内容不翻译，前缀只影响 channel 文案与站内链接）。

**为什么不走 path handler**：`SitePathHandler.render` 只回 HTML，没有 content-type 控制，
feed 会被当成 `text/html` 发出去。所以挂模块自己的 Fastify 路由（与 shop 店面路由同构），
在里面自行解析 host 租户。marketing 的 `sitemap.xml` 是内核路由——业务模块**不改内核**去蹭它。

`parseEventsPublicPath` 明确让开 `/feed.xml`：那条静态路由在 find-my-way 里本来就优先于
marketing 的 `/*`，但一旦注册顺序变了，`/events/feed.xml` 会被当成 slug 为 `feed.xml`
的事件详情，**静默变成 404**。

四条细节：

- **XML 转义自己写一份**，不复用 `escapeHtml`：HTML 转义不处理 XML 里非法的控制字符，
  而标题来自外部来源，一个 `0x08` 就能让整个 feed 在阅读器里**静默**解析失败。
- `guid` 用详情页绝对地址并标 `isPermaLink`：slug 一旦生成就不变，是稳定的订阅身份。
- `pubDate` 用 `last_activity_at` 而非 `first_seen_at`——订阅者要的是「又有新进展」。
- 频道标题用**站点名**而不是租户 slug：那一行是订阅者在阅读器侧边栏里永久看到的东西，
  写成 `default` 会像坏了。多一次读换一个体面的标题，而 feed 本来就有一小时公共缓存。

未开通事件雷达的站点一律 404，与 path handler 的 entitlement 闸门同口径。
订阅入口是**段设置**（默认开），租户可以关掉。

> `<link rel="alternate">` 自动发现**没做**：marketing 没有 head 贡献点，
> 加一个要动内核。阅读器仍可直接粘贴上面的地址订阅。

## 保留期清理

在这之前全模块**没有任何回收路径**：采集每 15 分钟按站点追加信号，永不删除。

`events-retention` 任务按天跑，与采集分开注册（两者周期差两个数量级，塞进同一个任务
会让清理被采集的失败与跳过牵连）。顺序是固定的，反过来会留下悬挂的时间线与修订：

1. 删过期信号（默认 90 天）
2. 对受影响的事件跑 `refreshEvents` —— 信号被清空的走「删空壳」分支
3. 删超期（默认 180 天）且已经没有信号的事件

**被关注过的事件一律豁免，无论多旧**，它的信号也不删（只删事件不删信号会让详情页
变成空壳）。这是产品约束，不是性能取舍：用户按关注键收藏的东西不该被后台任务收走。

分批删（每批 1000 行）：一条语句删几十万行会把 WAL 撑爆，也会长时间持锁挡住采集写入。
时间线与修订靠 `onDelete: Cascade` 跟着事件走；`EventSignal` 是 `SetNull`，必须显式删。

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
| `EVENTS_SIGNAL_RETENTION_DAYS` | `90` | 信号保留期（7 ~ 3650） |
| `EVENTS_EVENT_RETENTION_DAYS` | `180` | 事件保留期（7 ~ 3650） |
| `OPENAI_API_KEY` | 空 | 内核已有；平台 fallback。`auto` 模式下与本站 BYOK 一起决定走不走 LLM。站点自己的 key 在工作台 `/app/settings` 配 |
| `OPENAI_EMBEDDING_BASE_URL` | 空 | 向量模型接入（OpenAI 兼容 `/embeddings`）。与对话模型**分开配**：`OPENAI_BASE_URL` 现在指向 deepseek，而 deepseek 没有 embeddings 端点 |
| `OPENAI_EMBEDDING_API_KEY` | 空 | 不配 = 聚类退回纯词面判据，功能不缺失，只是合并率低 |
| `OPENAI_EMBEDDING_MODEL` | 空 | 如 `embedding-3` |
| `OPENAI_EMBEDDING_DIMENSIONS` | `0` | 0 = 用模型默认维度；供应商支持降维时传给接口 |

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

- **Related Events**：`NewsEvent.centroid` 已经是现成的相似度输入，做法与聚类同源，
  只是阈值更低。数据层不用再动
- **中文源**：语义层已经就位，跨语言合并技术上成立了，但阈值要在中英混合语料上**单独校准**
  ——不能沿用 0.85。这是独立决策，不是顺手加几个 RSS
- **Why it's trending**：分析器接口再加一个方法即可，需要严格区分 Confirmed 与 Discussion
- **关注实体**：留存的真正支点（事件 24h 后就凉，实体不会），要新表 + 通知，独立一期
- **实体索引页 `/events/entity`**：先有单页，聚合页看有没有人要
- **工作台的实体管理**：合并 / 改名 / 删除。别名合并要人来定，不能猜
- **那组 GitHub 故障仍然合不了**：词面共享不足 2 个词，语义 0.75~0.85 够不到阈值，
  实体兜底已实测证伪（见上文）。它需要的是「同一实体 + 同一时间窗 + 同一事件类型（故障）」
  这种事件类型判定，属于分析器的新职责，不是聚类参数问题
- **pgvector**：候选窗口稳定超过 10⁴ 时再上，见上文「语义聚类」里的取舍
