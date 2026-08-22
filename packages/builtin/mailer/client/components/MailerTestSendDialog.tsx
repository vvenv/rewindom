import { useState, type ReactNode } from "react";

import { ApiError } from "@rewindom/client-kit";
import { Button } from "@rewindom/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@rewindom/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
import { Spinner } from "@rewindom/ui/spinner";
import { toast } from "@rewindom/ui/toast";
import { useTranslation } from "react-i18next";

import { useSendTestMail } from "../hooks/useMailerMutations.js";

/**
 * 发一封测试信。trigger + 表单 + mutation + toast 内聚在这一个组件里。
 *
 * 这是整个模块**唯一**能从浏览器触发发信的入口，而且收件人由操作者自己填、
 * 正文写死——不是一个「发任意邮件」的接口。理由见 mailer.routes.ts 顶部注释。
 */
export function MailerTestSendDialog({ children }: { children?: ReactNode }) {
  const { t } = useTranslation(["mailer", "common"]);
  const send = useSendTestMail();
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState("");

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    try {
      await send.mutateAsync(to.trim());
      toast.success(t("test.sent"));
      setOpen(false);
      setTo("");
    } catch (err) {
      toast.error(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : t("common:saveFailed"),
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? <Button variant="outline">{t("test.trigger")}</Button>}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={(e) => void submit(e)}>
          <DialogHeader>
            <DialogTitle>{t("test.heading")}</DialogTitle>
            <DialogDescription>{t("test.description")}</DialogDescription>
          </DialogHeader>

          <FieldGroup className="px-4">
            <Field>
              <FieldLabel htmlFor="mailer_test_to">{t("test.to")}</FieldLabel>
              <Input
                id="mailer_test_to"
                type="email"
                autoComplete="off"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                required
              />
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button type="submit" disabled={send.isPending || !to.trim()}>
              {send.isPending ? <Spinner className="size-4" /> : null}
              {t("test.send")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
