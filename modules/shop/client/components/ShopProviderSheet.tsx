import { useState, type ReactElement, type ReactNode } from "react";

import { ApiError, FieldInfoTip } from "@rewindom/module-sdk/client";
import { Alert, AlertDescription } from "@rewindom/ui/alert";
import { Button } from "@rewindom/ui/button";
import { Field, FieldGroup, FieldLabel } from "@rewindom/ui/field";
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

  async function submit(): Promise<void> {
    const body = {
      ...(secret.trim() ? { secret_key: secret.trim() } : {}),
      ...(webhook.trim() ? { webhook_secret: webhook.trim() } : {}),
      ...(publishable.trim() ? { publishable_key: publishable.trim() } : {}),
    };
    if (Object.keys(body).length === 0) {
      onClose();
      return;
    }
    try {
      await save.mutateAsync(body);
      toast.success(t("toastProvider"));
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("updateFailed"));
    }
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>{t("providerTitle")}</SheetTitle>
        <SheetDescription>{t("providerDescription")}</SheetDescription>
      </SheetHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        <FieldGroup>
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
              placeholder={status.secret_hint ?? ""}
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
          </Field>
          <Field>
            <FieldLabel htmlFor="shop-pk">{t("publishableKey")}</FieldLabel>
            <Input
              id="shop-pk"
              autoComplete="off"
              value={publishable}
              onChange={(event) => setPublishable(event.target.value)}
              placeholder={status.publishable_key_hint ?? ""}
            />
          </Field>
        </FieldGroup>
      </div>

      <SheetFooter>
        <SheetClose asChild>
          <Button type="button" variant="outline" disabled={save.isPending}>
            {t("cancel")}
          </Button>
        </SheetClose>
        <Button
          type="button"
          disabled={save.isPending}
          onClick={() => void submit()}
        >
          {save.isPending ? <Spinner /> : null}
          {t("save")}
        </Button>
      </SheetFooter>
    </>
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
      <SheetContent className="flex w-full flex-col sm:max-w-xl">
        {open ? (
          <ProviderForm status={status} onClose={() => setOpen(false)} />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
