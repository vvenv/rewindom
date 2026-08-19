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

import { useUpdateTranslationSettings } from "../hooks/useTranslationSettings.js";
import { buildTranslationKeyPayload } from "../lib/translation-settings-form.js";

import type { TranslationStatus } from "../../shared/translation.js";

function KeyForm({
  status,
  onClose,
}: {
  status: TranslationStatus;
  onClose: () => void;
}) {
  const { t } = useTranslation(["translation", "common"]);
  const save = useUpdateTranslationSettings();
  const { confirm } = useConfirm();
  const [apiKey, setApiKey] = useState("");

  async function clearKey(): Promise<void> {
    const confirmed = await confirm({
      title: t("settings.clearTitle"),
      description: t("settings.clearDescription"),
      confirmText: t("settings.clearConfirm"),
      cancelText: t("common:cancel"),
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await save.mutateAsync(buildTranslationKeyPayload(""));
      toast.success(t("settings.cleared"));
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
      if (status.has_api_key) {
        await clearKey();
        return;
      }
      onClose();
      return;
    }
    try {
      await save.mutateAsync(buildTranslationKeyPayload(trimmed));
      toast.success(t("settings.keySaved"));
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
        <SheetTitle>{t("settings.apiKey")}</SheetTitle>
        <SheetDescription>{t("settings.apiKeyDescription")}</SheetDescription>
      </SheetHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        <FieldGroup>
          <Alert>
            <AlertDescription>
              {status.has_api_key
                ? t("settings.apiKeyConfigured", {
                    hint: status.api_key_hint ?? "",
                  })
                : t("settings.apiKeyEmpty")}
            </AlertDescription>
          </Alert>

          <Field>
            <FieldLabel
              htmlFor="translation_api_key"
              className="flex items-center gap-1"
            >
              {t("settings.apiKey")}
              <FieldInfoTip text={t("settings.apiKeyHint")} side="left" />
            </FieldLabel>
            <Input
              id="translation_api_key"
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                status.api_key_hint
                  ? t("settings.apiKeyCurrent", {
                      hint: status.api_key_hint,
                    })
                  : undefined
              }
            />
            <FieldDescription>
              {t("settings.apiKeyLeaveEmpty")}
            </FieldDescription>
          </Field>
        </FieldGroup>
      </div>

      <SheetFooter>
        {status.has_api_key ? (
          <Button
            type="button"
            variant="outline"
            disabled={save.isPending}
            onClick={() => void clearKey()}
          >
            {t("settings.clearKey")}
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

export function TranslationApiKeySheet({
  status,
  children,
}: {
  status: TranslationStatus;
  children?: ReactNode;
}) {
  const { t } = useTranslation("translation");
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children ?? (
          <Button type="button" variant="outline" size="sm">
            {t("settings.configure")}
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
