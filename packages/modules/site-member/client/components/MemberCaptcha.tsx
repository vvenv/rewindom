import { useCallback, useEffect, useState, type ReactNode } from "react";

import { api } from "@be-water/client-kit";
import { Button } from "@be-water/ui/button";
import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { CaptchaChallenge } from "@be-water/shared";

export interface MemberCaptchaData {
  id: string;
  token: string;
  x: number;
  y: number;
}

/**
 * 会员登录/注册用滑块验证码。复用内核 `/api/captcha/challenge`。
 *
 * **不**在客户端调 `/captcha/verify`：挑战一次性消费，须留给服务端在
 * register/login 里 `CaptchaService.verify`。松手时只把坐标交给父组件。
 */
export function MemberCaptcha({
  onSuccess,
  onError,
}: {
  onSuccess: (data: MemberCaptchaData) => void;
  onError?: () => void;
}): ReactNode {
  const { t } = useTranslation("site-member");
  const [challenge, setChallenge] = useState<CaptchaChallenge | null>(null);
  const [sliderX, setSliderX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setDone(false);
    setSliderX(0);
    setError("");
    try {
      const next = await api.get<CaptchaChallenge>(
        "/captcha/challenge",
        undefined,
        true,
      );
      setChallenge(next);
    } catch {
      setError(t("captcha.failed"));
      onError?.();
    }
  }, [onError, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const finish = useCallback(() => {
    if (!challenge || done) return;
    const x = Math.round((sliderX / 260) * 268 + 16);
    const y = challenge.targetY;
    // 客户端只做粗校验（容差内），最终以服务端 CaptchaService 为准
    const ok =
      Math.abs(x - challenge.targetX) <= 12 &&
      Math.abs(y - challenge.targetY) <= 12;
    if (!ok) {
      setError(t("captcha.failed"));
      onError?.();
      void load();
      return;
    }
    setDone(true);
    onSuccess({ id: challenge.id, token: challenge.token, x, y });
  }, [challenge, done, load, onError, onSuccess, sliderX, t]);

  return (
    <div className="space-y-2">
      <div
        className="relative h-10 select-none rounded-md border bg-muted/40"
        onPointerUp={() => {
          if (!dragging) return;
          setDragging(false);
          finish();
        }}
        onPointerLeave={() => {
          if (dragging) {
            setDragging(false);
            finish();
          }
        }}
        onPointerMove={(event) => {
          if (!dragging || done) return;
          const rect = event.currentTarget.getBoundingClientRect();
          setSliderX(
            Math.max(0, Math.min(event.clientX - rect.left - 20, 260)),
          );
        }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-md bg-primary/15"
          style={{ width: sliderX + 40 }}
        />
        <button
          type="button"
          className="absolute top-0.5 left-0.5 flex size-9 items-center justify-center rounded-md border bg-background shadow-sm"
          style={{ transform: `translateX(${sliderX}px)` }}
          disabled={done || !challenge}
          onPointerDown={(event) => {
            if (done) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            setDragging(true);
          }}
          aria-label={t("captcha.required")}
        >
          →
        </button>
        <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
          {done ? "✓" : t("captcha.required")}
        </p>
      </div>
      <div className="flex items-center justify-between gap-2">
        {error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : (
          <span />
        )}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => void load()}
        >
          <RefreshCw className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
