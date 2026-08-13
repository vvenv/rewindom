import { api } from "@rewindom/client-kit";
import { useMutation, useQueryClient } from "@tanstack/react-query";


const USERS_KEY = ["users"] as const;

export function useDeleteUsers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => api.post<void>("/users/batch", { ids }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USERS_KEY });
    },
  });
}
