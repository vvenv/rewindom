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

- 公开站（SSR 页面）：右下角翻译控件，按需翻正文
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
  enhance/index.ts   ⭐ 公开站入口，被 marketing 的 assemble 扫目录发现
  enhance/widget.ts  控件 DOM + 注入式 CSS
  engines/           browser / libretranslate / mymemory / proxy 适配器
  lib/translator.ts  编排：缓存 → 遮罩 → 分批 → 还原 → 回写
  lib/translate-dom.ts  文本节点扫描 / 替换 / 还原
  components/ hooks/ lib/  工作台设置面板（四层拆分）
```

## 扩展点

- **公开站**：`client/enhance/index.ts` 导出 `enhanceSite(ctx)`，由
  `marketing/shared/site-enhance/assemble.mjs` **扫目录**发现并打进
  `/api/public/site-enhance.js`。marketing 一行没改，依赖图上仍只有单向边。
- **工作台**：`client.tenantSettingsPanels` 注册表（契约在
  `client-kit/src/lib/module-contract.ts`，收集在 `apps/client/src/collect-modules.ts`）。
  用注册表而不是 `createComponentSlot`：后者是单组件的，第二个模块想加面板会覆盖第一个。

## 别的模块要接入，需要做什么

**通常什么都不用做。** enhance 扫的是 `main.site-main` 下的文本节点，任何模块的
公开段（events / shop / site-docs）自动覆盖。只有两种情况需要出手：

- 某段内容不该被翻（品牌名、代码块、SKU）→ 加 `translate="no"` 或 `data-no-translate`
- 工作台页面想要翻译能力 → 复用 `client/lib/translator.ts`，它不依赖 DOM

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
