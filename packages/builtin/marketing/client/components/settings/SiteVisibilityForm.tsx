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
import { toast } from "sonner";

import { SettingsSection } from "./SettingsSection.js";

import type { SiteSettingsForm } from "../../hooks/use-site-settings-form.js";

/**
 * 站点总开关。
 *
 * **开关即存**，不配保存按钮：一个二值开关配一个保存按钮，多数人点完开关就走了，
 * 以为已经生效。代价是要自己兜住失败——请求挂了就把开关拨回去（`restore`）。
 *
 * 只有**下线**要确认：站点从对外可见变成占位页，访客当场就看得到；反过来上线是
 * 建设性的，拦一道只是碍事。
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

  const apply = (next: boolean): void => {
    visibility.toggle(next, {
      onSuccess: () =>
        toast.success(
          next ? t("cms.toastSitePublished") : t("cms.toastSiteUnpublished"),
        ),
      onError: () => {
        visibility.restore();
        toast.error(t("cms.toastSiteSaveFailed"));
      },
    });
  };

  const onCheckedChange = (next: boolean): void => {
    if (next) {
      apply(true);
      return;
    }
    void confirm({
      title: t("cms.unpublishConfirmTitle"),
      description: t("cms.unpublishConfirmDescription"),
      confirmText: t("cms.unpublishConfirm"),
      destructive: true,
    }).then((confirmed) => {
      if (confirmed) apply(false);
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
