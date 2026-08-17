import { type ReactElement } from "react";

import { Field, FieldDescription, FieldLabel } from "@rewindom/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rewindom/ui/select";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { DEFAULT_HOME_PATH, listHomeablePageOptions } from "../../../shared/site-home.js";
import { useSiteCapabilities, useSitePages } from "../../hooks/useSite.js";

import { SettingsSection } from "./SettingsSection.js";

import type { SiteSettingsForm } from "../../hooks/use-site-settings-form.js";

/**
 * 哪张页面占据站点根 `/`。
 *
 * 下拉即存：和发布开关同一口径。选中的页在访客访问 `/` 时被渲染，原地址仍可打开。
 */
export function SiteHomeForm({
  form,
  canWrite,
}: {
  form: SiteSettingsForm;
  canWrite: boolean;
}): ReactElement {
  const { t } = useTranslation("marketing");
  const { homepage } = form;
  const pagesQuery = useSitePages();
  const capabilitiesQuery = useSiteCapabilities();
  const entitlements = new Set(capabilitiesQuery.data?.entitlements ?? []);
  const options = listHomeablePageOptions(
    pagesQuery.data ?? [],
    form.locale.defaultLocale,
    entitlements,
  );
  if (!options.some((option) => option.path === homepage.path)) {
    options.push({
      path: homepage.path,
      title: homepage.path,
      kind: "page",
    });
  }

  const onValueChange = (next: string): void => {
    if (!canWrite || next === homepage.path) return;
    homepage.commit(next, {
      onSuccess: () => toast.success(t("cms.toastHomeUpdated")),
      onError: () => {
        homepage.restore();
        toast.error(t("cms.toastSiteSaveFailed"));
      },
    });
  };

  const labelFor = (path: string, title: string): string => {
    if (path === DEFAULT_HOME_PATH) {
      return t("cms.homePageDefault", {
        title: title || t("cms.kindHome"),
      });
    }
    return title ? `${title} · ${path}` : path;
  };

  const value = homepage.path;

  return (
    <SettingsSection
      title={t("cms.settingsSectionHome")}
      description={t("cms.settingsSectionHomeHint")}
    >
      <Field>
        <FieldLabel htmlFor="home_path">{t("cms.fieldHomePage")}</FieldLabel>
        <Select
          disabled={!canWrite || form.saving}
          value={value}
          onValueChange={onValueChange}
        >
          <SelectTrigger id="home_path" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.path} value={option.path}>
                {labelFor(option.path, option.title)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldDescription>{t("cms.fieldHomePageHint")}</FieldDescription>
      </Field>
    </SettingsSection>
  );
}
