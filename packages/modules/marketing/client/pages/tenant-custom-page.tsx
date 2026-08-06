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

/** 公开路径一律走租户 CMS；站点未就绪时显示不可用页。 */
export function TenantCustomPage() {
  return <TenantSitePageGate fallback={<SiteUnavailable />} />;
}
