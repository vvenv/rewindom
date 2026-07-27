import { toast as sonnerToast } from "sonner";

export const toast = {
  ...sonnerToast,
  success: (
    message: string,
    options?: Parameters<typeof sonnerToast.success>[1],
  ) => {
    return sonnerToast.success(message, {
      className: "!border-green-500/50 !text-green-600",
      ...options,
    });
  },
  error: (
    message: string,
    options?: Parameters<typeof sonnerToast.error>[1],
  ) => {
    return sonnerToast.error(message, {
      className: "!border-destructive/50 !text-destructive",
      ...options,
    });
  },
};
