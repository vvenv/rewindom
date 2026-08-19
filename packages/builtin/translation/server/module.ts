import { TRANSLATION_SERVER_I18N } from "./i18n.js";
import { publicTranslationRoutes } from "./public-translation.routes.js";
import { translationRoutes } from "./translation.routes.js";

import type { ServerAppModule } from "@rewindom/server-kernel/runtime/module-contract.js";

/**
 * 服务端在这套方案里是**配角**：默认引擎（浏览器内置）根本不经过它。
 * 这里只有两件事——存租户配置，以及为需要 API key 的引擎当代理。
 */
export const translationServerModule: ServerAppModule = {
  id: "translation",
  version: "1.0.0",
  label: "Content Translation",
  kind: "infrastructure",
  description: "访客侧按需内容翻译：配置存取 + 带密钥引擎的服务端代理",
  requires: ["rbac"],
  server: {
    i18n: TRANSLATION_SERVER_I18N,
    registerRoutes: async (app) => {
      await app.register(publicTranslationRoutes, { prefix: "/api/public" });
      await app.register(translationRoutes, { prefix: "/api/settings" });
    },
  },
};
