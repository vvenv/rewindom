import { useState, type ReactElement } from "react";

import { CopyButton } from "@be-water/client-kit";
import { Alert, AlertDescription } from "@be-water/ui/alert";
import { Button } from "@be-water/ui/button";
import { Field, FieldDescription, FieldLabel } from "@be-water/ui/field";
import { Input } from "@be-water/ui/input";
import { toast } from "@be-water/ui/toast";
import { useTranslation } from "react-i18next";

import { useSaveSiteBillingProvider } from "../hooks/useSiteBillingMutations.js";

import type { SiteBillingProviderStatus } from "../../shared/site-billing.js";

export function SiteBillingProviderCard({
  status,
  canWrite,
}: {
  status: SiteBillingProviderStatus | undefined;
  canWrite: boolean;
}): ReactElement | null {
  const { t } = useTranslation(["site-billing", "common"]);
  const save = useSaveSiteBillingProvider();
  const [apiKey, setApiKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");

  if (!status) return null;

  async function submit(): Promise<void> {
    try {
      await save.mutateAsync({
        // 空串表示「没改」，不是「清空」——输入框里本来就不回显密钥
        ...(apiKey.trim() ? { api_key: apiKey.trim() } : {}),
        ...(webhookSecret.trim() ? { webhook_secret: webhookSecret.trim() } : {}),
      });
      setApiKey("");
      setWebhookSecret("");
      toast.success(t("provider.saved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common:saveFailed"));
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-md border p-4">
      <p className="text-muted-foreground text-sm">{t("provider.description")}</p>

      {/*
        钱进谁的账号必须一眼看得见：回落到平台默认账号是设计如此，但站长得知道
        自己正处在哪一种状态，否则「怎么收不到钱」会变成一次支持工单。
      */}
      <Alert>
        <AlertDescription>
          {status.source === "tenant"
            ? t("provider.sourceTenant")
            : t("provider.sourcePlatform")}
        </AlertDescription>
      </Alert>

      <Field>
        <FieldLabel htmlFor="provider_api_key">{t("provider.apiKey")}</FieldLabel>
        <Input
          id="provider_api_key"
          type="password"
          autoComplete="off"
          disabled={!canWrite}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={
            status.api_key_hint
              ? t("provider.apiKeyCurrent", { hint: status.api_key_hint })
              : undefined
          }
        />
        <FieldDescription>{t("provider.apiKeyHint")}</FieldDescription>
      </Field>

      <Field>
        <FieldLabel htmlFor="provider_webhook_secret">
          {t("provider.webhookSecret")}
        </FieldLabel>
        <Input
          id="provider_webhook_secret"
          type="password"
          autoComplete="off"
          disabled={!canWrite}
          value={webhookSecret}
          onChange={(e) => setWebhookSecret(e.target.value)}
        />
        <FieldDescription>
          {status.webhook_secret_set
            ? t("provider.webhookSecretSet")
            : t("provider.webhookSecretMissing")}
        </FieldDescription>
      </Field>

      <Field>
        <FieldLabel htmlFor="provider_webhook_url">
          {t("provider.webhookUrl")}
        </FieldLabel>
        <div className="flex items-center gap-2">
          <Input id="provider_webhook_url" readOnly value={status.webhook_url} />
          <CopyButton text={status.webhook_url} />
        </div>
        <FieldDescription>{t("provider.webhookUrlHint")}</FieldDescription>
      </Field>

      {canWrite ? (
        <div>
          <Button
            type="button"
            disabled={save.isPending || (!apiKey.trim() && !webhookSecret.trim())}
            onClick={() => void submit()}
          >
            {t("provider.save")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
