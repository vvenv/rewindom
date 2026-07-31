import { api } from "@be-water/client-kit";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";


const ERROR_LOGS_KEY = ["error-logs"] as const;

export function useCleanupMyErrorLogs() {
  const { t } = useTranslation("error-log");
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (days: number = 30) => {
      return api.delete<{ deletedCount: number }>(
        `/error-logs/cleanup/my?days=${days}`,
      );
    },
    onSuccess: (data) => {
      toast.success(t("toast.cleanupMySuccess", { count: data.deletedCount }));
      queryClient.invalidateQueries({ queryKey: ERROR_LOGS_KEY });
    },
    onError: (error) => {
      toast.error(t("toast.cleanupFailed"));
      console.error("清理我的错误日志失败:", error);
    },
  });
}
