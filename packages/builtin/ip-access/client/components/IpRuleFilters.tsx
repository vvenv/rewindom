import {
  hasActiveFilters,
  optionsFromLabels,
  PageFilterBar,
  type PageFilterBarProps,
} from "@rewindom/client-kit";
import { useTranslation } from "react-i18next";

import { IP_RULE_ACTIONS, IP_RULE_SOURCES } from "../../shared/index.js";

export interface IpRuleFilterValues {
  q?: string;
  action?: string;
  source?: string;
}

export function IpRuleFilters({
  filters,
  onFiltersChange,
  layout = "inline",
}: {
  filters: IpRuleFilterValues;
  onFiltersChange: (filters: IpRuleFilterValues) => void;
  layout?: PageFilterBarProps["layout"];
}) {
  const { t } = useTranslation("ip-access");

  const setField = (key: keyof IpRuleFilterValues, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value === "" ? undefined : value,
    });
  };

  return (
    <PageFilterBar
      layout={layout}
      search={{
        value: filters.q,
        onCommit: (value: string) => setField("q", value.trim()),
        placeholder: t("filters.search"),
        className: layout === "stacked" ? "max-w-40" : "max-w-48",
      }}
      groups={[
        {
          id: "action",
          options: optionsFromLabels([
            { value: "", label: t("filters.allActions") },
            ...IP_RULE_ACTIONS.map((value) => ({
              value,
              label: t(`action.${value}`),
            })),
          ]),
          value: filters.action ?? "",
          onChange: (value) => setField("action", value),
        },
        {
          id: "source",
          options: optionsFromLabels([
            { value: "", label: t("filters.allSources") },
            ...IP_RULE_SOURCES.map((value) => ({
              value,
              label: t(`source.${value}`),
            })),
          ]),
          value: filters.source ?? "",
          onChange: (value) => setField("source", value),
        },
      ]}
      hasActiveFilters={hasActiveFilters(filters)}
      onReset={() =>
        onFiltersChange({
          q: undefined,
          action: undefined,
          source: undefined,
        })
      }
    />
  );
}
