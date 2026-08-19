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

import { DEFAULT_HOME_LAYOUT_KEY } from "../../../shared/home-layouts.js";
import {
  DEFAULT_HOME_PATH,
  encodeHomeSelectorLayout,
  encodeHomeSelectorPage,
  homeSelectorValue,
  listHomeSelectorOptions,
  parseHomeSelectorValue,
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
 * 访客打开 `/` 时看到什么：首页模板的各套版式，或另一张已有页面。
 *
 * 选版式：套到首页草稿并把 `home_path` 收回 `/`（确认后立刻套用，因为它改的是
 * 页面草稿）。选其它页：只改本地草稿，随站点设置一起保存。
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
  const layoutKey = site?.home_layout_key || DEFAULT_HOME_LAYOUT_KEY;
  const options = listHomeSelectorOptions(
    pagesQuery.data ?? [],
    form.locale.defaultLocale,
    entitlements,
  );
  const selected = homeSelectorValue(homepage.path, layoutKey, entitlements);
  if (
    !options.some((option) =>
      option.type === "layout"
        ? encodeHomeSelectorLayout(option.key) === selected
        : option.path === homepage.path,
    ) &&
    homepage.path !== DEFAULT_HOME_PATH
  ) {
    options.push({
      type: "page",
      path: homepage.path,
      title: homepage.path,
      kind: "page",
    });
  }

  const onValueChange = async (next: string): Promise<void> => {
    if (!canWrite || next === selected || applyHomeLayout.isPending) return;
    const parsed = parseHomeSelectorValue(next);
    if (!parsed) return;
    if (parsed.type === "page") {
      homepage.setPath(parsed.path);
      return;
    }
    const layout = options.find(
      (option) => option.type === "layout" && option.key === parsed.key,
    );
    const confirmed = await confirm({
      title: t("cms.applyHomeLayoutConfirmTitle", {
        label:
          layout && layout.type === "layout" ? t(layout.label) : parsed.key,
      }),
      description: t("cms.applyHomeLayoutConfirmDescription"),
      confirmText: t("cms.applyHomeLayout"),
    });
    if (!confirmed) return;
    applyHomeLayout.mutate(parsed.key, {
      onSuccess: () => {
        homepage.setPath(DEFAULT_HOME_PATH);
        toast.success(t("cms.toastHomeLayoutApplied"));
      },
      onError: () => toast.error(t("cms.toastHomeLayoutApplyFailed")),
    });
  };

  const labelForPage = (path: string, title: string): string =>
    title ? `${title} · ${path}` : path;

  const saving = form.saving || applyHomeLayout.isPending;

  return (
    <SettingsSection
      title={t("cms.settingsSectionHome")}
      description={t("cms.settingsSectionHomeHint")}
    >
      <Field>
        <FieldLabel htmlFor="home_selector">
          {t("cms.fieldHomePage")}
        </FieldLabel>
        <Select
          disabled={!canWrite || saving}
          value={selected}
          onValueChange={(next) => void onValueChange(next)}
        >
          <SelectTrigger id="home_selector" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) =>
              option.type === "layout" ? (
                <SelectItem
                  key={encodeHomeSelectorLayout(option.key)}
                  value={encodeHomeSelectorLayout(option.key)}
                >
                  {t(option.label)}
                </SelectItem>
              ) : (
                <SelectItem
                  key={option.path}
                  value={encodeHomeSelectorPage(option.path)}
                >
                  {labelForPage(option.path, option.title)}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
        <FieldDescription>{t("cms.fieldHomePageHint")}</FieldDescription>
      </Field>
    </SettingsSection>
  );
}
