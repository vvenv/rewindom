import { FilterBar } from "@rewindom/client-kit";
import { SEARCH_PARAM_FILTER_ALL } from "@rewindom/client-kit/lib/list-url-params";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rewindom/ui/select";
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
}: {
  filters: IpRuleFilterValues;
  onFiltersChange: (filters: IpRuleFilterValues) => void;
}) {
  const { t } = useTranslation("ip-access");

  const setField = (key: keyof IpRuleFilterValues, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value === "" || value === SEARCH_PARAM_FILTER_ALL ? undefined : value,
    });
  };

  return (
    <FilterBar
      search={{
        value: filters.q,
        onCommit: (value: string) => setField("q", value),
        placeholder: t("filters.search"),
        className: "w-56",
      }}
      inlineContent={
        <>
          <Select
            value={filters.action ?? SEARCH_PARAM_FILTER_ALL}
            onValueChange={(value) => setField("action", value)}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder={t("filters.allActions")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SEARCH_PARAM_FILTER_ALL}>
                {t("filters.allActions")}
              </SelectItem>
              {IP_RULE_ACTIONS.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`action.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.source ?? SEARCH_PARAM_FILTER_ALL}
            onValueChange={(value) => setField("source", value)}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder={t("filters.allSources")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SEARCH_PARAM_FILTER_ALL}>
                {t("filters.allSources")}
              </SelectItem>
              {IP_RULE_SOURCES.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`source.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      }
    />
  );
}
