import { AppHomeRedirect } from "./AppHomeRedirect.js";

/** 未匹配任何路由 → 回落地页。与 `/app` 入口共用同一套解析逻辑。 */
export function AppNotFoundRedirect() {
  return <AppHomeRedirect />;
}
