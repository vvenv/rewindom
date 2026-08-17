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
import { EVENTS_SERVER_I18N } from "./i18n.js";

import { EVENTS_ENTITLEMENT } from "../shared/entitlements.js";
import { registerEventsPageTemplates } from "../shared/events-page-templates.js";

export const eventsServerModule: ServerAppModule = {
  id: "events",
  version: "1.0.0",
  label: "Events",
  kind: "business",
  description: "跨来源发现事件、重建时间线并持续追踪",
  requires: ["rbac", "audit", "marketing"],
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
        description: "编辑事件文案，并配置本站采集源",
      },
    ],
    auditActions: [
      { action: "EVENT_FOLLOW", label: "关注事件" },
      { action: "EVENT_UNFOLLOW", label: "取消关注事件" },
      { action: "EVENT_UPDATE", label: "编辑事件" },
      { action: "EVENT_FEED_CREATE", label: "新增采集源" },
      { action: "EVENT_FEED_UPDATE", label: "更新采集源" },
      { action: "EVENT_FEED_DELETE", label: "删除采集源" },
    ],
  },
  server: {
    i18n: EVENTS_SERVER_I18N,
    /**
     * 官网贡献：两个段 + 两张模板页 + `/events` 路径处理 + sitemap / 链接候选。
     * 定义都写在贡献方 `shared/`，marketing 内核一行没改（见 site-section skill）。
     */
    onBoot: async () => {
      registerEventsPageTemplates();
      registerEventsSections();
      registerEventsPathHandler();
      // `/events` 归本模块，租户不能再建同名 CMS 页面把它顶掉
      registerReservedPageSlug("events");
    },
    registerRoutes: async (app) => {
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
