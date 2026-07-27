import { useEffect, useRef, type RefObject } from "react";

import { cn } from "@be-water/ui/utils";

/**
 * 认证页背景装饰：水。
 *
 * 品牌语言取自 Logo（圆器盛水，水面为太极 S 曲线）与 Wordmark（monoline 单线手写），
 * 所以背景也只用这三样：单线波纹（同一条 S 曲线）、涟漪、上浮气泡。
 *
 * 涟漪全部由指针触发，不自动生成：指针划过留下一串小圈（微风掠过水面），
 * 点击则在该处荡开一圈大的（像有东西从水下游过）。静置时水面只剩缓慢的波纹。
 *
 * 颜色不写死在 JS 里：从容器上的 `--auth-water-*` 变量读，随主题 token 走。
 * hero 面板恒为深色（与文档主题无关），用 `data-surface="deep"` 强制取深水色。
 */

interface Mote {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  /** 上浮速度（px / 16ms） */
  riseSpeed: number;
  /** 左右摆幅（px） */
  sway: number;
  swayOffset: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  /** 扩散速度（px / 16ms） */
  growth: number;
  /** 峰值透明度，随扩散平方衰减到 0 */
  peakAlpha: number;
  lineWidth: number;
}

interface AuthWaterBackgroundProps {
  /** 深水（深色）还是浅水（浅色）配色 */
  isDark: boolean;
  targetRef?: RefObject<HTMLElement | null>;
  className?: string;
}

/** 每 1000px² 的气泡数，保证窄屏与宽屏疏密一致 */
const MOTE_DENSITY = 0.000032;
const MOTE_MAX = 36;
/** 同屏涟漪上限：划得再快也不会堆成一团白 */
const RIPPLE_LIMIT = 16;
/** 指针每移动这么多 px 落一圈「微风」涟漪 */
const BREEZE_STEP = 78;

function createMotes(width: number, height: number): Mote[] {
  const count = Math.min(
    MOTE_MAX,
    Math.max(18, Math.round(width * height * MOTE_DENSITY)),
  );

  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    radius: Math.random() * 1.3 + 0.5,
    alpha: Math.random() * 0.14 + 0.04,
    riseSpeed: Math.random() * 0.05 + 0.015,
    sway: Math.random() * 6 + 2,
    swayOffset: Math.random() * Math.PI * 2,
  }));
}

/**
 * 指针落下的涟漪。
 *
 * `breeze` 是指针划过时不断留下的小圈——像微风掠过水面；
 * `dive` 是点击时的大圈，扩得更远也更慢，像有东西从水下游过。
 */
function createRipple(x: number, y: number, kind: "breeze" | "dive"): Ripple {
  if (kind === "dive") {
    return {
      x,
      y,
      radius: 6,
      maxRadius: 190 + Math.random() * 70,
      growth: 0.62,
      peakAlpha: 0.25,
      lineWidth: 1.2,
    };
  }

  return {
    x,
    y,
    radius: 2,
    maxRadius: 44 + Math.random() * 26,
    growth: 0.3,
    peakAlpha: 0.15,
    lineWidth: 0.9,
  };
}

