import { api } from "@rewindom/client-kit";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  TranslationStatus,
  TranslationWriteBody,
} from "../../shared/translation.js";

export const TRANSLATION_SETTINGS_KEY = ["settings", "translation"] as const;

export function useTranslationSettings() {
  return useQuery({
    queryKey: [...TRANSLATION_SETTINGS_KEY],
    queryFn: () => api.get<TranslationStatus>("/settings/translation"),
  });
}

export function useUpdateTranslationSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TranslationWriteBody) =>
      api.put<TranslationStatus>("/settings/translation", body),
    onSuccess: (status) => {
      queryClient.setQueryData([...TRANSLATION_SETTINGS_KEY], status);
    },
  });
}
