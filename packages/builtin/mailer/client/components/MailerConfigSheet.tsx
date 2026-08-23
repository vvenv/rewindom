import { useState, type ReactNode } from "react";

import { ApiError, FieldInfoTip } from "@rewindom/client-kit";
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
import {
  Sheet,
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

import { useUpdateMailerConfig } from "../hooks/useMailerMutations.js";
import {
  buildMailerPayload,
  toMailerFormValues,
  validateMailerForm,
  type MailerFormValues,
} from "../lib/mailer-form.js";

import type { MailerConfigStatus } from "../../shared/index.js";

/** 「跟随平台默认」在 Select 里需要一个非空 value——空串会被当成未选择。 */
const INHERIT = "__inherit__";

function ConfigForm({
  status,
  onClose,
}: {
  status: MailerConfigStatus;
  onClose: () => void;
}) {
  const { t } = useTranslation(["mailer", "common"]);
  const save = useUpdateMailerConfig();
  const [values, setValues] = useState<MailerFormValues>(() =>
    toMailerFormValues(status),
  );

  const set = <K extends keyof MailerFormValues>(
    key: K,
    value: MailerFormValues[K],
  ): void => setValues((prev) => ({ ...prev, [key]: value }));

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    const invalid = validateMailerForm(values);
    if (invalid) {
      toast.error(t(invalid));
      return;
    }
    try {
      await save.mutateAsync(buildMailerPayload(values));
      toast.success(t("config.saved"));
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
    <form className="flex h-full flex-col" onSubmit={(e) => void submit(e)}>
      <SheetHeader>
        <SheetTitle>{t("config.heading")}</SheetTitle>
        <SheetDescription>{t("config.description")}</SheetDescription>
      </SheetHeader>

      <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4">
        <Field>
          <FieldLabel
            htmlFor="mailer_driver"
            className="flex items-center gap-1"
          >
            {t("config.driver")}
            <FieldInfoTip text={t("config.driverHint")} side="left" />
          </FieldLabel>
          <Select
            value={values.driver || INHERIT}
            onValueChange={(value) =>
              set(
                "driver",
                value === INHERIT ? "" : (value as "smtp" | "resend" | "log"),
              )
            }
          >
            <SelectTrigger id="mailer_driver">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              <SelectItem value={INHERIT}>
                {status.resolved_driver
                  ? t("config.driverInheritResolved", {
                      driver: status.resolved_driver,
                    })
                  : t("config.driverInherit")}
              </SelectItem>
              <SelectItem value="smtp">{t("config.driverSmtp")}</SelectItem>
              <SelectItem value="resend">{t("config.driverResend")}</SelectItem>
              <SelectItem value="log">{t("config.driverLog")}</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="mailer_from" className="flex items-center gap-1">
            {t("config.from")}
            <FieldInfoTip text={t("config.fromHint")} side="left" />
          </FieldLabel>
          <Input
            id="mailer_from"
            value={values.from}
            onChange={(e) => set("from", e.target.value)}
            // placeholder 是当前生效值：留空即沿用它，不必手抄一遍
            placeholder={status.resolved_from ?? undefined}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="mailer_smtp_host">
            {t("config.smtpHost")}
          </FieldLabel>
          <Input
            id="mailer_smtp_host"
            value={values.smtp_host}
            onChange={(e) => set("smtp_host", e.target.value)}
            placeholder={status.resolved_smtp_host ?? undefined}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="mailer_smtp_port">
            {t("config.smtpPort")}
          </FieldLabel>
          <Input
            id="mailer_smtp_port"
            inputMode="numeric"
            value={values.smtp_port}
            onChange={(e) => set("smtp_port", e.target.value)}
            placeholder={
              status.resolved_smtp_port === null
                ? undefined
                : String(status.resolved_smtp_port)
            }
          />
        </Field>

        <Field>
          <FieldLabel
            htmlFor="mailer_smtp_secure"
            className="flex items-center gap-1"
          >
            {t("config.smtpSecure")}
            <FieldInfoTip text={t("config.smtpSecureHint")} side="left" />
          </FieldLabel>
          <Select
            value={values.smtp_secure || INHERIT}
            onValueChange={(value) =>
              set(
                "smtp_secure",
                value === INHERIT ? "" : (value as "on" | "off"),
              )
            }
          >
            <SelectTrigger id="mailer_smtp_secure">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              <SelectItem value={INHERIT}>
                {t("config.driverInherit")}
              </SelectItem>
              <SelectItem value="on">{t("common:yes")}</SelectItem>
              <SelectItem value="off">{t("common:no")}</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="mailer_smtp_user">
            {t("config.smtpUser")}
          </FieldLabel>
          <Input
            id="mailer_smtp_user"
            autoComplete="off"
            value={values.smtp_user}
            onChange={(e) => set("smtp_user", e.target.value)}
            placeholder={status.resolved_smtp_user ?? undefined}
          />
        </Field>

        <Field>
          <FieldLabel
            htmlFor="mailer_smtp_password"
            className="flex items-center gap-1"
          >
            {t("config.smtpPassword")}
            <FieldInfoTip text={t("config.smtpPasswordHint")} side="left" />
          </FieldLabel>
          <Input
            id="mailer_smtp_password"
            type="password"
            autoComplete="off"
            value={values.smtp_password}
            onChange={(e) => set("smtp_password", e.target.value)}
          />
          {/* 已存没存是当前状态，不是使用说明——这行要常驻可见 */}
          {status.smtp_password_hint ? (
            <FieldDescription>
              {t("config.smtpPasswordCurrent", {
                hint: status.smtp_password_hint,
              })}
            </FieldDescription>
          ) : null}
        </Field>
      </FieldGroup>

      <SheetFooter>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? <Spinner className="size-4" /> : null}
          {t("config.save")}
        </Button>
      </SheetFooter>
    </form>
  );
}

/**
 * 配置抽屉：trigger + 表单 + mutation + toast 同一组件（Dialog/Sheet 内聚金标准）。
 * 页面只负责放置它，不维护 open。
 */
export function MailerConfigSheet({
  status,
  children,
}: {
  status: MailerConfigStatus;
  children?: ReactNode;
}) {
  const { t } = useTranslation("mailer");
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children ?? <Button variant="outline">{t("config.edit")}</Button>}
      </SheetTrigger>
      <SheetContent>
        {/* 每次打开重建表单，免得上次填了一半的值残留 */}
        {open ? (
          <ConfigForm status={status} onClose={() => setOpen(false)} />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
