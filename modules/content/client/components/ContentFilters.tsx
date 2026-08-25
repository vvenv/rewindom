import { PageFilterBar } from "@rewindom/module-sdk/client";
import { useTranslation } from "react-i18next";

import { CONTENT_FORMATS, CONTENT_STATUSES } from "../../shared/index.js";

import type { ContentFormat, ContentStatus } from "../../shared/index.js";

interface ContentFiltersProps {
  q?: string;
  format?: ContentFormat;
  status?: ContentStatus;
  onFiltersChange: (filters: {
    q?: string;
    format?: ContentFormat | "";
    status?: ContentStatus | "";
  }) => void;
}

export function ContentFilters({
  q,
  format,
  status,
  onFiltersChange,
}: ContentFiltersProps) {
  const { t } = useTranslation("content");

  return (
    <PageFilterBar
      search={{
        value: q,
        onCommit: (value) => {
          onFiltersChange({
            q: value.trim() || undefined,
            format: format ?? "",
            status: status ?? "",
          });
        },
        placeholder: t("searchPlaceholder"),
        className: "max-w-56",
      }}
      groups={[
        {
          id: "format",
          value: format ?? "",
          onChange: (value) =>
            onFiltersChange({
              q,
              format: value as ContentFormat | "",
              status: status ?? "",
            }),
          neutralValue: "",
          options: [
            { value: "", label: t("filter.allFormats") },
            ...CONTENT_FORMATS.map((item) => ({
              value: item,
              label: t(`format.${item}`),
            })),
          ],
        },
        {
          id: "status",
          value: status ?? "",
          onChange: (value) =>
            onFiltersChange({
              q,
              format: format ?? "",
              status: value as ContentStatus | "",
            }),
          neutralValue: "",
          options: [
            { value: "", label: t("filter.allStatuses") },
            ...CONTENT_STATUSES.map((item) => ({
              value: item,
              label: t(`status.${item}`),
            })),
          ],
        },
      ]}
      hasActiveFilters={Boolean(q || format || status)}
      onReset={() => onFiltersChange({ q: undefined, format: "", status: "" })}
    />
  );
}
