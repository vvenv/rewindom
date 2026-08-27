import { api } from "@rewindom/module-sdk/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  CreateThingBody,
  Thing,
  UpdateThingBody,
} from "../../shared/index.js";

export function useCreateThing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateThingBody) => api.post<Thing>("/things", body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["things"] });
    },
  });
}

export function useUpdateThing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateThingBody & { id: string }) =>
      api.patch<Thing>(`/things/${id}`, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["things"] });
    },
  });
}

export function useDeleteThing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ deleted: boolean }>(`/things/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["things"] });
    },
  });
}
