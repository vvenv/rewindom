import { api } from "@rewindom/module-sdk/client";
import { useQuery } from "@tanstack/react-query";

import type {
  ContentTemplate,
  ContentTemplateListItem,
  ContentTemplatePreset,
} from "../../shared/index.js";

export const CONTENT_TEMPLATES_KEY = ["content-templates"] as const;

export function useContentTemplates() {
  return useQuery({
    queryKey: CONTENT_TEMPLATES_KEY,
    queryFn: () => api.get<ContentTemplateListItem[]>("/content-templates"),
  });
}

export function useContentTemplate(templateId: string | null) {
  return useQuery({
    queryKey: [...CONTENT_TEMPLATES_KEY, templateId],
    queryFn: () => api.get<ContentTemplate>(`/content-templates/${templateId}`),
    enabled: Boolean(templateId),
  });
}

/**
 * 内置预设。跟着界面语言由服务端给——它们是复制出去就变成租户内容的业务文案，
 * 不是 i18next 里的界面 key。
 */
export function useContentTemplatePresets() {
  return useQuery({
    queryKey: [...CONTENT_TEMPLATES_KEY, "presets"],
    queryFn: () =>
      api.get<ContentTemplatePreset[]>("/content-templates/presets"),
  });
}
