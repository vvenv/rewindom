import { PageLayout, usePermissions } from "@rewindom/client-kit";
import { Input } from "@rewindom/ui/input";
import { Users } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SiteMembersTable } from "../components/SiteMembersTable.js";
import { SiteOAuthStatusRow } from "../components/SiteOAuthStatusRow.js";
import { useSiteMembersPage } from "../hooks/use-site-members-page.js";
import { useSiteMembers } from "../hooks/use-site-members.js";
import { useSiteOAuthProviders } from "../hooks/useSiteOAuth.js";

export function SiteMembers() {
  const { t } = useTranslation("site-member");
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("site_members.write");
  const oauth = useSiteOAuthProviders();
  const {
    q,
    page,
    pageSize,
    sortBy,
    sortDir,
    sorting,
    handleSortingChange,
    handleFiltersChange,
  } = useSiteMembersPage();
  const { data, isLoading, isError, error, refetch } = useSiteMembers(
    page,
    pageSize,
    q,
    sortBy,
    sortDir,
  );

  return (
    <PageLayout
      icon={Users}
      title={t("admin.title")}
      description={t("admin.description")}
    >
      <div className="flex flex-col gap-4">
        <SiteOAuthStatusRow
          providers={oauth.data?.providers}
          canWrite={canWrite}
        />
        <Input
          value={q ?? ""}
          placeholder={t("admin.searchPlaceholder")}
          onChange={(event) =>
            handleFiltersChange({ q: event.target.value || undefined })
          }
          className="max-w-sm"
        />
        <SiteMembersTable
          members={data?.items ?? []}
          isLoading={isLoading && !data}
          isError={isError && !data}
          error={error}
          page={page}
          pageSize={pageSize}
          total={data?.total ?? 0}
          pageCount={data?.page_count}
          q={q}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          onRetry={() => void refetch()}
        />
      </div>
    </PageLayout>
  );
}
