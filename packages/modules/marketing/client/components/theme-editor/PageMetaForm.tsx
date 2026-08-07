import { type ReactElement } from "react";

import { FieldInfoTip } from "@be-water/client-kit";
import { Field, FieldGroup, FieldLabel } from "@be-water/ui/field";
import { Input } from "@be-water/ui/input";
import { Switch } from "@be-water/ui/switch";
import { Textarea } from "@be-water/ui/textarea";
import { useTranslation } from "react-i18next";

import { SiteImageField } from "../media/SiteImageField.js";
import { SiteColorField } from "../SiteColorField.js";

import type {
  MarketingPageSettings,
  MarketingPageVisibility,
} from "../../../shared/site-cms.js";

/** 标签 + 说明气泡同一行（气泡是标签的一部分，不该换行掉下去）。 */
const LABEL_CLASS = "flex items-center gap-1";

interface PageMetaFormProps {
  title: string;
  description: string;
  /** 页面路径，只读——改 slug 会换 URL，仍然留在页面列表里做。 */
  path: string;
  settings: MarketingPageSettings;
  visibility: MarketingPageVisibility;
  disabled?: boolean;
  onChangeTitle: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onChangeSettings: (settings: MarketingPageSettings) => void;
  onChangeVisibility: (visibility: MarketingPageVisibility) => void;
}

/**
 * 页面元数据面板：标题、SEO 描述与整页画布色。
 *
 * 与区块设置共用右栏——左树选中「页面」时显示。改动进的是同一份草稿，
 * 跟区块一起在「保存」时写回。
 *
 * 标题不只是 SEO：`page-header` 段的文案留空时回落到它，页面菜单里列的也是它。
 */
export function PageMetaForm({
  title,
  description,
  path,
  settings,
  visibility,
  disabled,
  onChangeTitle,
  onChangeDescription,
  onChangeSettings,
  onChangeVisibility,
}: PageMetaFormProps): ReactElement {
  const { t } = useTranslation("marketing");

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {t("editor.pageMeta")}
      </p>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="page-meta-title" className={LABEL_CLASS}>
            {t("cms.fieldTitle")}
            <FieldInfoTip text={t("editor.info.page_title")} side="left" />
          </FieldLabel>
          <Input
            id="page-meta-title"
            value={title}
            disabled={disabled}
            onChange={(event) => onChangeTitle(event.target.value)}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="page-meta-description" className={LABEL_CLASS}>
            {t("cms.fieldDescription")}
            <FieldInfoTip
              text={t("editor.info.page_description")}
              side="left"
            />
          </FieldLabel>
          <Textarea
            id="page-meta-description"
            rows={3}
            value={description}
            disabled={disabled}
            onChange={(event) => onChangeDescription(event.target.value)}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="page-meta-path" className={LABEL_CLASS}>
            {t("editor.pagePath")}
            <FieldInfoTip text={t("editor.info.page_path")} side="left" />
          </FieldLabel>
          <Input id="page-meta-path" value={path} disabled readOnly />
        </Field>

        <Field>
          <div className="flex items-center justify-between gap-3">
            <FieldLabel
              htmlFor="page-meta-members-only"
              className={LABEL_CLASS}
            >
              {t("editor.visibility.membersOnly")}
              <FieldInfoTip
                text={t("editor.visibility.membersOnlyHint")}
                side="left"
              />
            </FieldLabel>
            <Switch
              id="page-meta-members-only"
              checked={visibility === "members"}
              disabled={disabled}
              onCheckedChange={(checked) =>
                onChangeVisibility(checked ? "members" : "public")
              }
            />
          </div>
        </Field>

        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase not-first:mt-2">
          {t("editor.group.seo")}
        </p>

        <Field>
          <FieldLabel htmlFor="page-meta-og-image" className={LABEL_CLASS}>
            {t("editor.setting.og_image")}
            <FieldInfoTip text={t("editor.info.og_image")} side="left" />
          </FieldLabel>
          <SiteImageField
            id="page-meta-og-image"
            value={settings.og_image ?? ""}
            disabled={disabled}
            placeholder="/uploads/og.png"
            onChange={(next) =>
              onChangeSettings({ ...settings, og_image: next || null })
            }
          />
        </Field>

        <Field>
          <div className="flex items-center justify-between gap-3">
            <FieldLabel htmlFor="page-meta-noindex" className={LABEL_CLASS}>
              {t("editor.setting.noindex")}
              <FieldInfoTip text={t("editor.info.noindex")} side="left" />
            </FieldLabel>
            <Switch
              id="page-meta-noindex"
              checked={settings.noindex === true}
              disabled={disabled}
              onCheckedChange={(checked) =>
                onChangeSettings({ ...settings, noindex: checked })
              }
            />
          </div>
        </Field>

        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase not-first:mt-2">
          {t("editor.group.appearance")}
        </p>

        <Field>
          <FieldLabel htmlFor="page-meta-bg" className={LABEL_CLASS}>
            {t("editor.setting.bg_color")}
            <FieldInfoTip text={t("editor.info.page_bg_color")} side="left" />
          </FieldLabel>
          <SiteColorField
            id="page-meta-bg"
            label={t("editor.setting.bg_color")}
            value={settings.bg_color ?? ""}
            fallback="#ffffff"
            disabled={disabled}
            onChange={(bg_color) =>
              onChangeSettings({ ...settings, bg_color: bg_color || null })
            }
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="page-meta-fg">
            {t("editor.setting.fg_color")}
          </FieldLabel>
          <SiteColorField
            id="page-meta-fg"
            label={t("editor.setting.fg_color")}
            value={settings.fg_color ?? ""}
            fallback="#ffffff"
            disabled={disabled}
            onChange={(fg_color) =>
              onChangeSettings({ ...settings, fg_color: fg_color || null })
            }
          />
        </Field>
      </FieldGroup>
    </div>
  );
}
