import { MARKETING_I18N } from "./i18n.js";
import { renderMarketingPublicRoutes } from "./public/routes.js";

import type { ClientAppModule } from "@be-water/client-kit";

export const marketingClientModule: ClientAppModule = {
  id: "marketing",
  version: "1.0.0",
  label: "官网",
  kind: "infrastructure",
  description: "公开官网：产品介绍、使用文档、定价（构建期预渲染为静态 HTML）",
  // 定价页的价格与配额取自 platform 的 PRICING_PLANS，不另存一份（见 shared/pricing.ts）
  requires: ["platform"],
  client: {
    i18n: MARKETING_I18N,
    renderPublicRoutes: renderMarketingPublicRoutes,
  },
};
