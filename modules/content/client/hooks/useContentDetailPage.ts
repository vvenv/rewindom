import { useEffect, useState, type SubmitEvent } from "react";

import { ApiError, useConfirm } from "@rewindom/module-sdk/client";
import { toast } from "@rewindom/ui/toast";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";

import { useContent } from "./useContent.js";
import {
  useDeleteContent,
  useGenerateContent,
  useUpdateContent,
} from "./useContentMutations.js";
import { useBriefFields } from "./useBriefFields.js";
import {
  INITIAL_CONTENT_FORM,
  briefEntriesToValues,
  buildContentPayload,
  displayContentTitle,
  validateBriefForm,
  validateContentForm,
  type ContentFormValues,
} from "../lib/contents.js";

export function useContentDetailPage() {
  const { t } = useTranslation("content");
  const { contentId } = useParams<{ contentId: string }>();
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const query = useContent(contentId ?? null);
  const updateMutation = useUpdateContent();
  const generateMutation = useGenerateContent();
  const deleteMutation = useDeleteContent();
  const [form, setForm] = useState<ContentFormValues>(INITIAL_CONTENT_FORM);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { fields, template } = useBriefFields(form.template_id);

  useEffect(() => {
    if (!query.data) return;
    setForm({
      title: query.data.title,
      body: query.data.body,
      format: query.data.format,
      template_id: query.data.template_id,
      values: briefEntriesToValues(query.data.brief_values),
    });
    setFormError("");
    setFieldErrors({});
  }, [query.data]);

  const generating = query.data?.status === "generating";
  const busy =
    generating ||
    updateMutation.isPending ||
    generateMutation.isPending ||
    deleteMutation.isPending;

  const handleSave = async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();
    if (!query.data) return;
    const validationError = validateContentForm(form, t);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    const briefErrors = validateBriefForm(fields, form.values, t);
    if (Object.keys(briefErrors).length > 0) {
      setFieldErrors(briefErrors);
      setFormError("");
      return;
    }
    setFieldErrors({});
    try {
      await updateMutation.mutateAsync({
        id: query.data.id,
        ...buildContentPayload(form),
      });
      toast.success(t("toastUpdated"));
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : t("updateFailed"));
    }
  };

  const handleGenerate = async (): Promise<void> => {
    if (!query.data) return;
    try {
      await generateMutation.mutateAsync(query.data.id);
      toast.success(t("toastGenerateStarted"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("generateFailed"));
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!query.data) return;
    const confirmed = await confirm({
      title: t("deleteConfirmTitle"),
      description: t("deleteConfirmDescription", {
        title: displayContentTitle(query.data.title, t),
      }),
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(query.data.id);
      toast.success(t("toastDeleted"));
      void navigate("/app/contents");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("deleteFailed"));
    }
  };

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    form,
    setForm,
    formError,
    fieldErrors,
    fields,
    template,
    generating,
    busy,
    isSaving: updateMutation.isPending,
    handleSave,
    handleGenerate,
    handleDelete,
  };
}
