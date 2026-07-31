import { useCallback, useEffect, useRef, useState } from "react";

import { api, isTransientApiError } from "@be-water/client-kit";
import { Button } from "@be-water/ui/button";
import { ArrowRight, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { CaptchaChallenge } from "@be-water/shared";



interface SliderCaptchaProps {
  onSuccess: (data: {
    id: string;
    token: string;
    x: number;
    y: number;
  }) => void;
  onError?: (error: string) => void;
  width?: number;
  height?: number;
}

export function SliderCaptcha({
  onSuccess,
  onError,
  width = 300,
  height = 150,
}: SliderCaptchaProps) {
  const { t } = useTranslation("shell");
  const [challenge, setChallenge] = useState<CaptchaChallenge | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sliderX, setSliderX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [interferencePatterns, setInterferencePatterns] = useState<
    Array<{
      left: number;
      top: number;
      type: "line" | "circle" | "rect";
      rotation?: number;
      color: string;
    }>
  >([]);

  const sliderRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const hasMounted = useRef(false);

  const fetchChallenge = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    setIsVerified(false);
    setSliderX(0);
    try {
      const challenge = await (async () => {
        const maxAttempts = 3;
        let lastError: unknown;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          try {
            return await api.get<CaptchaChallenge>(
              "/captcha/challenge",
              undefined,
              true,
            );
          } catch (error) {
            lastError = error;
            if (!isTransientApiError(error) || attempt === maxAttempts - 1) {
              throw error;
            }
            await new Promise((resolve) =>
              setTimeout(resolve, 800 * (attempt + 1)),
            );
          }
        }
        throw lastError;
      })();
      setChallenge(challenge);

      // Generate random interference patterns
      const patterns = Array.from({ length: 6 }, () => ({
        left: Math.random() * 60 + 10,
        top: Math.random() * 40 + 20,
        type: (["line", "circle", "rect"] as const)[
          Math.floor(Math.random() * 3)
        ],
        rotation: Math.random() * 360,
        color: `hsl(${Math.random() * 360}, 70%, 50%)`,
      }));
      setInterferencePatterns(patterns);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("auth.captcha.loadFailed");
      setErrorMessage(message);
      onError?.(message);
    } finally {
      setIsLoading(false);
    }
  }, [onError, t]);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      fetchChallenge();
    }
  }, [fetchChallenge]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isVerified || !challenge) return;
    setIsDragging(true);
    e.preventDefault();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isVerified || !challenge) return;
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !trackRef.current) return;

      const trackRect = trackRef.current.getBoundingClientRect();
      const newX = Math.max(
        0,
        Math.min(e.clientX - trackRect.left, trackRect.width - 40),
      );
      setSliderX(newX);
    },
    [isDragging],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging || !trackRef.current) return;

      const trackRect = trackRef.current.getBoundingClientRect();
      const touch = e.touches[0];
      const newX = Math.max(
        0,
        Math.min(touch.clientX - trackRect.left, trackRect.width - 40),
      );
      setSliderX(newX);
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(async () => {
    if (!isDragging || !challenge) return;
    setIsDragging(false);

    const trackRect = trackRef.current?.getBoundingClientRect();
    const trackWidth = trackRect?.width || width;
    const percentage = sliderX / (trackWidth - 40);
    const x = Math.round(percentage * 268 + 16); // Map to 16-284 range
    const y = challenge.targetY; // Use the actual targetY from challenge

    try {
      const result = await api.post<{ valid: boolean }>(
        "/captcha/verify",
        {
          id: challenge.id,
          token: challenge.token,
          x,
          y,
        },
        undefined,
        true,
      );

      if (result.valid) {
        setIsVerified(true);
        onSuccess({ id: challenge.id, token: challenge.token, x, y });
      } else {
        setErrorMessage(t("auth.captcha.verifyFailedRetry"));
        onError?.(t("auth.captcha.verifyFailed"));
        setTimeout(() => {
          setSliderX(0);
          setErrorMessage("");
          fetchChallenge();
        }, 1000);
      }
    } catch (_error) {
      setErrorMessage(t("auth.captcha.verifyFailedRetry"));
      onError?.(t("auth.captcha.verifyFailed"));
      setTimeout(() => {
        setSliderX(0);
        setErrorMessage("");
        fetchChallenge();
      }, 1000);
    }
  }, [
    isDragging,
    challenge,
    sliderX,
    width,
    onSuccess,
    onError,
    fetchChallenge,
    t,
  ]);

  const handleTouchEnd = useCallback(async () => {
    if (!isDragging || !challenge) return;
    setIsDragging(false);

    const trackRect = trackRef.current?.getBoundingClientRect();
    const trackWidth = trackRect?.width || width;
    const percentage = sliderX / (trackWidth - 40);
    const x = Math.round(percentage * 268 + 16); // Map to 16-284 range
    const y = challenge.targetY; // Use the actual targetY from challenge

    try {
      const result = await api.post<{ valid: boolean }>(
        "/captcha/verify",
        {
          id: challenge.id,
          token: challenge.token,
          x,
          y,
        },
        undefined,
        true,
      );

      if (result.valid) {
        setIsVerified(true);
        onSuccess({ id: challenge.id, token: challenge.token, x, y });
      } else {
        setErrorMessage(t("auth.captcha.verifyFailedRetry"));
        onError?.(t("auth.captcha.verifyFailed"));
        setTimeout(() => {
          setSliderX(0);
          setErrorMessage("");
          fetchChallenge();
        }, 1000);
      }
    } catch (_error) {
      setErrorMessage(t("auth.captcha.verifyFailedRetry"));
      onError?.(t("auth.captcha.verifyFailed"));
      setTimeout(() => {
        setSliderX(0);
        setErrorMessage("");
        fetchChallenge();
      }, 1000);
    }
  }, [
    isDragging,
    challenge,
    sliderX,
    width,
    onSuccess,
    onError,
    fetchChallenge,
    t,
  ]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleTouchEnd);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        window.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("touchend", handleTouchEnd);
      };
    }
  }, [
    isDragging,
    handleMouseMove,
    handleMouseUp,
    handleTouchMove,
    handleTouchEnd,
  ]);

  const sliderWidth = width - 40;
  const progress = (sliderX / sliderWidth) * 100;

  return (
    <div className="flex flex-col gap-3 items-center">
      <div
        className="relative bg-muted rounded overflow-hidden select-none"
        style={{ width, height }}
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-20">
          <svg width={width} height={height} xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="grid"
                width="30"
                height="30"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 30 0 L 0 0 0 30"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Interference patterns */}
        {interferencePatterns.map((pattern, index) => (
          <div
            key={index}
            className={`absolute opacity-20 ${
              pattern.type === "line"
                ? "h-1"
                : pattern.type === "circle"
                  ? "w-8 h-8 border-2 rounded-full"
                  : "size-6 rounded"
            }`}
            style={{
              left: `${pattern.left}%`,
              top: `${pattern.top}%`,
              backgroundColor:
                pattern.type !== "circle" ? pattern.color : undefined,
              borderColor:
                pattern.type === "circle" ? pattern.color : undefined,
              width:
                pattern.type === "line"
                  ? index % 2 === 0
                    ? "4rem"
                    : "3rem"
                  : undefined,
              transform: pattern.rotation
                ? `rotate(${pattern.rotation}deg)`
                : undefined,
            }}
          />
        ))}

        {/* Target position indicator */}
        {challenge && (
          <div
            className="absolute w-8 h-8 bg-primary/30 border-2 border-primary-foreground rounded flex items-center justify-center box-content"
            style={{
              left: `${challenge.targetX}px`,
              top: `${challenge.targetY}px`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div className="size-4 bg-primary-foreground rounded-full" />
          </div>
        )}

        {/* Puzzle piece that follows slider */}
        <div
          className="absolute w-8 h-8 bg-primary border-2 border-primary rounded flex items-center justify-center shadow-lg opacity-50"
          style={{
            left: `${(sliderX / (width - 40)) * 268 + 16}px`,
            top: `${challenge?.targetY || 50}px`,
            transform: "translate(-50%, -50%)",
            transition: isDragging ? "none" : "left 0.2s ease-out",
          }}
        >
          <div className="size-4 bg-white rounded-full" />
        </div>

        {/* Refresh button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={fetchChallenge}
          disabled={isLoading}
          className="absolute top-2 right-2"
          aria-label={t("auth.captcha.refresh")}
        >
          <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Slider track */}
      <div
        ref={trackRef}
        className="relative h-8 bg-muted rounded overflow-hidden cursor-pointer"
        style={{ width }}
      >
        {/* Progress background */}
        <div
          className="absolute inset-y-0 left-0 bg-primary/20"
          style={{ width: `${progress}%` }}
        />

        {/* Slider text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-muted-foreground">
            {isVerified
              ? t("auth.captcha.verified")
              : errorMessage || t("auth.captcha.dragHint")}
          </span>
        </div>

        {/* Slider handle */}
        <div
          ref={sliderRef}
          className={`absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing transition-colors ${
            isVerified
              ? "bg-green-500"
              : errorMessage
                ? "bg-destructive"
                : "bg-primary"
          } ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
          style={{ left: sliderX }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {isVerified ? (
            <span className="text-white text-lg">✓</span>
          ) : errorMessage ? (
            <span className="text-white text-lg">✗</span>
          ) : (
            <ArrowRight className="text-white size-5" />
          )}
        </div>
      </div>
    </div>
  );
}
