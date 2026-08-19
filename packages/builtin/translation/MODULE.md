# translation —— 内容翻译

> 访客侧的**查看辅助**，不是产品资产。

给公开站的正文加一个「翻译此页」：点了才翻、只翻当前这次浏览、译文不入库、
爬虫看到的永远是原文。原文始终是准确的那一份，一键可以退回去。

## 定位（先读这一段）

events 的 `MODULE.md` 里曾有一节「不做翻译」，理由是**免费机翻的质量撑不起
产品面**——`Direct File` 被译成「直接文件」，而专有名词恰恰是事件标题里信息
密度最高的部分。那次的实现把译文当资产：写进 `NewsEvent.title_i18n`、进 SSR、
进索引，于是一条译坏的标题会永久地代表这个事件，读者还看不出来。

这个模块换了口径，三条一起成立才敢重开：

| 上一次 | 这一次 |
| --- | --- |
| 译文落库、进 SSR / 索引 | 只在浏览器内存 + `sessionStorage`，SSR 与 sitemap 一个字不变 |
| 默认 MyMemory | 默认**浏览器内置**翻译（Chrome 138+ 本地 NMT 模型），MyMemory 降为兜底 |
| 无术语保护 | `shared/term-guard.ts` 遮罩产品名 / 版本号 / 代码符号 / URL；**占位符没被引擎透传就保留原文** |

第三条是关键：宁可这一句不译，也不给读者一条把产品名译错、而他察觉不到的句子。

## 范围

- 公开站（SSR 页面）：语言菜单里的翻译入口 + 正文顶部的状态条，按需翻正文
- 工作台：`/app/settings` 里的一张设置面板（引擎、密钥、术语表）

明确**不做**：批量回填、译文表、重译任务、按语言的静态页、翻译后的 SEO。
这些都属于「译文是资产」那条路线，与本模块的定位互斥。

## 引擎：判据只有「要不要 API key」

| 引擎 | 路径 | 说明 |
| --- | --- | --- |
| `browser`（默认） | 纯客户端，零网络 | Chrome 138+ `Translator` API。免费、无配额、无 key、离线、访客读什么不外发 |
| `libretranslate` | 浏览器直连 | 自建实例免 key。公共实例限流紧 |
| `mymemory` | 浏览器直连 | 免费，配额按访客 IP 分摊。质量最弱，仅兜底 |
| `deepl` / `google` / `llm` / `custom` | 服务端代理 | key 一旦进浏览器就等于公开，只能由服务端持有并转发 |

分类写在 `shared/translation.ts` 的 `engineNeedsProxy()`，**这是唯一判据**，
不要在客户端或路由里另立一套。

## 目录

```
shared/
  translation.ts     引擎枚举、配置契约、engineNeedsProxy（唯一判据）
  term-guard.ts      术语遮罩 / 还原 / 透传检测
  messages.ts        控件文案（按站点语言）+ 「正文是否已是目标语言」启发式
server/
  translation-settings.ts   TenantSetting 存取，key 走 tenant-secret-crypto
  translation.routes.ts     /api/settings/translation（工作台）
  public-translation.routes.ts  /api/public/translation/{config,translate}
  engines.ts                DeepL / Google / LLM / 自定义 —— 只转发不落库
  rate-limit.ts             代理路由的进程内令牌桶
client/
  enhance/index.ts   ⭐ 公开站入口（**策略**：要不要提议、记不记得住、什么时候算成功）
  enhance/widget.ts  提议横幅 / 常驻入口 / 状态条三个面的 DOM + 注入式 CSS
  engines/           browser / libretranslate / mymemory / proxy 适配器
  lib/translator.ts  编排：缓存 → 遮罩 → 分批 → 还原 → 回写
  lib/translate-dom.ts  文本节点扫描 / 替换 / 还原 + `lang` 标注
  components/ hooks/ lib/  工作台设置面板（四层拆分）
```

## 扩展点

- **公开站**：`client/enhance/index.ts` 导出 `enhanceSite(ctx)`，由
  `marketing/shared/site-enhance/assemble.mjs` **扫目录**发现并打进
  `/api/public/site-enhance.js`。marketing 一行没改，依赖图上仍只有单向边。
- **工作台**：`client.tenantSettingsPanels` 注册表（契约在
  `client-kit/src/lib/module-contract.ts`，收集在 `apps/client/src/collect-modules.ts`）。
  用注册表而不是 `createComponentSlot`：后者是单组件的，第二个模块想加面板会覆盖第一个。

## 只翻内容，不翻界面

公开页上混着两类文本，必须分开：

