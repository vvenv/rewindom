import { useState, type ReactNode } from "react";

import { ApiError, FieldInfoTip, useConfirm } from "@rewindom/client-kit";
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

import { useUpdateTenantOpenai } from "../hooks/useTenantOpenai.js";
import { buildOpenaiKeyPayload } from "../lib/openai-settings-form.js";

import type { TenantLlmStatus } from "@rewindom/shared";

function sourceText(status: TenantLlmStatus, t: (key: string) => string): string {
  if (status.source === "tenant") {
    return t("aiSettings.sourceSite");
  }
  if (status.configured) {
    return t("aiSettings.sourcePlatform");
  }
  return t("aiSettings.sourceNone");
}

function KeyForm({
  status,
  onClose,
}: {
  status: TenantLlmStatus;
  onClose: () => void;
}) {
  const { t } = useTranslation(["platform", "common"]);
  const save = useUpdateTenantOpenai();
  const { confirm } = useConfirm();
  const [apiKey, setApiKey] = useState("");

  async function clearKey(): Promise<void> {
    const confirmed = await confirm({
      title: t("aiSettings.clearTitle"),
      description: t("aiSettings.clearDescription"),
      confirmText: t("aiSettings.clearConfirm"),
      cancelText: t("common:cancel"),
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await save.mutateAsync(buildOpenaiKeyPayload(""));
      toast.success(t("aiSettings.cleared"));
      onClose();
    } catch (err) {
      toast.error(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : t("common:saveFailed"),
      );
    }
  }

  async function submit(): Promise<void> {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      if (status.source === "tenant") {
        await clearKey();
        return;
      }
      onClose();
      return;
    }
    try {
      await save.mutateAsync(buildOpenaiKeyPayload(trimmed));
      toast.success(t("aiSettings.saved"));
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
        <SheetTitle>{t("aiSettings.keyHeading")}</SheetTitle>
        <SheetDescription>{t("aiSettings.keyDescription")}</SheetDescription>
      </SheetHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        <FieldGroup>
          <Alert>
            <AlertDescription>{sourceText(status, t)}</AlertDescription>
          </Alert>

          <Field>
            <FieldLabel
              htmlFor="openai_api_key"
              className="flex items-center gap-1"
            >
              {t("aiSettings.apiKey")}
              <FieldInfoTip text={t("aiSettings.apiKeyHint")} side="left" />
            </FieldLabel>
            <Input
              id="openai_api_key"
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                status.api_key_hint
                  ? t("aiSettings.apiKeyCurrent", {
                      hint: status.api_key_hint,
                    })
                  : undefined
              }
            />
            <FieldDescription>{t("aiSettings.apiKeyLeaveEmpty")}</FieldDescription>
          </Field>
        </FieldGroup>
      </div>

      <SheetFooter>
        {status.source === "tenant" ? (
          <Button
            type="button"
            variant="outline"
            disabled={save.isPending}
            onClick={() => void clearKey()}
          >
            {t("aiSettings.usePlatformDefault")}
          </Button>
        ) : null}
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

export function TenantOpenaiKeySheet({
  status,
  children,
}: {
  status: TenantLlmStatus;
  children?: ReactNode;
}) {
  const { t } = useTranslation("platform");
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children ?? (
          <Button type="button" variant="outline" size="sm">
            {t("aiSettings.configure")}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-xl">
        {open ? (
          <KeyForm status={status} onClose={() => setOpen(false)} />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
