import { type ReactElement } from "react";

import { useConfirm } from "@rewindom/client-kit";
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

import {
  DEFAULT_HOME_LAYOUT_KEY,
  listHomeLayouts,
} from "../../../shared/home-layouts.js";
import {
  DEFAULT_HOME_PATH,
  listHomeablePageOptions,
} from "../../../shared/site-home.js";
import {
  useSite,
  useSiteCapabilities,
  useSiteMutations,
  useSitePages,
} from "../../hooks/useSite.js";

import { SettingsSection } from "./SettingsSection.js";

import type { SiteSettingsForm } from "../../hooks/use-site-settings-form.js";

/**
 * 哪张页面占据站点根 `/`，以及首页模板套哪一套版式。
 *
 * 下拉即存：和发布开关同一口径。版式套用只写草稿，不改「哪张页占据 /」。
 */
export function SiteHomeForm({
  form,
  canWrite,
}: {
  form: SiteSettingsForm;
  canWrite: boolean;
}): ReactElement {
  const { t } = useTranslation("marketing");
  const { confirm } = useConfirm();
  const { homepage } = form;
  const { data: site } = useSite();
  const { applyHomeLayout } = useSiteMutations();
  const pagesQuery = useSitePages();
  const capabilitiesQuery = useSiteCapabilities();
  const entitlements = new Set(capabilitiesQuery.data?.entitlements ?? []);
  const layouts = listHomeLayouts(entitlements);
  const layoutKey = site?.home_layout_key || DEFAULT_HOME_LAYOUT_KEY;
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

  const onLayoutChange = async (next: string): Promise<void> => {
    if (!canWrite || next === layoutKey || applyHomeLayout.isPending) return;
    const layout = layouts.find((item) => item.key === next);
    const confirmed = await confirm({
      title: t("cms.applyHomeLayoutConfirmTitle", {
        label: layout ? t(layout.label) : next,
      }),
      description: t("cms.applyHomeLayoutConfirmDescription"),
      confirmText: t("cms.applyHomeLayout"),
    });
    if (!confirmed) return;
    applyHomeLayout.mutate(next, {
      onSuccess: () => toast.success(t("cms.toastHomeLayoutApplied")),
      onError: () => toast.error(t("cms.toastHomeLayoutApplyFailed")),
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
  const layoutSelectValue = layouts.some((layout) => layout.key === layoutKey)
    ? layoutKey
    : DEFAULT_HOME_LAYOUT_KEY;
  const saving = form.saving || applyHomeLayout.isPending;

  return (
    <SettingsSection
      title={t("cms.settingsSectionHome")}
      description={t("cms.settingsSectionHomeHint")}
    >
      <Field>
        <FieldLabel htmlFor="home_path">{t("cms.fieldHomePage")}</FieldLabel>
        <Select
          disabled={!canWrite || saving}
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
      {layouts.length > 1 ? (
        <Field>
          <FieldLabel htmlFor="home_layout">
            {t("cms.fieldHomeLayout")}
          </FieldLabel>
          <Select
            disabled={!canWrite || saving}
            value={layoutSelectValue}
            onValueChange={(next) => void onLayoutChange(next)}
          >
            <SelectTrigger id="home_layout" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {layouts.map((layout) => (
                <SelectItem key={layout.key} value={layout.key}>
                  {t(layout.label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>{t("cms.fieldHomeLayoutHint")}</FieldDescription>
        </Field>
      ) : null}
    </SettingsSection>
  );
}
