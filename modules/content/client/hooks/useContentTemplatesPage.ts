import { useState } from "react";

import { ApiError, useConfirm } from "@rewindom/module-sdk/client";
import { toast } from "@rewindom/ui/toast";
import { useTranslation } from "react-i18next";

import {
  useCopyContentTemplatePreset,
  useDeleteContentTemplate,
} from "./useContentTemplateMutations.js";
import {
  useContentTemplatePresets,
  useContentTemplates,
} from "./useContentTemplates.js";

import type { ContentTemplateListItem } from "../../shared/index.js";

export function useContentTemplatesPage() {
  const { t } = useTranslation("content");
  const { confirm } = useConfirm();
  const templatesQuery = useContentTemplates();
  const presetsQuery = useContentTemplatePresets();
  const copyMutation = useCopyContentTemplatePreset();
  const deleteMutation = useDeleteContentTemplate();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const openEditor = (templateId: string | null): void => {
    setEditingId(templateId);
    setEditorOpen(true);
  };

  const handleCopyPreset = async (presetKey: string): Promise<void> => {
    try {
      const template = await copyMutation.mutateAsync(presetKey);
      toast.success(t("template.toastCopied"));
      // 复制完直接打开：预设是初稿，租户十有八九要按自己的口径改一遍
      openEditor(template.id);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : t("template.copyFailed"),
      );
    }
  };

  const handleDelete = async (
    template: ContentTemplateListItem,
  ): Promise<void> => {
    const confirmed = await confirm({
      title: t("template.deleteConfirmTitle"),
      description: t("template.deleteConfirmDescription", {
        name: template.name,
      }),
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(template.id);
      toast.success(t("template.toastDeleted"));
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : t("template.deleteFailed"),
      );
    }
  };

  return {
    templates: templatesQuery.data ?? [],
    presets: presetsQuery.data ?? [],
    isLoading: templatesQuery.isLoading,
    isError: templatesQuery.isError,
    error: templatesQuery.error,
    refetch: templatesQuery.refetch,
    busy: copyMutation.isPending || deleteMutation.isPending,
    editorOpen,
    editingId,
    setEditorOpen,
    openEditor,
    handleCopyPreset,
    handleDelete,
  };
}
