/** 站点级常量：产品名、口号、对外链接、SEO 默认值。 */

export interface SiteNavLink {
  label: string;
  href: string;
}

export const SITE = {
  name: "be-water",
  /** `<title>` 后缀与 og:site_name */
  title: "be-water · Agent-first 多租户 SaaS 底座",
  tagline: "水无定形，遇器成形",
  description:
    "be-water 是 Agent-first 的多租户 SaaS 模块化单体底座：AGENTS.md、Skills 与 gen/check 闭环让编码 Agent 在强制边界内扩展；内核不含业务代码，模块按租户开关，单进程部署。",
  /**
   * 站点规范域名（不带结尾斜杠）。canonical / og:url / sitemap 都由它拼出来，
   * 构建时用 `SITE_URL` 环境变量覆盖（见 apps/client/scripts/prerender.mjs）。
   */
  defaultOrigin: "https://be-water.example.com",
  locale: "zh_CN",
  repoUrl: "https://github.com/vvenv/be-water",
} as const;

/** 顶栏导航（顺序即展示顺序）。 */
export const SITE_NAV: readonly SiteNavLink[] = [
  { label: "文档", href: "/docs" },
  { label: "定价", href: "/pricing" },
];

/** 页脚分组链接。 */
export const SITE_FOOTER_GROUPS: readonly {
  label: string;
  links: readonly SiteNavLink[];
}[] = [
  {
    label: "产品",
    links: [
      { label: "介绍", href: "/" },
      { label: "定价", href: "/pricing" },
      { label: "登录", href: "/login" },
    ],
  },
  {
    label: "文档",
    links: [
      { label: "文档首页", href: "/docs" },
      { label: "快速开始", href: "/docs/quickstart" },
      { label: "Agent-first", href: "/docs/agent-first" },
      { label: "模块化架构", href: "/docs/modules" },
    ],
  },
  {
    label: "资源",
    links: [{ label: "GitHub", href: SITE.repoUrl }],
  },
];
