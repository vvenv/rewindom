import { api } from "@rewindom/client-kit";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { MAILER_KEY } from "./useMailer.js";

import type {
  MailerConfigStatus,
  MailerConfigWriteBody,
} from "../../shared/index.js";

interface SendResult {
  delivery_id: string;
  status: "queued" | "sent";
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [...MAILER_KEY] });
}

export function useUpdateMailerConfig() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (body: MailerConfigWriteBody) =>
      api.put<MailerConfigStatus>("/mailer/config", body),
    onSuccess: invalidate,
  });
}

export function useSendTestMail() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (to: string) => api.post<SendResult>("/mailer/test", { to }),
    // 测试信也会落一条投递记录，列表要跟着刷新
    onSuccess: invalidate,
  });
}

export function useRetryDelivery() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (deliveryId: string) =>
      api.post<SendResult>(`/mailer/${deliveryId}/retry`, {}),
    onSuccess: invalidate,
  });
}
