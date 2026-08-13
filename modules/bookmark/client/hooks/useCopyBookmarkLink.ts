import { useCallback, useEffect, useRef, useState } from "react";

import { toast } from "@rewindom/ui/toast";
import { useTranslation } from "react-i18next";

/** 复制成功后图标变对勾的时长（毫秒）。 */
const COPIED_FEEDBACK_MS = 1500;

/**
 * 复制链接到剪贴板，并给出一次性的「已复制」反馈。
 *
 * `navigator.clipboard` 只在安全上下文（https / localhost）里存在，
 * 拿不到时回退成 toast 提示，不能让按钮点下去毫无反应。
 */
export function useCopyBookmarkLink() {
  const { t } = useTranslation("bookmark");
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    },
    [],
  );

  const copy = useCallback(
    async (url: string) => {
      try {
        if (!navigator.clipboard) {
          throw new Error("clipboard unavailable");
        }
        await navigator.clipboard.writeText(url);
        setCopied(true);
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(
          () => setCopied(false),
          COPIED_FEEDBACK_MS,
        );
      } catch {
        toast.error(t("copyFailed"));
      }
    },
    [t],
  );

  return { copied, copy };
}
