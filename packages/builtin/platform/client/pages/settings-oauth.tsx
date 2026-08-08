import { useEffect, useState, type ReactNode } from "react";

import { PageLayout, usePermissions } from "@be-water/client-kit";
import { Button } from "@be-water/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@be-water/ui/card";
import { Field, FieldGroup, FieldLabel } from "@be-water/ui/field";
import { Input } from "@be-water/ui/input";
import { KeyRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  useClearTenantOAuthProvider,
  useTenantOAuthProviders,
  useUpsertTenantOAuthProvider,
} from "../hooks/useTenantOAuthProviders.js";

import type {
  TenantOAuthProviderId,
  TenantOAuthProviderStatus,
} from "../../shared/tenant-oauth.js";

const PROVIDER_ORDER: TenantOAuthProviderId[] = [
  "github",
  "google",
  "microsoft",
];

function ProviderCard({
  status,
  canWrite,
}: {
  status: TenantOAuthProviderStatus;
  canWrite: boolean;
}): ReactNode {
  const { t } = useTranslation("platform");
  const upsert = useUpsertTenantOAuthProvider();
  const clear = useClearTenantOAuthProvider();
  const [clientId, setClientId] = useState(status.client_id ?? "");
  const [clientSecret, setClientSecret] = useState("");
  const [callbackUrl, setCallbackUrl] = useState(status.callback_url ?? "");
  const [authority, setAuthority] = useState(status.authority ?? "common");

  useEffect(() => {
    setClientId(status.client_id ?? "");
    setCallbackUrl(status.callback_url ?? "");
    setAuthority(status.authority ?? "common");
    setClientSecret("");
  }, [status]);

  const title = t(`oauth.providers.${status.provider}`);
  const sourceLabel =
    status.source === "tenant"
      ? t("oauth.source.tenant")
      : t("oauth.source.platform");

  async function handleSave(): Promise<void> {
    try {
      await upsert.mutateAsync({
        provider: status.provider,
        body: {
          client_id: clientId.trim(),
          client_secret: clientSecret.trim(),
          callback_url: callbackUrl.trim() || null,
          authority:
            status.provider === "microsoft"
              ? authority.trim() || "common"
              : null,
        },
      });
      toast.success(t("oauth.toast.saved"));
      setClientSecret("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("oauth.toast.saveFailed"),
      );
    }
  }

  async function handleClear(): Promise<void> {
    try {
      await clear.mutateAsync(status.provider);
      toast.success(t("oauth.toast.cleared"));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("oauth.toast.clearFailed"),
      );
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>
          {status.enabled
            ? t("oauth.status.enabled", { source: sourceLabel })
            : t("oauth.status.disabled")}
          {status.tenant_configured
            ? ` · ${t("oauth.status.overrideActive")}`
            : ` · ${t("oauth.status.usingPlatform")}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={`${status.provider}-client-id`}>
              {t("oauth.fields.clientId")}
            </FieldLabel>
            <Input
              id={`${status.provider}-client-id`}
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
              disabled={!canWrite || upsert.isPending}
              autoComplete="off"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${status.provider}-client-secret`}>
              {t("oauth.fields.clientSecret")}
            </FieldLabel>
            <Input
              id={`${status.provider}-client-secret`}
              type="password"
              value={clientSecret}
              onChange={(event) => setClientSecret(event.target.value)}
              disabled={!canWrite || upsert.isPending}
              placeholder={
                status.tenant_configured
                  ? t("oauth.fields.secretPlaceholderReplace")
                  : t("oauth.fields.secretPlaceholder")
              }
              autoComplete="new-password"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${status.provider}-callback`}>
              {t("oauth.fields.callbackUrl")}
            </FieldLabel>
            <Input
              id={`${status.provider}-callback`}
              value={callbackUrl}
              onChange={(event) => setCallbackUrl(event.target.value)}
              disabled={!canWrite || upsert.isPending}
              placeholder={t("oauth.fields.callbackPlaceholder")}
              autoComplete="off"
            />
          </Field>
          {status.provider === "microsoft" && (
            <Field>
              <FieldLabel htmlFor={`${status.provider}-authority`}>
                {t("oauth.fields.authority")}
              </FieldLabel>
              <Input
                id={`${status.provider}-authority`}
                value={authority}
                onChange={(event) => setAuthority(event.target.value)}
                disabled={!canWrite || upsert.isPending}
                placeholder="common"
                autoComplete="off"
              />
            </Field>
          )}
        </FieldGroup>
        {canWrite && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={
                upsert.isPending ||
                !clientId.trim() ||
                !clientSecret.trim()
              }
              onClick={() => void handleSave()}
            >
              {upsert.isPending ? t("oauth.saving") : t("oauth.save")}
            </Button>
            {status.tenant_configured && (
              <Button
                type="button"
                variant="outline"
                disabled={clear.isPending}
                onClick={() => void handleClear()}
              >
                {clear.isPending ? t("oauth.clearing") : t("oauth.clear")}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SettingsOAuthPage(): ReactNode {
  const { t } = useTranslation("platform");
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("settings.write");
  const query = useTenantOAuthProviders();

  const byProvider = new Map(
    (query.data?.providers ?? []).map((entry) => [entry.provider, entry]),
  );

  return (
    <PageLayout
      icon={KeyRound}
      title={t("oauth.page.title")}
      description={t("oauth.page.description")}
    >
      {query.isLoading ? (
        <p className="text-muted-foreground text-sm">{t("oauth.loading")}</p>
      ) : query.isError ? (
        <p className="text-destructive text-sm">{t("oauth.loadFailed")}</p>
      ) : (
        <div className="flex max-w-2xl flex-col gap-6">
          <p className="text-muted-foreground text-sm">{t("oauth.hint")}</p>
          {PROVIDER_ORDER.map((provider) => {
            const status = byProvider.get(provider) ?? {
              provider,
              enabled: false,
              source: "platform" as const,
              tenant_configured: false,
              client_id: null,
              callback_url: null,
              authority: null,
            };
            return (
              <ProviderCard
                key={provider}
                status={status}
                canWrite={canWrite}
              />
            );
          })}
        </div>
      )}
    </PageLayout>
  );
}