export function AuthWaterBackground({
  isDark,
  targetRef,
  className,
}: AuthWaterBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const motesRef = useRef<Mote[]>([]);
  const ripplesRef = useRef<Ripple[]>([]);
  const frameRef = useRef(0);
  const clockRef = useRef(0);
  const lastTimeRef = useRef(0);
  const reducedMotionRef = useRef(false);
  const rectRef = useRef<DOMRect | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const travelRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    reducedMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const styles = getComputedStyle(container);
    const readColor = (name: string, fallback: string): string =>
      styles.getPropertyValue(name).trim() || fallback;
    const rippleColor = readColor("--auth-water-ripple", "#0369a1");
    const moteColor = readColor("--auth-water-mote", "#38bdf8");

    const setSize = (): void => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      motesRef.current = createMotes(width, height);
      ripplesRef.current = [];
      rectRef.current = canvas.getBoundingClientRect();
    };

    const drawRipples = (): void => {
      ctx.strokeStyle = rippleColor;

      for (const ripple of ripplesRef.current) {
        const progress = ripple.radius / ripple.maxRadius;
        const fade = (1 - progress) ** 2;

        ctx.lineWidth = ripple.lineWidth;
        ctx.globalAlpha = ripple.peakAlpha * fade;
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
        ctx.stroke();

        // 内圈：一圈孤零零的线像光环，两圈才读得出是水波
        if (ripple.radius > 26) {
          ctx.globalAlpha = ripple.peakAlpha * 0.5 * fade;
          ctx.beginPath();
          ctx.arc(ripple.x, ripple.y, ripple.radius * 0.62, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    };

    const drawMotes = (time: number): void => {
      ctx.fillStyle = moteColor;

      for (const mote of motesRef.current) {
        const x =
          mote.x + Math.sin(time * 0.00028 + mote.swayOffset) * mote.sway;

        ctx.globalAlpha = mote.alpha;
        ctx.beginPath();
        ctx.arc(x, mote.y, mote.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const advance = (width: number, height: number, delta: number): void => {
      const step = delta / 16;

      for (const mote of motesRef.current) {
        mote.y -= mote.riseSpeed * step;
        if (mote.y < -mote.radius) {
          mote.y = height + mote.radius;
          mote.x = Math.random() * width;
        }
      }

      for (const ripple of ripplesRef.current) {
        ripple.radius += ripple.growth * step;
      }
      ripplesRef.current = ripplesRef.current.filter(
        (ripple) => ripple.radius < ripple.maxRadius,
      );
    };

    const render = (width: number, height: number, time: number): void => {
      ctx.clearRect(0, 0, width, height);
      drawRipples();
      drawMotes(time);
      ctx.globalAlpha = 1;
    };

    const draw = (timestamp: number): void => {
      const { width, height } = canvas.getBoundingClientRect();
      // 后台标签页回前台时 timestamp 会跳很大，钳住避免波形瞬移
      const delta =
        lastTimeRef.current === 0
          ? 16
          : Math.min(timestamp - lastTimeRef.current, 64);
      lastTimeRef.current = timestamp;
      clockRef.current += delta;

      advance(width, height, delta);
      render(width, height, clockRef.current);

      frameRef.current = window.requestAnimationFrame(draw);
    };

    const drawStaticFrame = (): void => {
      const { width, height } = canvas.getBoundingClientRect();
      render(width, height, 0);
    };

    setSize();
    if (reducedMotionRef.current) {
      drawStaticFrame();
    } else {
      frameRef.current = window.requestAnimationFrame(draw);
    }

    const resizeObserver = new ResizeObserver(() => {
      setSize();
      if (reducedMotionRef.current) drawStaticFrame();
    });
    resizeObserver.observe(canvas);
    if (targetRef?.current) {
      resizeObserver.observe(targetRef.current);
    }

    // 指针交互：画布是 pointer-events-none（不能挡住表单），
    // 所以在 window 上监听，再把坐标换算进画布自身的坐标系。
    const addRipple = (
      clientX: number,
      clientY: number,
      kind: "breeze" | "dive",
    ): void => {
      const rect = rectRef.current;
      if (!rect || rect.width === 0 || rect.height === 0) return;

      const x = clientX - rect.left;
      const y = clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;

      if (ripplesRef.current.length >= RIPPLE_LIMIT) {
        ripplesRef.current.shift();
      }
      ripplesRef.current.push(createRipple(x, y, kind));
    };

    const handlePointerMove = (event: PointerEvent): void => {
      const last = lastPointerRef.current;
      lastPointerRef.current = { x: event.clientX, y: event.clientY };
      if (!last) return;

      // 按走过的距离而不是按时间落点：移动快慢不同，涟漪间距才一致
      travelRef.current += Math.hypot(
        event.clientX - last.x,
        event.clientY - last.y,
      );
      if (travelRef.current < BREEZE_STEP) return;

      travelRef.current = 0;
      addRipple(event.clientX, event.clientY, "breeze");
    };

    const handlePointerDown = (event: PointerEvent): void => {
      addRipple(event.clientX, event.clientY, "dive");
    };

    const syncRect = (): void => {
      rectRef.current = canvas.getBoundingClientRect();
    };

    if (!reducedMotionRef.current) {
      syncRect();
      window.addEventListener("pointermove", handlePointerMove, {
        passive: true,
      });
      window.addEventListener("pointerdown", handlePointerDown, {
        passive: true,
      });
      window.addEventListener("scroll", syncRect, { passive: true });
      window.addEventListener("resize", syncRect, { passive: true });
    }

    return () => {
      window.cancelAnimationFrame(frameRef.current);
      lastTimeRef.current = 0;
      lastPointerRef.current = null;
      travelRef.current = 0;
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("scroll", syncRect);
      window.removeEventListener("resize", syncRect);
    };
  }, [isDark, targetRef]);

  return (
    <div
      ref={containerRef}
      aria-hidden
      data-surface={isDark ? "deep" : "shallow"}
      className={cn(
        "auth-water-field pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      {isDark ? (
        <>
          <div className="auth-deep-wash absolute inset-0" />
          <div className="animate-auth-current-a absolute -top-1/4 -left-1/4 h-[75%] w-[75%] rounded-full bg-primary/14 blur-[100px]" />
          <div className="animate-auth-current-b absolute top-1/4 -right-1/4 h-[65%] w-[65%] rounded-full bg-brand/8 blur-[90px]" />
          <div className="animate-auth-current-c absolute -bottom-1/4 left-1/5 h-[60%] w-[60%] rounded-full bg-brand/6 blur-[80px]" />
          <div className="auth-caustics absolute inset-0" />
          <div className="auth-waterline-glow absolute inset-x-0 bottom-0 h-1/3" />
        </>
      ) : (
        <>
          <div className="auth-shallow-wash absolute inset-0" />
          <div className="animate-auth-shallow-a absolute -top-40 -left-40 size-112 rounded-full bg-brand/8 blur-[100px]" />
          <div className="animate-auth-shallow-b absolute top-0 -right-40 h-96 w-96 rounded-full bg-primary/5 blur-[90px]" />
          <div className="animate-auth-shallow-c absolute right-1/4 -bottom-32 h-80 w-80 rounded-full bg-brand/6 blur-[80px]" />
          <div className="auth-caustics absolute inset-0" />
        </>
      )}

      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
