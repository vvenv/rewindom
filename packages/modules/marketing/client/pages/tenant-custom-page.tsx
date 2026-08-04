import {
  MarketingLayout,
  MarketingSection,
} from "../components/MarketingLayout.js";

import { TenantSitePageGate } from "./tenant-site-page.js";

function PlatformNotFound() {
  return (
    <MarketingLayout path="/">
      <MarketingSection className="py-24 text-center">
        <h1 className="text-2xl font-semibold">Not found</h1>
        <p className="mt-3 text-muted-foreground">This page does not exist.</p>
      </MarketingSection>
    </MarketingLayout>
  );
}

/** 租户自定义页 `/about` 等；平台主域上显示 404。 */
export function TenantCustomPage() {
  return <TenantSitePageGate fallback={<PlatformNotFound />} />;
}
