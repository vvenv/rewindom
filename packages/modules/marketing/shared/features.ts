/** 首页内容：卖点、架构要点、内建模块清单。纯数据，便于预渲染与单测。 */

export interface FeatureItem {
  title: string;
  description: string;
  /** lucide 图标名，由 client 侧映射成组件——shared 层不引 React */
  icon: FeatureIconName;
}

export type FeatureIconName =
  "blocks" | "shield" | "gauge" | "layers" | "plug" | "server";

export const HERO = {
  headline: "底座随业务成形，而不是业务迁就底座",
  subline:
    "多租户 SaaS 模块化单体：内核与基础设施不含业务代码，业务以模块挂载、按租户开关、单进程部署。",
  primaryCta: { label: "快速开始", href: "/docs/quickstart" },
  secondaryCta: { label: "看定价", href: "/pricing" },
} as const;

export const FEATURES: readonly FeatureItem[] = [
  {
    title: "内核不依赖业务",
    description:
      "HTTP 栈、认证、租户上下文、模块加载器、事件总线都在内核里，业务代码一行不掺。换业务不用动底座。",
    icon: "layers",
  },
  {
    title: "模块即插即用",
    description:
      "每个模块自带 server 路由、client 页面与 shared 契约，注册进两处 enabled-modules 即上线，移除同样干净。",
    icon: "blocks",
  },
  {
    title: "按租户开关",
    description:
      "模块与功能项按租户开通：未开通就不挂路由、不进侧栏、不产生数据，配额超限由内核统一拦截。",
    icon: "plug",
  },
  {
    title: "多租户隔离是强制的",
    description:
      "租户守卫在 Prisma 层 fail-closed：模型没登记就启动失败，越权查询还有 lint 与运行时双重兜底。",
    icon: "shield",
  },
  {
    title: "可观测性内建",
    description:
      "审计日志、错误日志、慢查询看板、后台任务中心开箱即用，不用等到出事才补监控。",
    icon: "gauge",
  },
  {
    title: "单进程部署",
    description:
      "编译期组装、单进程运行，生产用 Docker Compose 交付。没有微服务的运维税，也没有低代码的天花板。",
    icon: "server",
  },
];

export interface BuiltinModuleItem {
  name: string;
  description: string;
}

export const BUILTIN_MODULES: readonly BuiltinModuleItem[] = [
  { name: "user", description: "认证与 JWT 双 Token" },
  { name: "platform", description: "租户、套餐与配额控制台" },
  { name: "rbac", description: "PBAC 角色与权限" },
  { name: "audit", description: "写操作审计日志" },
  { name: "notification", description: "站内通知" },
  { name: "background-job", description: "BullMQ 任务中心" },
  { name: "error-log", description: "错误日志与查询 API" },
  { name: "slow-query", description: "慢查询归因看板" },
];

export interface TechStackItem {
  layer: string;
  items: string;
}

export const TECH_STACK: readonly TechStackItem[] = [
  { layer: "后端", items: "Fastify 5 · TypeScript 6 · Prisma 7" },
  { layer: "数据", items: "PostgreSQL 16 · Redis 7 · BullMQ" },
  { layer: "前端", items: "React 19 · Vite 8 · React Router v8 · TanStack" },
  { layer: "UI", items: "shadcn/ui · Tailwind CSS 4" },
  { layer: "部署", items: "Docker Compose · 宿主机 Nginx" },
];
