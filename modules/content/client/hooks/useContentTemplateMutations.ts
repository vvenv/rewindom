import { api } from "@rewindom/module-sdk/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { CONTENT_TEMPLATES_KEY } from "./useContentTemplates.js";

import type {
  ContentTemplate,
  ContentTemplateBody,
} from "../../shared/index.js";

function useInvalidateTemplates() {
  const queryClient = useQueryClient();
  return async (id?: string): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: CONTENT_TEMPLATES_KEY });
    if (id) {
      await queryClient.invalidateQueries({
        queryKey: [...CONTENT_TEMPLATES_KEY, id],
      });
    }
  };
}

export function useCreateContentTemplate() {
  const invalidate = useInvalidateTemplates();
  return useMutation({
    mutationFn: (body: ContentTemplateBody) =>
      api.post<ContentTemplate>("/content-templates", body),
    onSuccess: async () => {
      await invalidate();
    },
  });
}

/** 复制内置预设成租户自己的一份，之后与预设再无关系。 */
export function useCopyContentTemplatePreset() {
  const invalidate = useInvalidateTemplates();
  return useMutation({
    mutationFn: (presetKey: string) =>
      api.post<ContentTemplate>("/content-templates", {
        preset_key: presetKey,
      }),
    onSuccess: async () => {
      await invalidate();
    },
  });
}

export function useUpdateContentTemplate() {
  const invalidate = useInvalidateTemplates();
  return useMutation({
    mutationFn: ({ id, ...body }: ContentTemplateBody & { id: string }) =>
      api.put<ContentTemplate>(`/content-templates/${id}`, body),
    onSuccess: async (template) => {
      await invalidate(template.id);
    },
  });
}

export function useDeleteContentTemplate() {
  const invalidate = useInvalidateTemplates();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ deleted: boolean }>(`/content-templates/${id}`),
    onSuccess: async () => {
      await invalidate();
    },
  });
}