| | 例子 | 处理 |
| --- | --- | --- |
| **界面** | 段标题「正在升温」、「查看全部事件」、状态角标 | 本来就是站点语言（代码 i18n / CMS 写好的），**不翻** |
| **内容** | `NewsEvent.title` / `summary`、时间线正文 | 来源原文，多为英文，**要翻** |

分法是**按节点判断语言**（`isAlreadyInTargetLanguage`）：已经是目标语言的节点直接跳过。
不用「让每个模块标记自己的内容 markup」，是因为标记法漏一处就是一处永远翻不到的
内容，而语言判断天然覆盖所有贡献方。

它同时是「要不要显示入口」的判据：判断只看**待翻的那部分**。拿整页算会被中文界面
文案带偏——CJK 占比一过线就认定「整页已经是中文」，可事件标题明明还是英文。

## ⚠️ 用户手势：改这块代码前必读

`Translator.create()` 在模型未下载时**要求处于用户手势的有效期内**，否则抛
`NotAllowedError: Requires a user gesture when availability is "downloading" or "downloadable"`。

所以点击处理里**第一件事**必须是同步的 `translator.prime()`，在任何 `await` 之前。
曾经的写法是「点击 → await 扫 DOM → await `LanguageDetector.create()` → 才
`Translator.create()`」，等到那时手势早过期了。它的表现极具迷惑性：异常被
`translator.ts` 吞成「这批保留原文」，按钮却照样翻成「显示原文」——**页面一个字没变，
控件说翻完了**。

由此立的两条规矩：

- 源语言在**挂控件之前**就定好（`guessSourceLanguage`），不要留到点击后再探测
- 状态**按实际改写的节点数**置（`changed > 0`），不许无条件报成功。一个字都没译出来
  就是 `failed`，显示「重试」

## 别的模块要接入，需要做什么

**通常什么都不用做。** enhance 扫的是 `main.site-main` 下的文本节点，任何模块的
公开段（events / shop / site-docs）自动覆盖。只有两种情况需要出手：

- 某段内容不该被翻（来源名、代码块、SKU）→ 加 `translate="no"` 或 `data-no-translate`
  （events 就是这么处理来源名与已本地化标签的）
- 工作台页面想要翻译能力 → 复用 `client/lib/translator.ts`，它不依赖 DOM

## 界面挂在哪：三个面，各司其职

翻译是**文档级动作**，不是站点级设置——它作用于这一篇正文，可用性逐页变化，状态每次
导航重置。页头里的东西恰好相反：跨页常驻、配置的是站点。把前者塞进后者是范畴错误，
症状就是那颗按钮既要短到能进图标行、又要长到能显示「正在准备翻译模型…42%」。

| 面 | 职责 | 挂在哪 |
| --- | --- | --- |
| 提议横幅 | 会话内**教一次**：这页有外文，可以翻 | `body` 上贴底的 fixed 覆盖层 |
| 常驻入口 | 永远够得着的开关 | `.locale-switcher-menu` 里一项 |
| 状态条 | 进度 / 失败 / 机器翻译声明 / 显示原文 | `main` 前的兄弟节点，吸顶 |

**入口进语言菜单**是这套划分的关键。翻译本就是「把这页变成我的语言」，读者要找它时
开的就是那个菜单；弹层里放多长文案都不挤任何东西；站长在 Theme Editor 里怎么摆语言块
它就跟到哪，窄屏语言块收进抽屉它也一起收。菜单不存在时（单语言站，`renderLocaleHtml`
在只有一种语言时返回空）回落成页头里一颗**定宽图标**，再没有页头才回落浮标——两个兜底
都只是入口，一个字的状态文案都不带，所以不会重演「按钮跟着状态忽宽忽窄挤掉品牌位」。

**状态条吸顶**（`--rw-translate-top` 按吸顶页头的实测高度设）：只要页面上还有译文，
「这是机器翻译」就得一直看得见。贴在 `main` 前面不吸顶的话，声明只在首屏有效，读者
往下滚就再也看不到自己读的不是原文。它同时是 `role="status" aria-live="polite"` 的
播报点——以前只改按钮 label，读屏器根本不会主动念「翻完了」。

### 位移的两条规矩

- **没请自来的 UI 不许推动正文**：要不要提议是 `await fetchConfig()` 之后才知道的，
  这时往 `main` 前面插一条 bar 就是整页下推一次——一次白给的 CLS，还正好发生在读者
  开始读的那一刻。所以提议横幅是 fixed 覆盖层，而且**贴底**：顶上两样东西都惹不起
  （页头吸顶时要让位，不吸顶时盖上去就是挡住导航），而正文最上面那一段恰恰最该看见。
