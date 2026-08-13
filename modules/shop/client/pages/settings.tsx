import { useEffect, useState, type FormEvent } from "react";

import {
  ApiError,
  PageLayout,
  SettingsPanel,
  SettingsStack,
  usePermissions,
} from "@rewindom/module-sdk/client";
import { Alert, AlertDescription } from "@rewindom/ui/alert";
import { Button } from "@rewindom/ui/button";
import { Spinner } from "@rewindom/ui/spinner";
import { toast } from "@rewindom/ui/toast";
import { Landmark, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ShopProviderStatusRow } from "../components/ShopProviderStatusRow.js";
import { ShopSettingsFields } from "../components/ShopSettingsFields.js";
import { useShopSettings, useUpdateShopSettings } from "../hooks/useShop.js";
import {
  buildSettingsPayload,
  INITIAL_SHOP_SETTINGS_FORM,
  settingToForm,
  validateSettingsForm,
  type ShopSettingsFormValues,
} from "../lib/shop-settings-form.js";

export function SettingsPage() {
  const { t } = useTranslation("shop");
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("shop.write");
  const { data, isLoading, isError, error, refetch } = useShopSettings();
  const updateSetting = useUpdateShopSettings();
  const [form, setForm] = useState<ShopSettingsFormValues>(
    INITIAL_SHOP_SETTINGS_FORM,
  );
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!data) return;
    setForm(settingToForm(data.setting));
    setFormError("");
  }, [data]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const validationError = validateSettingsForm(form, t);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    try {
      await updateSetting.mutateAsync(buildSettingsPayload(form));
      setFormError("");
      toast.success(t("toastSetting"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("updateFailed"));
    }
  };

  return (
    <PageLayout
      icon={Settings}
      title={t("settingsTitle")}
      description={t("settingsDescription")}
      action={null}
    >
      {isLoading && !data ? (
        <Spinner />
      ) : isError && !data ? (
        <div className="flex flex-col items-center gap-3 py-12">
          <Alert variant="destructive" className="max-w-md">
            <AlertDescription>
              {error instanceof Error ? error.message : t("loadFailed")}
            </AlertDescription>
          </Alert>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            {t("retry")}
          </Button>
        </div>
      ) : (
        <SettingsStack>
          <ShopProviderStatusRow status={data?.provider} canWrite={canWrite} />
          <form onSubmit={(event) => void handleSubmit(event)}>
            <SettingsPanel
              icon={Landmark}
              title={t("settlementTitle")}
              description={t("settlementDescription")}
              footer={
                canWrite ? (
                  <Button type="submit" disabled={updateSetting.isPending}>
                    {updateSetting.isPending ? <Spinner /> : null}
                    {t("save")}
                  </Button>
                ) : undefined
              }
            >
              <ShopSettingsFields
                form={form}
                canWrite={canWrite}
                error={formError}
                onChange={(partial) =>
                  setForm((current) => ({ ...current, ...partial }))
                }
              />
            </SettingsPanel>
          </form>
        </SettingsStack>
      )}
    </PageLayout>
  );
}
