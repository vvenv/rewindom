import { useEffect, useState, type FormEvent, type ReactElement } from "react";

import { useTenantModuleEnabled } from "@be-water/client-kit";
import { Button } from "@be-water/ui/button";
import { Field, FieldGroup, FieldLabel } from "@be-water/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@be-water/ui/select";
import { Slider } from "@be-water/ui/slider";
import { Spinner } from "@be-water/ui/spinner";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { TENANT_MARKETING_ENTITLEMENT } from "../../../shared/entitlements.js";
import {
  THEME_FONT_FAMILIES,
  THEME_PAGE_WIDTHS,
  THEME_SECTION_SPACING,
  type ThemeFontFamily,
  type ThemePageWidth,
  type ThemeSettings,
} from "../../../shared/theme-sections.js";
import { useSite, useSiteMutations } from "../../hooks/useSite.js";
import { SiteImageField } from "../media/SiteImageField.js";
import { SiteColorField } from "../SiteColorField.js";

import { SiteThemePicker } from "./SiteThemePicker.js";

const FALLBACK_COLOR = "#0f766e";

interface SiteThemeCardProps {
  canWrite: boolean;
}

/**
 * 官网主题（站点 Logo / 主色 / 字体）——原先在 Theme Editor 右侧面板，
 * 现并入「系统管理 → 品牌」，通过 `settingsBrandingExtraSlot` 注入。
 *
 * 未开通官网的租户直接不渲染，也不发请求（与侧栏 `tenantModule` 门控一致）。
 */
export function SiteThemeCard({
  canWrite,
}: SiteThemeCardProps): ReactElement | null {
  const { enabled, isLoading } = useTenantModuleEnabled(
    TENANT_MARKETING_ENTITLEMENT.key,
  );
  if (isLoading || !enabled) return null;
  return <SiteThemeForm canWrite={canWrite} />;
}