- **读者点出来的可以**：状态条在流内，位移发生在用户手势 500ms 内，本来就不计入 CLS。

### 「不用了」按会话记

`sessionStorage['rw-translate-offer-off']`。提议的全部价值是教一次，同一次浏览里每翻
一页再弹一次就从帮忙变成骚扰；关掉之后能力并没有消失——它一直待在语言菜单里。这也是
纯横幅方案的死胡同：横幅关了就再没有入口，所以常驻入口是必需的，不是锦上添花。

## 改了字就要改 `lang`

`applyTranslations` 在写入译文的同时把父元素的 `lang` 设成目标语言，`restoreTranslations`
原样还原（本来没有这个属性的就移除）。`lang` 决定读屏器的发音与断词、也决定浏览器自带
翻译怎么判断这块内容——把英文换成中文却留着 `lang="en"`，读屏器会用英文音去念中文。

只在**整块都译了**时才标：`lang` 是继承的，一个 `<p>` 里半边译文半边原文时标上去，
等于给没译的那一半配了错的发音，比不标更糟。跨批次也成立——`TranslationMemory` 是累积的，
一个元素的文本节点被切进两批时，最后一批落地才第一次满足条件。

## 术语从哪来

三层，越靠前越优先：

| 来源 | 覆盖什么 | 配在哪 |
| --- | --- | --- |
| 内置规则 | 版本号、代码符号、URL、CamelCase、全大写缩写、连续大写词 | `shared/term-guard.ts`，写死 |
| **模块自动供给** | 各业务域的专有名词。events 供实体索引（`Cloudflare` / `NVIDIA` / `Amazon Bedrock`） | `TranslationTermsProvider`，见下 |
| 租户手填 | 前两层漏掉的 | 设置页「不翻译的术语」 |

合并时**租户手填的优先**，封顶 200 条后砍掉的是自动供的那批——术语表每多一条，
浏览器就多一个正则要在每段文本上跑。

### 别的模块怎么供词

实现内核的 `TranslationTermsProvider`，在 `registerProviders` 里
`registry.addTranslationTermsProvider(...)`。方向是**业务 → 基础设施**：翻译模块
不认识 `EventEntity`，也不该认识；反过来 events 也没有 `requires: translation`。

是可注册多个的列表而不是单个 provider：专有名词天然来自多个域（shop 的品牌名同理），
后注册的不该把先注册的顶掉。

**实现方必须自带缓存**——这是公开面每次加载都会走的路径，直接查库等于给每个访客的
每一页加一次聚合查询（events 侧是 10 分钟 TTL）。

## 已知短板

- 单个首字母大写的词不在**内置规则**的保护范围（`Bun` 会被译成「面包」）。这是刻意
  取舍：英文句子里大写词太多，全保护等于不翻。实体索引接上后覆盖率大幅提高
  （`Rust` 这类已自动保住），但只覆盖被抽取成实体的词——没进实体索引的仍要手填。
- **原文侧的 `lang` 仍不准**：中文站 SSR 出 `<html lang="zh-CN">`，里面塞着英文标题，
  而这些节点在被翻译之前没有 `lang="en"`。那是各业务段该在 SSR 里出的标注（谁渲染
  谁知道这段是什么语言），本模块不该替它们猜——`restoreTranslations` 因此也只还原原样，
  不偷偷补一个源语言上去。

## 配置

无 env。全部在 `/app/settings` → 内容翻译，按站点存 `TenantSetting['translation']`：

| 字段 | 说明 |
| --- | --- |
| `enabled` | 默认 **false**。要 key 的引擎没配 key 时，对外恒为 false |
| `engine` | 见上表 |
| `endpoint` | 仅 `libretranslate` / `custom`；只收 http(s) |
| `secret`（加密列） | API key，**任何接口都不回明文** |
| `keep_terms` | 租户补充的不翻术语，与内置规则合并 |

## 如何单独测试

```bash
pnpm --filter @rewindom/builtin exec vitest --run --project 'translation/*'
```

## 禁止

- 不要把译文写进任何表 / 任何模块的 `*_i18n` 字段——那是上一次被整片删掉的形态
- 不要给需要 key 的引擎开「客户端直连」的口子
- 不要在 `enhance/` 里 import React / client-kit（那一层是无 React 的 IIFE）
- 不要翻页头页脚：那是**代码 i18n**（`client/locales/*.json`）的地盘
- 不要把状态文案（进度 / 失败 / 机器翻译声明）挪回页头：那一行是定宽图标区，放得下的
  只有入口本身
