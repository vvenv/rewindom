import {
  isPlatformConsoleOrigin,
  PLATFORM_HOME_PATH,
  usePublicConfig,
} from "@be-water/client-kit";
import { Navigate } from "react-router";

import { TenantSitePageGate } from "../components/TenantSitePageGate.js";

function SiteUnavailable() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4 text-center text-foreground">
      <h1 className="text-2xl font-semibold">Site unavailable</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        This site is not published yet, or the page does not exist.
      </p>
    </div>
  );
}

/**
 * 公开路径一律走租户 CMS；站点未就绪时显示不可用页。
 *
 * 例外是**平台控制台那个 Host**（`PLATFORM_URL`，本地 `127.0.0.1`）：它没有绑定租户，
 * 压根没有站点，再渲染一张「Site unavailable」就是死路——平台管理员打开控制台域名
 * 只看到一句「站点不可用」，得自己猜出要手敲 `/platform` 或 `/login` 才进得去。
 * 所以交给控制台入口，由 `PlatformAdminRoute` 决定是进控制台、去登录，
 * 还是把租户用户弹回工作台。
 *
 * 判据是 origin 而不是「没绑定租户」：随便一个指到本服务的陌生 Host 同样没有租户，
 * 那种情况照旧显示站点不可用，不该把登录页递到陌生人面前。
 */
export function TenantCustomPage() {
  const {
    data: { bound_tenant, platform_url },
    isSuccess,
  } = usePublicConfig();

  // 只在**确认**拿到配置后才判：`bound_tenant` 的默认值就是 null，
  // 拿加载中的默认值抢跑会把租户站自己也弹去控制台。
  if (
    isSuccess &&
    !bound_tenant &&
    isPlatformConsoleOrigin(platform_url, window.location.origin)
  ) {
    return <Navigate to={PLATFORM_HOME_PATH} replace />;
  }

  return <TenantSitePageGate fallback={<SiteUnavailable />} />;
}
