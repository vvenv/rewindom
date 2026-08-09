import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { DEFAULT_TENANT_ID, normalizeLocale } from "@be-water/shared";

import { applySiteStarter, setPageStatus, updateSite } from "./site.service.js";

/**
 * 确保默认租户有已发布的 Marketing CMS 站（产品主域前台）。
 *
 * 幂等：已有已发布首页则跳过；否则 apply `default` starter 并全部发布。
 */
export async function ensureDefaultMarketingSite(): Promise<void> {
  const existingPublishedHome = await prisma.marketingPage.findFirst({
    where: {
      tenant_id: DEFAULT_TENANT_ID,
      kind: "home",
      status: "published",
    },
    select: { id: true },
  });
  const site = await prisma.marketingSite.findUnique({
    where: { tenant_id: DEFAULT_TENANT_ID },
    select: { published: true },
  });
  if (existingPublishedHome && site?.published) {
    await ensureDefaultMarketingDocs();
    return;
  }

  const applied = await applySiteStarter(DEFAULT_TENANT_ID, "default");
  await updateSite(DEFAULT_TENANT_ID, { published: true });
  for (const page of applied.pages) {
    if (page.status !== "published") {
      await setPageStatus(DEFAULT_TENANT_ID, page.id, "published");
    }
  }
  await ensureDefaultMarketingDocs();
}

/**
 * 默认租户文档库的示例内容：给产品站 `/docs` 几篇已发布文档，避免新部署一片空白。
 * 内容跟代码版本走（产品口径变化时随本文件更新），与租户自管的 DB 文档是同一张表——
 * 租户之后可在工作台里随意编辑、删除，不会被这里覆盖（幂等只在「一篇已发布都没有」时补）。
 */
const DEFAULT_MARKETING_DOCS = [
  {
    slug: "getting-started",
    title: "快速开始",
    description: "几分钟内启动并搭建你的第一个站点",
    category: "入门",
    sort_order: 0,
    body_md: `# 快速开始

be-water 是一个 Agent 优先的多租户 SaaS 底座。本篇带你从零启动一个站点。

## 启动开发环境

\`\`\`bash
pnpm install
pnpm dev
\`\`\`

本地会同时启动两个入口：

- \`localhost\` — 产品站（默认租户官网 + 工作台）
- \`127.0.0.1\` — 平台控制台

两者是同一进程按 Host 分流，不是两个服务。

## 创建第一个页面

1. 用默认管理员账号登录工作台（\`/app\`）
2. 进入「站点」→ 页面编辑器
3. 拖入 hero、feature-grid、pricing 等段落并填写内容
4. 点击发布，即可在官网首页看到效果

## 下一步

- 阅读《模块化与多租户》了解如何扩展业务模块
- 在《常见问题》里查找排错指引
`,
  },
  {
    slug: "modules-and-tenancy",
    title: "模块化与多租户",
    description: "内核与业务模块的组装方式，以及多租户的隔离模型",
    category: "产品概念",
    sort_order: 10,
    body_md: `# 模块化与多租户

be-water 由内核与业务模块组装而成，单进程按 Host 分流服务多个租户。

## 模块包

每个业务模块是独立的 workspace 包，包含三端：

- **shared** — 跨端契约（类型定义、DTO）
- **server** — 路由与业务逻辑
- **client** — UI 与路由

新增模块只需创建 \`packages/modules/<name>/\` 并在 enabled-modules 注册。模块之间通过 extension-points 单向依赖，内核不依赖业务模块。

## 多租户隔离

同一进程按 Host 分流：

| Host | 入口 |
| --- | --- |
| 产品域 | 官网 + 工作台 |
| 平台域 | 平台控制台 |
| 租户绑定域 | 租户站点 |

数据按 \`tenant_id\` 隔离，租户之间互不可见。新模块的租户功能开关、配额、权限前缀都以模块 ID 为命名空间。

## 租户路由前缀

租户侧应用区一律挂在 \`/app/*\` 之下，与租户站点 CMS 的 \`/\` 顶层 slug 区分开。新增模块不必再维护多份前缀表。
`,
  },
  {
    slug: "faq",
    title: "常见问题",
    description: "部署、启动与排错的常见问题解答",
    category: "帮助",
    sort_order: 20,
    body_md: `# 常见问题

## 启动后页面 404

检查访问的 Host。本地 \`localhost\` 与 \`127.0.0.1\` 是两个不同入口：

- \`localhost\` 是产品站，访问 \`/platform\` 会被重定向到平台域
- \`127.0.0.1\` 是平台控制台，访问 \`/\` 会被送去 \`/platform\`

## 数据库迁移失败

开发库可能带有历史痕迹，直接 \`migrate dev\` 会生成意料之外的 DROP。改用影子库做离线 diff：

\`\`\`bash
pnpm --filter server exec prisma migrate diff \\
  --from-migrations ./prisma/migrations \\
  --to-schema ./prisma --script
\`\`\`

取其中属于本次改动的语句新建迁移，再 \`migrate deploy\`。

## 如何新增租户站点

在平台控制台创建租户后，租户管理员即可在工作台搭建自己的官网。租户可绑定自定义域名，访问时按 Host 自动分流到对应租户。

## 文档与页面有什么区别

页面是「段落编辑器」组装出来的版式（hero、cards、pricing 等段落），适合营销落地页；文档是「标题 + Markdown 正文 + 分类」，不进段落体系，适合手册与说明。两者共享站点 chrome 与排版样式。
`,
  },
];

/**
 * 确保默认租户文档库有示例内容。
 *
 * 幂等：默认租户已有任意一篇已发布文档时跳过——避免覆盖租户后续的编辑或删除。
 * 文档以站点主语言创建，双列一致（草稿 = 线上）并直接置为已发布。
 */
export async function ensureDefaultMarketingDocs(): Promise<void> {
  const existing = await prisma.marketingDoc.findFirst({
    where: { tenant_id: DEFAULT_TENANT_ID, status: "published" },
    select: { id: true },
  });
  if (existing) return;

  const site = await prisma.marketingSite.findUnique({
    where: { tenant_id: DEFAULT_TENANT_ID },
    select: { default_locale: true },
  });
  const locale = normalizeLocale(site?.default_locale);

  for (const doc of DEFAULT_MARKETING_DOCS) {
    await prisma.marketingDoc.create({
      data: {
        tenant_id: DEFAULT_TENANT_ID,
        slug: doc.slug,
        locale,
        title: doc.title,
        description: doc.description,
        body_md: doc.body_md,
        category: doc.category,
        sort_order: doc.sort_order,
        status: "published",
        title_draft: doc.title,
        description_draft: doc.description,
        body_md_draft: doc.body_md,
        category_draft: doc.category,
        sort_order_draft: doc.sort_order,
      },
    });
  }
}
