import { useEffect, useState, type FormEvent } from "react";

import { ApiError, FieldInfoTip, PageLayout, usePermissions } from "@rewindom/module-sdk/client";
import { Button } from "@rewindom/ui/button";
import { Field, FieldGroup, FieldLabel } from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
import { Switch } from "@rewindom/ui/switch";
import { toast } from "@rewindom/ui/toast";
import { Settings } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  useShopSettings,
  useUpdateShopProvider,
  useUpdateShopSettings,
} from "../hooks/useShop.js";

export function SettingsPage() {
  const { t } = useTranslation("shop");
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("shop.write");
  const { data } = useShopSettings();
  const updateSetting = useUpdateShopSettings();
  const updateProvider = useUpdateShopProvider();
  const [currency, setCurrency] = useState("USD");
  const [origin, setOrigin] = useState("CN");
  const [ioss, setIoss] = useState("");
  const [eori, setEori] = useState("");
  const [stripeTax, setStripeTax] = useState(false);
  const [secret, setSecret] = useState("");
  const [webhook, setWebhook] = useState("");
  const [publishable, setPublishable] = useState("");

  useEffect(() => {
    if (!data) return;
    setCurrency(data.setting.currency);
    setOrigin(data.setting.origin_country);
    setIoss(data.setting.ioss_number ?? "");
    setEori(data.setting.eori_number ?? "");
    setStripeTax(data.setting.stripe_tax_enabled);
  }, [data]);

  const handleSetting = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await updateSetting.mutateAsync({
        currency,
        origin_country: origin,
        ioss_number: ioss,
        eori_number: eori,
        stripe_tax_enabled: stripeTax,
      });
      toast.success(t("toastSetting"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("updateFailed"));
    }
  };

  const handleProvider = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await updateProvider.mutateAsync({
        secret_key: secret || undefined,
        webhook_secret: webhook || undefined,
        publishable_key: publishable || undefined,
      });
      toast.success(t("toastProvider"));
      setSecret("");
      setWebhook("");
      setPublishable("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("updateFailed"));
    }
  };

  const providerHint =
    data?.provider.source === "tenant"
      ? t("providerTenant")
      : data?.provider.source === "platform"
        ? t("providerPlatform")
        : t("providerNone");

  return (
    <PageLayout
      icon={Settings}
      title={t("settingsTitle")}
      description={t("settingsDescription")}
      action={null}
    >
      <div className="flex max-w-xl flex-col gap-8">
        <p className="text-muted-foreground text-sm">{providerHint}</p>
        <form className="flex flex-col gap-4" onSubmit={handleSetting}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="currency">{t("currency")}</FieldLabel>
              <Input
                id="currency"
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                disabled={!canWrite}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="origin">{t("originCountry")}</FieldLabel>
              <Input
                id="origin"
                value={origin}
                onChange={(event) => setOrigin(event.target.value)}
                disabled={!canWrite}
                maxLength={2}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="ioss" className="flex items-center gap-1">
                {t("ioss")}
                <FieldInfoTip text={t("infoIoss")} side="left" />
              </FieldLabel>
              <Input
                id="ioss"
                value={ioss}
                onChange={(event) => setIoss(event.target.value)}
                disabled={!canWrite}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="eori">{t("eori")}</FieldLabel>
              <Input
                id="eori"
                value={eori}
                onChange={(event) => setEori(event.target.value)}
                disabled={!canWrite}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="stripe-tax">{t("stripeTax")}</FieldLabel>
              <Switch
                id="stripe-tax"
                checked={stripeTax}
                onCheckedChange={setStripeTax}
                disabled={!canWrite}
              />
            </Field>
          </FieldGroup>
          {canWrite ? <Button type="submit">{t("save")}</Button> : null}
        </form>

        {canWrite ? (
          <form className="flex flex-col gap-4" onSubmit={handleProvider}>
            <h2 className="text-lg font-medium">{t("providerTitle")}</h2>
            <Field>
              <FieldLabel htmlFor="sk">{t("secretKey")}</FieldLabel>
              <Input
                id="sk"
                type="password"
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
                placeholder={data?.provider.secret_hint ?? ""}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="wh">{t("webhookSecret")}</FieldLabel>
              <Input
                id="wh"
                type="password"
                value={webhook}
                onChange={(event) => setWebhook(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="pk">{t("publishableKey")}</FieldLabel>
              <Input
                id="pk"
                value={publishable}
                onChange={(event) => setPublishable(event.target.value)}
                placeholder={data?.provider.publishable_key_hint ?? ""}
              />
            </Field>
            <Button type="submit">{t("saveProvider")}</Button>
          </form>
        ) : null}
      </div>
    </PageLayout>
  );
}
