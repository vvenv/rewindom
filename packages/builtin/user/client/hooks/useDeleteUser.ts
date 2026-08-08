import { api } from "@be-water/client-kit";
import { useMutation, useQueryClient } from "@tanstack/react-query";


const USERS_KEY = ["users"] as const;

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USERS_KEY });
    },
  });
}
