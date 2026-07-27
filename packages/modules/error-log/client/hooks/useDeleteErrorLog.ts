
import { api } from "@be-water/client-kit";
import { toast } from "@be-water/ui/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const ERROR_LOGS_KEY = ["error-logs"] as const;

export function useDeleteErrorLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      return api.delete<{ success: boolean }>(`/error-logs/${id}`);
    },
    onSuccess: () => {
      toast.success("已删除错误日志");
      queryClient.invalidateQueries({ queryKey: ERROR_LOGS_KEY });
    },
    onError: (error) => {
      toast.error("删除失败");
      console.error("删除错误日志失败:", error);
    },
  });
}
