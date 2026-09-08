/**
 * 平台面页面：**不套** `PageLayout`——`PlatformLayout` 自带标题，
 * 再套一层会出现两个标题。
 *
 * 节奏对齐邮件页 / 平台租户页：说明 + 新建 → 状态卡 → 筛选 → 表。
 */
import { hasActiveFilters } from "@rewindom/client-kit/lib/list-url-params";
import { useTranslation } from "react-i18next";

import { IpAccessStatusPanel } from "../components/IpAccessStatusPanel.js";
import { IpRuleFilters } from "../components/IpRuleFilters.js";
import { IpRuleSheet } from "../components/IpRuleSheet.js";
import { IpRulesTable } from "../components/IpRulesTable.js";
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

  const rules = data?.items ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="hidden text-muted-foreground sm:block">
          {t("platformDescription")}
        </p>
        <IpRuleSheet scope="platform" />
      </div>

      <IpAccessStatusPanel />

      <IpRuleFilters
        layout="inline"
        filters={{ q, action, source }}
        onFiltersChange={updateFilters}
      />

      <IpRulesTable
        scope="platform"
        rules={rules}
        isLoading={isLoading && rules.length === 0}
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
