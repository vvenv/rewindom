import { useState, type FormEvent, type ReactElement, type ReactNode } from "react";

import { ApiError, CopyButton, FieldInfoTip } from "@rewindom/module-sdk/client";
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
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@rewindom/ui/sheet";
import { Spinner } from "@rewindom/ui/spinner";
import { toast } from "@rewindom/ui/toast";
import { useTranslation } from "react-i18next";

import { useUpdateShopProvider } from "../hooks/useShop.js";

import type { ShopProviderStatus } from "../../shared/index.js";

function ProviderForm({
  status,
  onClose,
}: {
  status: ShopProviderStatus;
  onClose: () => void;
}): ReactElement {
  const { t } = useTranslation("shop");
  const save = useUpdateShopProvider();
  const [secret, setSecret] = useState("");
  const [webhook, setWebhook] = useState("");
  const [publishable, setPublishable] = useState("");

  const sourceText =
    status.source === "tenant"
      ? t("providerTenant")
      : status.source === "platform"
        ? t("providerPlatform")
        : t("providerNone");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    try {
      await save.mutateAsync({
        ...(secret.trim() ? { secret_key: secret.trim() } : {}),
        ...(webhook.trim() ? { webhook_secret: webhook.trim() } : {}),
        ...(publishable.trim() ? { publishable_key: publishable.trim() } : {}),
      });
      toast.success(t("toastProvider"));
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("updateFailed"));
    }
  };

  return (
    <form className="flex h-full flex-col" onSubmit={(event) => void handleSubmit(event)}>
      <SheetHeader>
        <SheetTitle>{t("providerTitle")}</SheetTitle>
        <SheetDescription>{t("providerDescription")}</SheetDescription>
      </SheetHeader>

      <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4">
        <Alert>
          <AlertDescription>{sourceText}</AlertDescription>
        </Alert>

        <Field>
          <FieldLabel htmlFor="shop-sk" className="flex items-center gap-1">
            {t("secretKey")}
            <FieldInfoTip text={t("infoSecretKey")} side="left" />
          </FieldLabel>
          <Input
            id="shop-sk"
            type="password"
            autoComplete="off"
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            placeholder={
              status.secret_hint
                ? t("secretKeyCurrent", { hint: status.secret_hint })
                : undefined
            }
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="shop-wh">{t("webhookSecret")}</FieldLabel>
          <Input
            id="shop-wh"
            type="password"
            autoComplete="off"
            value={webhook}
            onChange={(event) => setWebhook(event.target.value)}
          />
          <FieldDescription>
            {status.webhook_secret_set
              ? t("webhookSecretSet")
              : t("webhookSecretMissing")}
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="shop-pk" className="flex items-center gap-1">
            {t("publishableKey")}
            <FieldInfoTip text={t("infoPublishableKey")} side="left" />
          </FieldLabel>
          <Input
            id="shop-pk"
            autoComplete="off"
            value={publishable}
            onChange={(event) => setPublishable(event.target.value)}
            placeholder={
              status.publishable_key_hint
                ? t("publishableKeyCurrent", {
                    hint: status.publishable_key_hint,
                  })
                : undefined
            }
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="shop-webhook-url" className="flex items-center gap-1">
            {t("webhookUrl")}
            <FieldInfoTip text={t("infoWebhookUrl")} side="left" />
          </FieldLabel>
          <div className="flex items-center gap-2">
            <Input
              id="shop-webhook-url"
              readOnly
              value={status.webhook_url}
            />
            <CopyButton type="button" text={status.webhook_url} />
          </div>
        </Field>
      </FieldGroup>

      <SheetFooter>
        <SheetClose asChild>
          <Button type="button" variant="outline" disabled={save.isPending}>
            {t("cancel")}
          </Button>
        </SheetClose>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? <Spinner /> : null}
          {t("save")}
        </Button>
      </SheetFooter>
    </form>
  );
}

/**
 * 触发按钮 + 表单 + mutation + toast 内聚；调用方只决定 trigger。
 *
 * 没有写权限就别渲染（见 `ShopProviderStatusRow`）。密钥表单不进设置页，
 * 避免一页两张表、两颗保存。
 */
export function ShopProviderSheet({
  status,
  children,
}: {
  status: ShopProviderStatus;
  children?: ReactNode;
}): ReactElement {
  const { t } = useTranslation("shop");
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children ?? (
          <Button type="button" variant="outline" size="sm">
            {t("providerConfigure")}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="sm:max-w-xl">
        {open ? (
          <ProviderForm status={status} onClose={() => setOpen(false)} />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
