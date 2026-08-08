
import { api } from "@be-water/client-kit";
import { toast } from "@be-water/ui/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

const ERROR_LOGS_KEY = ["error-logs"] as const;

export function useDeleteErrorLog() {
  const { t } = useTranslation("error-log");
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      return api.delete<{ success: boolean }>(`/error-logs/${id}`);
    },
    onSuccess: () => {
      toast.success(t("toast.deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: ERROR_LOGS_KEY });
    },
    onError: (error) => {
      toast.error(t("toast.deleteFailed"));
      console.error("删除错误日志失败:", error);
    },
  });
}
