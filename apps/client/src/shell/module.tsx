import { renderAppShellGuestRoutes } from "./guest-routes.js";

import type { ClientAppModule } from "@be-water/client-kit";

export const appShellClientModule: ClientAppModule = {
  id: "app-shell",
  version: "1.0.0",
  label: "App Shell",
  kind: "infrastructure",
  description: "认证页面、布局与路由守卫",
  client: {
    renderGuestRoutes: renderAppShellGuestRoutes,
  },
};
