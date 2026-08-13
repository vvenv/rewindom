import { useState, type ReactNode } from "react";

import { ApiError, CopyButton, FieldInfoTip } from "@rewindom/client-kit";
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

import { useSaveSiteBillingProvider } from "../hooks/useSiteBillingMutations.js";

import type { SiteBillingProviderStatus } from "../../shared/site-billing.js";

function ProviderForm({
  status,
  onClose,
}: {
  status: SiteBillingProviderStatus;
  onClose: () => void;
}) {
  const { t } = useTranslation(["site-billing", "common"]);
  const save = useSaveSiteBillingProvider();
  const [apiKey, setApiKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");

  async function submit(): Promise<void> {
    try {
      await save.mutateAsync({
        // 空串表示「没改」，不是「清空」——输入框里本来就不回显密钥
        ...(apiKey.trim() ? { api_key: apiKey.trim() } : {}),
        ...(webhookSecret.trim() ? { webhook_secret: webhookSecret.trim() } : {}),
      });
      toast.success(t("provider.saved"));
      onClose();
    } catch (err) {
      toast.error(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : t("common:saveFailed"),
      );
    }
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>{t("provider.heading")}</SheetTitle>
        <SheetDescription>{t("provider.description")}</SheetDescription>
      </SheetHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        <FieldGroup>
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
            <FieldLabel
              htmlFor="provider_api_key"
              className="flex items-center gap-1"
            >
              {t("provider.apiKey")}
              <FieldInfoTip text={t("provider.apiKeyHint")} side="left" />
            </FieldLabel>
            <Input
              id="provider_api_key"
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                status.api_key_hint
                  ? t("provider.apiKeyCurrent", { hint: status.api_key_hint })
                  : undefined
              }
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="provider_webhook_secret">
              {t("provider.webhookSecret")}
            </FieldLabel>
            <Input
              id="provider_webhook_secret"
              type="password"
              autoComplete="off"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
            />
            {/* 配没配是当前状态，不是使用说明——这行要常驻可见 */}
            <FieldDescription>
              {status.webhook_secret_set
                ? t("provider.webhookSecretSet")
                : t("provider.webhookSecretMissing")}
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel
              htmlFor="provider_webhook_url"
              className="flex items-center gap-1"
            >
              {t("provider.webhookUrl")}
              <FieldInfoTip text={t("provider.webhookUrlHint")} side="left" />
            </FieldLabel>
            <div className="flex items-center gap-2">
              <Input id="provider_webhook_url" readOnly value={status.webhook_url} />
              <CopyButton text={status.webhook_url} />
            </div>
          </Field>
        </FieldGroup>
      </div>

      {/*
        与全系统同一副脚：取消在前、主按钮在后，只在提交中禁用。

        刻意**不**按「两个框都没填」去灰掉保存——打开就是一颗灰按钮，看不出是坏了
        还是没权限，而系统里其它每张 sheet 打开时保存都是可点的。何况两个框留空本身
        就是合法意图（「维持现状」），存一次是无害的空操作。
      */}
      <SheetFooter>
        <SheetClose asChild>
          <Button type="button" variant="outline" disabled={save.isPending}>
            {t("common:cancel")}
          </Button>
        </SheetClose>
        <Button
          type="button"
          disabled={save.isPending}
          onClick={() => void submit()}
        >
          {save.isPending && <Spinner />}
          {t("common:save")}
        </Button>
      </SheetFooter>
    </>
  );
}

/**
 * 触发按钮 + 表单 + mutation + toast 内聚在一起；调用方只决定 trigger 长什么样。
 *
 * **没有写权限就别渲染这个组件**（见 `SiteBillingProviderStatusRow`）——一张输入框
 * 全灰、只能取消的表单，比没有入口更让人困惑。只读用户在状态行上照样看得到
 * 「钱进谁的账号」。
 */
export function SiteBillingProviderSheet({
  status,
  children,
}: {
  status: SiteBillingProviderStatus;
  children?: ReactNode;
}) {
  const { t } = useTranslation("site-billing");
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children ?? (
          <Button type="button" variant="outline" size="sm">
            {t("provider.configure")}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-xl">
        {/* 只在打开时挂载：关掉即丢弃输入的密钥，下次开是干净的空表单 */}
        {open ? (
          <ProviderForm status={status} onClose={() => setOpen(false)} />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
