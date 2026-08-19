import { type ReactElement } from "react";

import { useConfirm } from "@rewindom/client-kit";
import { Badge } from "@rewindom/ui/badge";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@rewindom/ui/field";
import { Switch } from "@rewindom/ui/switch";
import { useTranslation } from "react-i18next";

import { SettingsSection } from "./SettingsSection.js";

import type { SiteSettingsForm } from "../../hooks/use-site-settings-form.js";

/**
 * 站点总开关。下线要确认（访客当场看到占位页）；确认后只拨本地开关，保存才落库。
 */
export function SiteVisibilityForm({
  form,
  canWrite,
}: {
  form: SiteSettingsForm;
  canWrite: boolean;
}): ReactElement {
  const { t } = useTranslation("marketing");
  const { confirm } = useConfirm();
  const { visibility } = form;

  const onCheckedChange = (next: boolean): void => {
    if (next) {
      visibility.setPublished(true);
      return;
    }
    void confirm({
      title: t("cms.unpublishConfirmTitle"),
      description: t("cms.unpublishConfirmDescription"),
      confirmText: t("cms.unpublishConfirm"),
      destructive: true,
    }).then((confirmed) => {
      if (confirmed) visibility.setPublished(false);
    });
  };

  return (
    <SettingsSection
      title={t("cms.settingsSectionVisibility")}
      description={t("cms.settingsSectionVisibilityHint")}
      aside={
        <Badge variant={visibility.published ? "default" : "secondary"}>
          {visibility.published
            ? t("cms.statusPublished")
            : t("cms.statusDraft")}
        </Badge>
      }
    >
      <Field orientation="horizontal">
        <FieldContent>
          <FieldLabel htmlFor="published">{t("cms.fieldPublished")}</FieldLabel>
          <FieldDescription>{t("cms.fieldPublishedHint")}</FieldDescription>
        </FieldContent>
        <Switch
          id="published"
          disabled={!canWrite || form.saving}
          checked={visibility.published}
          onCheckedChange={onCheckedChange}
        />
      </Field>
    </SettingsSection>
  );
}
