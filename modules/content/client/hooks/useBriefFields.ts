import {
  useContentTemplate,
  useContentTemplatePresets,
} from "./useContentTemplates.js";

import type {
  ContentTemplate,
  ContentTemplateField,
} from "../../shared/index.js";

/**
 * 当前该画哪张字段表。
 *
 * 没选模板时退回「通用创作说明」预设的那一个多行框——服务端的兜底口径与此一致
 * （`fallbackFields`），两边都不为「无模板」另写一条路径。
 */
export function useBriefFields(templateId: string | null): {
  fields: ContentTemplateField[];
  template: ContentTemplate | null;
  isLoading: boolean;
} {
  const templateQuery = useContentTemplate(templateId);
  const presetsQuery = useContentTemplatePresets();

  const fallback =
    presetsQuery.data?.find((preset) => preset.key === "general")?.fields ?? [];

  return {
    fields: templateId ? (templateQuery.data?.fields ?? []) : fallback,
    template: templateId ? (templateQuery.data ?? null) : null,
    isLoading: templateId ? templateQuery.isLoading : presetsQuery.isLoading,
  };
}
