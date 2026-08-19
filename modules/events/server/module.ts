import {
  registerTenantGatedRoutes,
  type ServerAppModule,
} from "@rewindom/module-sdk/server";

import { registerReservedPageSlug } from "@rewindom/builtin/marketing/shared/reserved-slugs.js";

import { feedRoutes } from "./feed/feed.routes.js";
import { followRoutes } from "./follow/follow.routes.js";
import { registerEventIngestJobs } from "./ingest/scheduler-jobs.js";
import { registerEventsSections } from "./sections/register.js";
import { registerEventsPathHandler } from "./ssr/events-path-handler.js";
import { eventsRoutes } from "./events.routes.js";
import { eventsTranslationTermsProvider } from "./translation-terms.provider.js";
import { EVENTS_SERVER_I18N } from "./i18n.js";

import { EVENTS_ENTITLEMENT } from "../shared/entitlements.js";
import { registerEventsPageTemplates } from "../shared/events-page-templates.js";
import { registerEventsNavSources } from "../shared/nav-sources.js";

export const eventsServerModule: ServerAppModule = {
  id: "events",
  version: "1.0.0",
  label: "Events",
  kind: "business",
  description: "跨来源发现事件、重建时间线并持续追踪",
  requires: ["rbac", "audit", "platform", "marketing"],
  tenantEntitlements: [EVENTS_ENTITLEMENT],
  shared: {
    permissions: [
      {
        key: "events.read",
        label: "查看事件",
        group: "事件雷达",
        description: "浏览事件列表、详情、时间线与来源",
      },
      {
        key: "events.follow",
        label: "关注事件",
        group: "事件雷达",
        description: "关注/取消关注事件，并标记已读进度",
      },
      {
        key: "events.write",
        label: "管理事件",
        group: "事件雷达",
        description: "编辑事件文案，配置本站采集源与显示主题",
      },
    ],
    auditActions: [
      { action: "EVENT_FOLLOW", label: "关注事件" },
      { action: "EVENT_UNFOLLOW", label: "取消关注事件" },
      { action: "EVENT_UPDATE", label: "编辑事件" },
      { action: "EVENT_SIGNAL_REMOVE", label: "移除事件信号" },
      { action: "EVENT_TOPICS_UPDATE", label: "更新显示主题" },
      { action: "EVENT_FEED_CREATE", label: "新增采集源" },
      { action: "EVENT_FEED_UPDATE", label: "更新采集源" },
      { action: "EVENT_FEED_DELETE", label: "删除采集源" },
    ],
  },
  server: {
    i18n: EVENTS_SERVER_I18N,
    /**
     * 把实体索引供给访客侧翻译当「不要翻译的术语」。
     *
     * 走 Provider 而不是让 translation 直接查 EventEntity：基础设施模块不得
     * 依赖业务模块，方向只能是业务往上供。
     */
    registerProviders: (registry) => {
      registry.addTranslationTermsProvider(eventsTranslationTermsProvider);
    },
    /**
     * 官网贡献：段 + 模板页 + `/events` 路径 + 主题导航源 + sitemap / 链接候选。
     * 定义都写在贡献方 `shared/`，marketing 内核一行没改（见 site-section skill）。
     */
    onBoot: async () => {
      registerEventsPageTemplates();
      registerEventsNavSources();
      registerEventsSections();
      registerEventsPathHandler();
      // `/events` 归本模块，租户不能再建同名 CMS 页面把它顶掉
      registerReservedPageSlug("events");
    },
    registerRoutes: async (app) => {
      /*
       * 公开面（页面 / RSS / og.png）一条 Fastify 路由都不挂：它们全部走
       * marketing 的 path handler，那里才拿得到 `homePath` / `homeLayoutKey`，
       * 地址才能跟着枢纽挂载走（见 ssr/rss.render.ts）。
       */
      await registerTenantGatedRoutes(app, "events", async (scoped) => {
        await scoped.register(feedRoutes, { prefix: "/api/events/feeds" });
        await scoped.register(followRoutes, { prefix: "/api/events/follows" });
        await scoped.register(eventsRoutes, { prefix: "/api/events" });
      });
    },
    /**
     * 采集按站点跑（每个开通事件雷达的站点各自一份源与语料）。
     * 多实例部署时每个实例都会跑——写入路径是幂等的（信号唯一键含 tenant_id），
     * 重复抓取只浪费带宽，不会串站。
     */
    registerJobs: registerEventIngestJobs,
  },
};
