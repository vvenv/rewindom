import { api } from "@be-water/client-kit";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";


const ERROR_LOGS_KEY = ["error-logs"] as const;

export function useCleanupMyErrorLogs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (days: number = 30) => {
      return api.delete<{ deletedCount: number }>(
        `/error-logs/cleanup/my?days=${days}`,
      );
    },
    onSuccess: (data) => {
      toast.success(`已清理 ${data.deletedCount} 条我的旧日志`);
      queryClient.invalidateQueries({ queryKey: ERROR_LOGS_KEY });
    },
    onError: (error) => {
      toast.error("清理失败");
      console.error("清理我的错误日志失败:", error);
    },
  });
}
