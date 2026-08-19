import { useEffect, useState, type FormEvent, type ReactElement } from "react";

import { ApiError, SettingsPanel, usePermissions } from "@rewindom/client-kit";
import { Alert, AlertDescription } from "@rewindom/ui/alert";
import { Button } from "@rewindom/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rewindom/ui/select";
import { Spinner } from "@rewindom/ui/spinner";
import { Switch } from "@rewindom/ui/switch";
import { Textarea } from "@rewindom/ui/textarea";
import { toast } from "@rewindom/ui/toast";
import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  TRANSLATION_ENGINES,
  isTranslationEngine,
} from "../../shared/translation.js";
import {
  useTranslationSettings,
  useUpdateTranslationSettings,
} from "../hooks/useTranslationSettings.js";
import {
  buildTranslationPayload,
  engineNeedsEndpoint,
  engineNeedsKey,
  INITIAL_TRANSLATION_FORM,
  statusToForm,
  validateTranslationForm,
  type TranslationFormValues,
} from "../lib/translation-settings-form.js";
import { TranslationApiKeySheet } from "./TranslationApiKeySheet.js";

export function TranslationSettingsPanel(): ReactElement | null {
  const { t } = useTranslation(["translation", "common"]);
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("settings.write");
  const { data, isLoading } = useTranslationSettings();
  const update = useUpdateTranslationSettings();
  const [form, setForm] = useState<TranslationFormValues>(
    INITIAL_TRANSLATION_FORM,
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
    const validationError = validateTranslationForm(form, t);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    try {
      await update.mutateAsync(buildTranslationPayload(form));
      setFormError("");
      toast.success(t("settings.saved"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("common:saveFailed"));
    }
  };

  if (isLoading && !data) return null;

  const needsKey = engineNeedsKey(form.engine);
  const needsEndpoint = engineNeedsEndpoint(form.engine);

  return (
    <form onSubmit={(event) => void handleSubmit(event)}>
      <SettingsPanel
        icon={Languages}
        title={t("settings.title")}
        description={t("settings.description")}
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

          <Field orientation="horizontal">
            <FieldLabel htmlFor="translation_enabled">
              {t("settings.enabled")}
            </FieldLabel>
            <Switch
              id="translation_enabled"
              checked={form.enabled}
              disabled={!canWrite}
              onCheckedChange={(checked) =>
                setForm((current) => ({ ...current, enabled: checked }))
              }
            />
          </Field>
          <FieldDescription>{t("settings.enabledHint")}</FieldDescription>

          <Field>
            <FieldLabel htmlFor="translation_engine">
              {t("settings.engine")}
            </FieldLabel>
            <Select
              value={form.engine}
              disabled={!canWrite}
              onValueChange={(value) => {
                if (!isTranslationEngine(value)) return;
                setForm((current) => ({ ...current, engine: value }));
              }}
            >
              <SelectTrigger id="translation_engine" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRANSLATION_ENGINES.map((engine) => (
                  <SelectItem key={engine} value={engine}>
                    {t(`settings.engines.${engine}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>
              {t(`settings.engineHints.${form.engine}`)}
            </FieldDescription>
          </Field>

          {needsEndpoint ? (
            <Field>
              <FieldLabel htmlFor="translation_endpoint">
                {t("settings.endpoint")}
              </FieldLabel>
              <Input
                id="translation_endpoint"
                value={form.endpoint}
                disabled={!canWrite}
                placeholder="https://libretranslate.example.com"
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    endpoint: e.target.value,
                  }))
                }
              />
              <FieldDescription>{t("settings.endpointHint")}</FieldDescription>
            </Field>
          ) : null}

          {needsKey && data ? (
            <Field>
              <FieldLabel htmlFor="translation_api_key_status">
                {t("settings.apiKey")}
              </FieldLabel>
              <div
                id="translation_api_key_status"
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <p className="text-sm">
                  {data.has_api_key
                    ? t("settings.apiKeyConfigured", {
                        hint: data.api_key_hint ?? "",
                      })
                    : t("settings.apiKeyEmpty")}
                </p>
                {canWrite ? (
                  <TranslationApiKeySheet status={data} />
                ) : null}
              </div>
              <FieldDescription>{t("settings.apiKeyProxyHint")}</FieldDescription>
            </Field>
          ) : null}

          <Field>
            <FieldLabel htmlFor="translation_keep_terms">
              {t("settings.keepTerms")}
            </FieldLabel>
            <Textarea
              id="translation_keep_terms"
              rows={5}
              value={form.keep_terms}
              disabled={!canWrite}
              placeholder={"Direct File\nApple TV"}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  keep_terms: e.target.value,
                }))
              }
            />
            <FieldDescription>{t("settings.keepTermsHint")}</FieldDescription>
          </Field>
        </FieldGroup>
      </SettingsPanel>
    </form>
  );
}
