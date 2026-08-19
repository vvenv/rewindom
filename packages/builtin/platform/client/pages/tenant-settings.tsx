import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactElement,
} from "react";

import {
  ApiError,
  PageLayout,
  SettingsPanel,
  SettingsStack,
  getTenantSettingsPanels,
  sortTenantSettingsPanels,
  usePermissions,
} from "@rewindom/client-kit";
import { Alert, AlertDescription } from "@rewindom/ui/alert";
import { Button } from "@rewindom/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
import { Spinner } from "@rewindom/ui/spinner";
import { toast } from "@rewindom/ui/toast";
import { SlidersHorizontal, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

import { TenantOpenaiStatusRow } from "../components/TenantOpenaiStatusRow.js";
import {
  useTenantOpenai,
  useUpdateTenantOpenai,
} from "../hooks/useTenantOpenai.js";
import {
  buildOpenaiSettingsPayload,
  INITIAL_OPENAI_SETTINGS_FORM,
  statusToForm,
  validateOpenaiSettingsForm,
  type OpenaiSettingsFormValues,
} from "../lib/openai-settings-form.js";

export function TenantSettingsPage(): ReactElement {
  const { t } = useTranslation(["platform", "common"]);
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("settings.write");
  /*
   * 其他模块贡献的设置面板（translation 是第一个）。platform 是壳层，
   * **不得** import 贡献方——面板经组装层的注册表倒置进来。
   */
  const extraPanels = useMemo(
    () =>
      sortTenantSettingsPanels(getTenantSettingsPanels()).filter(
        (panel) =>
          !panel.anyPermission ||
          panel.anyPermission.some((permission) => hasPermission(permission)),
      ),
    [hasPermission],
  );
  const { data, isLoading, isError, error, refetch } = useTenantOpenai();
  const update = useUpdateTenantOpenai();
  const [form, setForm] = useState<OpenaiSettingsFormValues>(
    INITIAL_OPENAI_SETTINGS_FORM,
  );
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!data) return;
    setForm(statusToForm(data));
    setFormError("");
  }, [data]);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    const validationError = validateOpenaiSettingsForm(form, t);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    try {
      await update.mutateAsync(buildOpenaiSettingsPayload(form));
      setFormError("");
      toast.success(t("aiSettings.saved"));
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : t("common:saveFailed"),
      );
    }
  };

  return (
    <PageLayout
      icon={Sparkles}
      title={t("aiSettings.title")}
      description={t("aiSettings.description")}
      action={null}
    >
      {isLoading && !data ? (
        <Spinner />
      ) : isError && !data ? (
        <div className="flex flex-col items-center gap-3 py-12">
          <Alert variant="destructive" className="max-w-md">
            <AlertDescription>
              {error instanceof Error ? error.message : t("common:loadFailed")}
            </AlertDescription>
          </Alert>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            {t("common:retry")}
          </Button>
        </div>
      ) : (
        <SettingsStack>
          <TenantOpenaiStatusRow status={data} canWrite={canWrite} />
          <form onSubmit={(event) => void handleSubmit(event)}>
            <SettingsPanel
              icon={SlidersHorizontal}
              title={t("aiSettings.modelHeading")}
              description={t("aiSettings.modelDescription")}
              footer={
                canWrite ? (
                  <Button type="submit" disabled={update.isPending}>
                    {update.isPending ? <Spinner /> : null}
                    {t("common:save")}
                  </Button>
                ) : undefined
              }
            >
              <FieldGroup>
                {formError ? (
                  <Alert variant="destructive">
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                ) : null}
                <Field>
                  <FieldLabel htmlFor="openai_model">
                    {t("aiSettings.model")}
                  </FieldLabel>
                  <Input
                    id="openai_model"
                    value={form.model}
                    disabled={!canWrite}
                    placeholder={data?.resolved_model}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        model: e.target.value,
                      }))
                    }
                  />
                  <FieldDescription>
                    {t("aiSettings.modelHint")}
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="openai_temperature">
                    {t("aiSettings.temperature")}
                  </FieldLabel>
                  <Input
                    id="openai_temperature"
                    inputMode="decimal"
                    value={form.temperature}
                    disabled={!canWrite}
                    placeholder={
                      data
                        ? String(data.resolved_temperature)
                        : undefined
                    }
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        temperature: e.target.value,
                      }))
                    }
                  />
                  <FieldDescription>
                    {t("aiSettings.temperatureHint")}
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </SettingsPanel>
          </form>
          {extraPanels.map((panel) => (
            <panel.component key={panel.id} />
          ))}
        </SettingsStack>
      )}
    </PageLayout>
  );
}
