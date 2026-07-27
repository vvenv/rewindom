import { api } from "@be-water/client-kit";
import { useMutation, useQueryClient } from "@tanstack/react-query";


const USERS_KEY = ["users"] as const;

export function useResetPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      api.post<{ password: string }>(`/users/${id}/reset-password`, {
        newPassword: password,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USERS_KEY });
    },
  });
}
