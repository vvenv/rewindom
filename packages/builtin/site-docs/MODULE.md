# site-docs

## 用途

站点文档库：Markdown 文档、分类，以及公开面的 `/docs` 索引与 `/docs/:slug` 详情。
文档**不是**页面——不进 section / block 体系；作者只写 markdown。版式是两张模板页
（`docs_index` / `docs_article`），与会员页同一套 `registerPageTemplateKind` 机制。

## 面划分

| 面 | 路由 | 目录 | 所需权限 / 门控 |
| --- | --- | --- | --- |
| 公开（SSR） | `/docs`、`/docs/:slug` | `server/docs.ssr.ts`（`registerSitePathHandler`） | Host 绑定 + entitlement `site-docs`；**不**进 `SITE_APP_PREFIXES` |
| 租户侧 | `/app/docs` | `client/pages/docs.tsx` | `docs.read`（写操作另需 `docs.write`） |
| 管理 API | `/api/docs`、`/api/docs/categories` | `server/site-doc.routes.ts`、`site-doc-category.routes.ts` | PBAC；`registerTenantGatedRoutes` |

## 两张模板页 + 四段 + 一块 chrome

| 项 | type / kind | 落脚点 |
| --- | --- | --- |
| 文档列表 | `site-docs.list` | 任意页面（首页「最新几篇」也是它） |
| 文档正文 | `site-docs.article` | 只在 `docs_article` |
| 篇间导航 | `site-docs.nav` | 只在 `docs_article` |
| 篇内目录 | `site-docs.toc` | 只在 `docs_article` |
| 页头搜索 | `site-docs.search` | chrome 块；GET 表单跳本地化 `/docs?q=` |
| 模板页 | `docs_index` → `/docs`；`docs_article` → `/docs/:slug` | `required_section: null`；分组 `site-docs:template.group` |

按请求数据走 `SectionRenderContext.contributed["site-docs"]`，读写收口在
`readSiteDocsContext` / `siteDocsContextEntry`。列表段对 `query`（`?q=`）做 SSR 过滤。

## 导航源

`registerNavSource`：`site-docs`（整库）与 `site-docs.category`（某一分类）。
存量 `docs` / `doc_category` 由 marketing 解析时改写，本模块只认新名。

文档索引 `/docs` 本身是可打开的一级页面，会进页头「全部一级页面」（`docs_index`）；
详情模板 `docs_article` 没有自己的地址，不进。要按分类展开目录时另加 `site-docs`
动态源，不要和「全部一级页面」里那条索引链接混为一谈。

## 权限与开关

| 位置 | 收窄方式 |
| --- | --- |
| 管理路由 | `requirePermission("docs.read" / "docs.write")` |
| 导航 | `anyPermission: ["docs.read"]`；挂在「官网 CMS」分组；`tenantModule: "site-docs"` |
| entitlement | key `site-docs`，`default_enabled: true` |

## 与 marketing 的边界

- marketing **不** import site-docs。模板 / 段 / chrome / 导航源 / 路径 / 预留 slug
  都是「注册表定义在消费方，本模块填」
- 公开渲染：`registerSitePathHandler` 命中 `/docs*`，数据塞进 `contributed`
- 编辑器预览：`registerEditorContextProvider` 拉目录（零文档时用示例）
- 站点地图与链接选择器：`registerSitemapProvider` / `registerLinkTargetProvider`
- 预留页面 slug：`registerReservedPageSlug("docs")`（两端）

## Prisma

`SiteDoc` / `SiteDocCategory`（表从 `MarketingDoc*` 改名）。客户端
`prisma.siteDoc` / `prisma.siteDocCategory`。
