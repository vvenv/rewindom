import { api } from "@rewindom/module-sdk/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { CONTENTS_KEY } from "./useContents.js";

import type {
  Content,
  ContentAsset,
  CreateContentBody,
  UpdateContentBody,
} from "../../shared/index.js";

async function invalidateContents(
  queryClient: ReturnType<typeof useQueryClient>,
  id?: string,
): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: CONTENTS_KEY });
  if (id) {
    await queryClient.invalidateQueries({ queryKey: ["contents", id] });
  }
}

export function useCreateContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateContentBody) =>
      api.post<Content>("/contents", body),
    onSuccess: async () => {
      await invalidateContents(queryClient);
    },
  });
}

export function useUpdateContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateContentBody & { id: string }) =>
      api.patch<Content>(`/contents/${id}`, body),
    onSuccess: async (content) => {
      await invalidateContents(queryClient, content.id);
    },
  });
}

export function useDeleteContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ deleted: boolean }>(`/contents/${id}`),
    onSuccess: async () => {
      await invalidateContents(queryClient);
    },
  });
}

export function useGenerateContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<Content>(`/contents/${id}/generate`, {}),
    onSuccess: async (content) => {
      await invalidateContents(queryClient, content.id);
    },
  });
}

export function useAddContentFileAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => {
      const form = new FormData();
      form.append("file", file);
      return api.upload<ContentAsset>(`/contents/${id}/assets`, form);
    },
    onSuccess: async (_asset, variables) => {
      await invalidateContents(queryClient, variables.id);
    },
  });
}

export function useAddContentTextAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      text_body,
      filename,
    }: {
      id: string;
      text_body: string;
      filename?: string;
    }) =>
      api.post<ContentAsset>(`/contents/${id}/assets`, {
        kind: "text",
        text_body,
        filename,
      }),
    onSuccess: async (_asset, variables) => {
      await invalidateContents(queryClient, variables.id);
    },
  });
}

export function useDeleteContentAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      contentId,
      assetId,
    }: {
      contentId: string;
      assetId: string;
    }) =>
      api.delete<{ deleted: boolean }>(
        `/contents/${contentId}/assets/${assetId}`,
      ),
    onSuccess: async (_result, variables) => {
      await invalidateContents(queryClient, variables.contentId);
    },
  });
}
