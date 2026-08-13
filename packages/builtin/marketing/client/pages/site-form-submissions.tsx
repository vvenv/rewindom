import { PageLayout, usePermissions } from "@rewindom/client-kit";
import { Inbox } from "lucide-react";
import { useTranslation } from "react-i18next";

import { FormSubmissionsTable } from "../components/form-submissions/FormSubmissionsTable.js";
import { useFormSubmissions } from "../hooks/useFormSubmissions.js";
import { useFormSubmissionsPage } from "../hooks/useFormSubmissionsPage.js";

export function SiteFormSubmissions() {
  const { t } = useTranslation("marketing");
  const { page, pageSize } = useFormSubmissionsPage();
  const { hasPermission } = usePermissions();
  const { data, isLoading, error } = useFormSubmissions(page, pageSize);

  return (
    <PageLayout
      icon={Inbox}
      title={t("formSubmissions.title")}
      description={t("formSubmissions.pageDescription")}
    >
      <div className="flex flex-col gap-4">
        <FormSubmissionsTable
          submissions={data?.items ?? []}
          isLoading={isLoading}
          error={error}
          page={data?.page ?? page}
          pageSize={data?.page_size ?? pageSize}
          total={data?.total ?? 0}
          pageCount={data?.page_count}
          canWrite={hasPermission("site.write")}
        />
      </div>
    </PageLayout>
  );
}