function SiteThemeForm({ canWrite }: SiteThemeCardProps): ReactElement | null {
  const { t } = useTranslation("marketing");
  const siteQuery = useSite();
  const { updateSite } = useSiteMutations();
  const [draft, setDraft] = useState<ThemeSettings | null>(null);

  const theme = siteQuery.data?.theme_settings;

  useEffect(() => {
    if (theme) setDraft(theme);
  }, [theme]);

  if (siteQuery.isError) return null;

  if (siteQuery.isLoading || !draft) {
    return (
      <section className="flex flex-col gap-4 rounded-md border p-4">
        <h2 className="text-base font-medium">{t("branding.themeTitle")}</h2>
        <Spinner className="size-4" />
      </section>
    );
  }

  const onSubmit = (event: FormEvent): void => {
    event.preventDefault();
    updateSite.mutate(
      { theme_settings: draft },
      {
        onSuccess: () => toast.success(t("branding.themeSaved")),
        onError: () => toast.error(t("cms.toastSiteSaveFailed")),
      },
    );
  };

  const color = draft.primary_color ?? "";

  return (
    <form
      className="flex flex-col gap-4 rounded-md border p-4"
      onSubmit={onSubmit}
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-medium">{t("branding.themeTitle")}</h2>
        <p className="text-muted-foreground text-sm">
          {t("branding.themeHint")}
        </p>
      </div>

      <SiteThemePicker canWrite={canWrite} />

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="site_logo_url">
            {t("cms.fieldLogoUrl")}
          </FieldLabel>
          <SiteImageField
            id="site_logo_url"
            disabled={!canWrite}
            placeholder={t("cms.fieldLogoUrlPlaceholder")}
            value={draft.logo_url ?? ""}
            onChange={(next) =>
              setDraft({ ...draft, logo_url: next.trim() || null })
            }
          />
          <p className="text-muted-foreground text-xs">
            {t("cms.fieldLogoUrlHint")}
          </p>
        </Field>

        <Field>
          <FieldLabel htmlFor="site_og_image">
            {t("editor.setting.site_og_image")}
          </FieldLabel>
          <SiteImageField
            id="site_og_image"
            disabled={!canWrite}
            placeholder="/uploads/og.png"
            value={draft.og_image ?? ""}
            onChange={(next) =>
              setDraft({ ...draft, og_image: next.trim() || null })
            }
          />
          <p className="text-muted-foreground text-xs">
            {t("editor.info.site_og_image")}
          </p>
        </Field>

        <Field>
          <FieldLabel htmlFor="site_primary_color">
            {t("cms.fieldPrimaryColor")}
          </FieldLabel>
          <SiteColorField
            id="site_primary_color"
            label={t("cms.fieldPrimaryColor")}
            value={color}
            allowAlpha={false}
            fallback={FALLBACK_COLOR}
            placeholder={FALLBACK_COLOR}
            disabled={!canWrite}
            onChange={(primary_color) =>
              setDraft({ ...draft, primary_color: primary_color || null })
            }
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="site_bg_color">
            {t("editor.setting.bg_color")}
          </FieldLabel>
          <SiteColorField
            id="site_bg_color"
            label={t("editor.setting.bg_color")}
            value={draft.bg_color ?? ""}
            fallback="#ffffff"
            disabled={!canWrite}
            onChange={(bg_color) =>
              setDraft({ ...draft, bg_color: bg_color || null })
            }
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="site_fg_color">
            {t("editor.setting.fg_color")}
          </FieldLabel>
          <SiteColorField
            id="site_fg_color"
            label={t("editor.setting.fg_color")}
            value={draft.fg_color ?? ""}
            fallback="#ffffff"
            disabled={!canWrite}
            onChange={(fg_color) =>
              setDraft({ ...draft, fg_color: fg_color || null })
            }
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="site_font_family">
            {t("editor.fieldFontFamily")}
          </FieldLabel>
          <Select
            disabled={!canWrite}
            value={draft.font_family ?? "system"}
            onValueChange={(next) =>
              setDraft({ ...draft, font_family: next as ThemeFontFamily })
            }
          >
            <SelectTrigger id="site_font_family" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {THEME_FONT_FAMILIES.map((family) => (
                <SelectItem key={family} value={family}>
                  {t(`editor.font.${family}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="site_page_width">
            {t("editor.fieldPageWidth")}
          </FieldLabel>
          <Select
            disabled={!canWrite}
            value={draft.page_width ?? "default"}
            onValueChange={(next) =>
              setDraft({ ...draft, page_width: next as ThemePageWidth })
            }
          >
            <SelectTrigger id="site_page_width" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {THEME_PAGE_WIDTHS.map((width) => (
                <SelectItem key={width} value={width}>
                  {t(`editor.pageWidth.${width}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="site_section_spacing">
            {t("editor.fieldSectionSpacing")}
          </FieldLabel>
          <div className="flex items-center gap-3">
            <Slider
              id="site_section_spacing"
              disabled={!canWrite}
              className="flex-1"
              min={THEME_SECTION_SPACING.min}
              max={THEME_SECTION_SPACING.max}
              step={THEME_SECTION_SPACING.step}
              value={[draft.section_spacing ?? THEME_SECTION_SPACING.default]}
              onValueChange={([next]) =>
                setDraft({
                  ...draft,
                  section_spacing: next ?? THEME_SECTION_SPACING.default,
                })
              }
            />
            <span className="text-muted-foreground w-14 shrink-0 text-right text-xs tabular-nums">
              {draft.section_spacing ?? THEME_SECTION_SPACING.default}{" "}
              {t("editor.unit.px")}
            </span>
          </div>
          <p className="text-muted-foreground text-xs">
            {t("editor.fieldSectionSpacingHint")}
          </p>
        </Field>
      </FieldGroup>

      {canWrite ? (
        <div>
          <Button type="submit" size="sm" disabled={updateSite.isPending}>
            {updateSite.isPending ? <Spinner className="size-4" /> : null}
            {t("cms.save")}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
