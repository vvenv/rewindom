import { useCallback } from "react";

import { useConfirm } from "@rewindom/module-sdk/client";
import { Button } from "@rewindom/ui/button";
import { toast } from "@rewindom/ui/toast";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  useDeleteFormSubmission,
  type FormSubmissionListItem,
} from "../hooks/useFormSubmissions.js";
import { submissionSource } from "../lib/form-submissions.js";

/**
 * 行内删除：确认 + mutation + toast 内聚在一处（弹层内聚金标准的行内版）。
 *
 * 提交里常有访客留的联系方式，删除是不可逆的，所以走 destructive 确认而不是直接删。
 */
export function FormSubmissionRowActions({
  submission,
}: {
  submission: FormSubmissionListItem;
}) {
  const { t } = useTranslation("site-form");
  const { confirm } = useConfirm();
  const deleteMutation = useDeleteFormSubmission();

  const handleDelete = useCallback(async () => {
    const confirmed = await confirm({
      title: t("formSubmissions.deleteConfirmTitle"),
      description: t("formSubmissions.deleteConfirmDescription", {
        source: submissionSource(submission),
      }),
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(submission.id);
      toast.success(t("formSubmissions.deleted"));
    } catch {
      toast.error(t("formSubmissions.deleteFailed"));
    }
  }, [confirm, deleteMutation, submission, t]);

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={t("formSubmissions.delete")}
      disabled={deleteMutation.isPending}
      onClick={() => void handleDelete()}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
