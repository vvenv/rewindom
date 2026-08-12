import { type ReactElement } from "react";

import { FieldInfoTip } from "@be-water/client-kit";
import { Field, FieldGroup, FieldLabel } from "@be-water/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@be-water/ui/select";
import { Slider } from "@be-water/ui/slider";
import { useTranslation } from "react-i18next";

import {
  applySiteThemeSettings,
  type SiteTheme,
} from "../../../shared/site-themes.js";
import {
  THEME_FONT_FAMILIES,
  THEME_PAGE_WIDTHS,
  THEME_SECTION_SPACING,
  type ThemeFontFamily,
  type ThemePageWidth,
  type ThemeSettings,
} from "../../../shared/theme-sections.js";
import { SiteImageField } from "../media/SiteImageField.js";
import { SiteColorField } from "../SiteColorField.js";

import { SiteThemePicker } from "./SiteThemePicker.js";

const FALLBACK_PRIMARY_COLOR = "#0f766e";

/**
 * 站点主题的字段面板：主题包 + 品牌资产 + 配色 + 版式。
 *
 * **只管字段**，不带卡片外壳也不带保存按钮——它挂在编辑器右侧设置栏里，与选中某一段
 * 时显示的段设置同一个位置，保存 / 发布统一交给编辑器工具栏那两枚按钮。主题因此和
 * 页头页脚走同一条草稿链：改完先存草稿，发布才对访客生效。
 *
 * 分三小节而不是一路平铺九个字段：主题包是「一键铺一套」，品牌资产是租户自己的图，
 * 配色与版式才是逐项微调——混在一列里，人看不出哪些是「选一个就够了」。
 *
 * 字段说明一律走 `FieldInfoTip`（标签后的 ⓘ）：设置栏只有 300px 宽，每个字段再压
 * 两行灰字，下面几项就全被挤到折叠线以下了。
 */
export function SiteThemeSettingsForm({
  theme,
  themeKey,
  onChange,
  onThemeKeyChange,
  canWrite,
}: {
  theme: ThemeSettings;
  /** 站点主题的「出发点」包（`MarketingSite.theme_key`）；对应包的按钮变成「重设为最新」。 */
  themeKey?: string | null;
  onChange: (next: ThemeSettings) => void;
  /** 套用主题包时记录新的出发点，随保存一起落库。 */
  onThemeKeyChange?: (key: string) => void;
  canWrite: boolean;
}): ReactElement {
  const { t } = useTranslation("marketing");

  const patch = (next: Partial<ThemeSettings>): void =>
    onChange({ ...theme, ...next });

  /** 套主题包同样只改草稿；覆盖语义与服务端一键套用共用一份。 */
  const applyPack = (pack: SiteTheme): void => {
    onChange(applySiteThemeSettings(theme, pack));
    onThemeKeyChange?.(pack.key);
  };

  return (
    <div className="flex flex-col gap-6">
      <SiteThemePicker
        disabled={!canWrite}
        currentKey={themeKey}
        onPick={applyPack}
      />

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="site_logo_url">
            {t("cms.fieldLogoUrl")}
            <FieldInfoTip text={t("cms.fieldLogoUrlHint")} />
          </FieldLabel>
          <SiteImageField
            id="site_logo_url"
            disabled={!canWrite}
            placeholder={t("cms.fieldLogoUrlPlaceholder")}
            value={theme.logo_url ?? ""}
            onChange={(next) => patch({ logo_url: next.trim() || null })}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="site_favicon_url">
            {t("cms.fieldFaviconUrl")}
            <FieldInfoTip text={t("cms.fieldFaviconUrlHint")} />
          </FieldLabel>
          <SiteImageField
            id="site_favicon_url"
            disabled={!canWrite}
            placeholder={t("cms.fieldFaviconUrlPlaceholder")}
            value={theme.favicon_url ?? ""}
            onChange={(next) => patch({ favicon_url: next.trim() || null })}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="site_og_image">
            {t("editor.setting.site_og_image")}
            <FieldInfoTip text={t("editor.info.site_og_image")} />
          </FieldLabel>
          <SiteImageField
            id="site_og_image"
            disabled={!canWrite}
            placeholder="/uploads/og.png"
            value={theme.og_image ?? ""}
            onChange={(next) => patch({ og_image: next.trim() || null })}
          />
        </Field>
      </FieldGroup>

      {/*
          三个颜色横排：它们是同一组决定（主色配底色配字色），竖排的话改一个要
          滚一屏才看得到另外两个，也就没法当场判断对比度够不够。
        */}
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="site_primary_color">
            {t("cms.fieldPrimaryColor")}
          </FieldLabel>
          <SiteColorField
            id="site_primary_color"
            label={t("cms.fieldPrimaryColor")}
            value={theme.primary_color ?? ""}
            allowAlpha={false}
            fallback={FALLBACK_PRIMARY_COLOR}
            placeholder={FALLBACK_PRIMARY_COLOR}
            disabled={!canWrite}
            onChange={(value) => patch({ primary_color: value || null })}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="site_bg_color">
            {t("editor.setting.bg_color")}
            <FieldInfoTip text={t("editor.info.bg_color")} />
          </FieldLabel>
          <SiteColorField
            id="site_bg_color"
            label={t("editor.setting.bg_color")}
            value={theme.bg_color ?? ""}
            fallback="#ffffff"
            disabled={!canWrite}
            onChange={(value) => patch({ bg_color: value || null })}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="site_fg_color">
            {t("editor.setting.fg_color")}
          </FieldLabel>
          <SiteColorField
            id="site_fg_color"
            label={t("editor.setting.fg_color")}
            value={theme.fg_color ?? ""}
            fallback="#ffffff"
            disabled={!canWrite}
            onChange={(value) => patch({ fg_color: value || null })}
          />
        </Field>
      </FieldGroup>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="site_font_family">
            {t("editor.fieldFontFamily")}
          </FieldLabel>
          <Select
            disabled={!canWrite}
            value={theme.font_family ?? "system"}
            onValueChange={(next) =>
              patch({ font_family: next as ThemeFontFamily })
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
            value={theme.page_width ?? "default"}
            onValueChange={(next) =>
              patch({ page_width: next as ThemePageWidth })
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
      </FieldGroup>

      <Field>
        <FieldLabel htmlFor="site_section_spacing">
          {t("editor.fieldSectionSpacing")}
          <FieldInfoTip text={t("editor.fieldSectionSpacingHint")} />
        </FieldLabel>
        <div className="flex items-center gap-3">
          <Slider
            id="site_section_spacing"
            disabled={!canWrite}
            className="flex-1"
            min={THEME_SECTION_SPACING.min}
            max={THEME_SECTION_SPACING.max}
            step={THEME_SECTION_SPACING.step}
            value={[theme.section_spacing ?? THEME_SECTION_SPACING.default]}
            onValueChange={([next]) =>
              patch({
                section_spacing: next ?? THEME_SECTION_SPACING.default,
              })
            }
          />
          <span className="w-14 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
            {theme.section_spacing ?? THEME_SECTION_SPACING.default}{" "}
            {t("editor.unit.px")}
          </span>
        </div>
      </Field>
    </div>
  );
}
