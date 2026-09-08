/**
 * 平台面页面：**不套** `PageLayout`——`PlatformLayout` 自带标题，
 * 再套一层会出现两个标题。
 */
import { hasActiveFilters } from "@rewindom/client-kit/lib/list-url-params";
import { useTranslation } from "react-i18next";

import { IpAccessStatusPanel } from "../components/IpAccessStatusPanel.js";
import { IpRuleFilters } from "../components/IpRuleFilters.js";
import { IpRuleSheet } from "../components/IpRuleSheet.js";
import { IpRulesTable } from "../components/IpRulesTable.js";
import { TrafficSourcesPanel } from "../components/TrafficSourcesPanel.js";
import { useIpRules } from "../hooks/useIpRules.js";
import { useIpRulesPage } from "../hooks/useIpRulesPage.js";

export function PlatformIpRules() {
  const { t } = useTranslation("ip-access");
  const {
    q,
    action,
    source,
    page,
    pageSize,
    sortBy,
    sortDir,
    sorting,
    updateFilters,
    handleSortingChange,
  } = useIpRulesPage();

  const { data, isLoading, error } = useIpRules("platform", {
    page,
    pageSize,
    q,
    action,
    source,
    sortBy,
    sortDir,
  });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        {t("platformDescription")}
      </p>

      <TrafficSourcesPanel />

      <IpAccessStatusPanel />

      <div className="flex items-center justify-between gap-2">
        <IpRuleFilters
          filters={{ q, action, source }}
          onFiltersChange={updateFilters}
        />
        <IpRuleSheet scope="platform" />
      </div>

      <IpRulesTable
        scope="platform"
        rules={data?.items ?? []}
        isLoading={isLoading && !data}
        error={error}
        page={page}
        pageSize={pageSize}
        total={data?.total ?? 0}
        pageCount={data?.page_count}
        sorting={sorting}
        onSortingChange={handleSortingChange}
        canWrite
        isFiltered={hasActiveFilters({ q, action, source })}
      />
    </div>
  );
}
