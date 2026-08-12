import { PageFilterBar } from "@be-water/client-kit";
import { optionsFromLabels } from "@be-water/client-kit/lib/filter-chip-options";
import { useTranslation } from "react-i18next";

import {
  memberRecordStatusPrefix,
  memberRecordStatuses,
  type MemberRecordTab,
} from "../lib/member-records.js";

export function MemberRecordFilters({
  tab,
  status,
  onStatusChange,
}: {
  tab: MemberRecordTab;
  status?: string;
  onStatusChange: (status?: string) => void;
}) {
  const { t } = useTranslation("site-billing");
  const prefix = memberRecordStatusPrefix(tab);

  const options = optionsFromLabels([
    { value: "", label: t("records.statusAll") },
    ...memberRecordStatuses(tab).map((value) => ({
      value,
      label: t(`${prefix}.${value}`),
    })),
  ]);

  return (
    <PageFilterBar
      groups={[
        {
          id: "status",
          options,
          value: status ?? "",
          onChange: (value) => onStatusChange(value || undefined),
        },
      ]}
      hasActiveFilters={Boolean(status)}
      onReset={() => onStatusChange(undefined)}
    />
  );
}
