import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type MouseEvent,
  type PointerEvent,
} from "react";

import { type LinkProps, Link } from "react-router";

import { cn } from "@be-water/ui/utils";

const FAB_SIZE = 56;
const TAB_BAR_HEIGHT = 64;
const SNAP_MARGIN = 16;
const BOTTOM_SAFE_GAP = 16;
const DRAG_THRESHOLD = 5;

export const FAB_TRIGGER_CLASSNAME =
  "fixed bottom-24 right-4 z-50 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg " +
  "md:static md:z-auto md:inline-flex md:h-10 md:w-auto md:gap-1.5 md:rounded-md md:px-4 md:py-2 md:text-sm md:font-medium md:shadow-none md:hover:bg-primary/90 " +
  "touch-none";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function isTouchDevice() {
  return typeof window !== "undefined" && "ontouchstart" in window;
}

export function useDraggableFab(storageKey = "app_fab_position") {
  const fabRef = useRef<HTMLElement | null>(null);
  const wasDragged = useRef(false);
  const dragState = useRef<{
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
    vw: number;
    vh: number;
    maxY: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null,
  );

  useEffect(() => {
    if (!isTouchDevice()) return;
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        setPosition(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  const persistPosition = useCallback(
    (pos: { x: number; y: number }) => {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(pos));
      } catch {
        // ignore
      }
    },
    [storageKey],
  );

  const handlePointerDown = useCallback((e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== "touch") return;

    const btn = fabRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const safeAreaBottom = (() => {
      const el = document.createElement("div");
      el.style.cssText =
        "position:fixed;bottom:0;pointer-events:none;height:env(safe-area-inset-bottom,0px)";
      document.body.appendChild(el);
      const h = parseFloat(getComputedStyle(el).height) || 0;
      document.body.removeChild(el);
      return h;
    })();
    const maxY =
      vh - FAB_SIZE - (TAB_BAR_HEIGHT + safeAreaBottom + BOTTOM_SAFE_GAP);

    wasDragged.current = false;
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      vw,
      vh,
      maxY,
    };
  }, []);

  useEffect(() => {
    const btn = fabRef.current;
    if (!btn) return;

    const handleMove = (ev: globalThis.PointerEvent) => {
      const ds = dragState.current;
      if (!ds || ev.pointerType !== "touch") return;

      const dx = ev.clientX - ds.startX;
      const dy = ev.clientY - ds.startY;

      if (!wasDragged.current) {
        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
          wasDragged.current = true;
          setDragging(true);
        } else {
          return;
        }
      }

      ev.preventDefault();
      const newX = clamp(ev.clientX - ds.offsetX, 0, ds.vw - FAB_SIZE);
      const newY = clamp(ev.clientY - ds.offsetY, 0, ds.maxY);
      setPosition({ x: newX, y: newY });
    };

    const handleUp = (ev: globalThis.PointerEvent) => {
      const ds = dragState.current;
      if (!ds || ev.pointerType !== "touch") return;

      if (wasDragged.current) {
        const finalX = ev.clientX - ds.offsetX;
        const snapRight = ds.vw - FAB_SIZE - SNAP_MARGIN;
        const snappedX =
          finalX + FAB_SIZE / 2 > ds.vw / 2 ? snapRight : SNAP_MARGIN;
        const snappedY = clamp(ev.clientY - ds.offsetY, 0, ds.maxY);

        const snapped = { x: snappedX, y: snappedY };
        setPosition(snapped);
        persistPosition(snapped);
      }

      setDragging(false);
      dragState.current = null;
    };

    btn.addEventListener("pointermove", handleMove, { passive: false });
    btn.addEventListener("pointerup", handleUp);

    return () => {
      btn.removeEventListener("pointermove", handleMove);
      btn.removeEventListener("pointerup", handleUp);
    };
  }, [persistPosition]);

  const handleClick = useCallback((e: MouseEvent<HTMLElement>) => {
    if (wasDragged.current) {
      e.preventDefault();
      e.stopPropagation();
      wasDragged.current = false;
    }
  }, []);

  const style: React.CSSProperties | undefined = position
    ? {
        position: "fixed",
        left: position.x,
        top: position.y,
        bottom: "auto",
        right: "auto",
        touchAction: "none",
        transition: dragging ? "none" : "left 0.2s ease, top 0.2s ease",
        zIndex: 50,
      }
    : undefined;

  return {
    fabRef,
    style,
    handlePointerDown,
    handleClick,
    className: FAB_TRIGGER_CLASSNAME,
  };
}

export function DraggableFab({
  to,
  storageKey = "app_fab_position",
  children,
}: {
  to: LinkProps["to"];
  storageKey?: string;
  children: React.ReactNode;
}) {
  const { fabRef, style, handlePointerDown, handleClick, className } =
    useDraggableFab(storageKey);

  return (
    <Link
      ref={fabRef as React.Ref<HTMLAnchorElement>}
      to={to}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      className={className}
      style={style}
    >
      {children}
    </Link>
  );
}

type DraggableFabTriggerProps = ComponentPropsWithoutRef<"button"> & {
  storageKey?: string;
};

export const DraggableFabTrigger = forwardRef<
  HTMLButtonElement,
  DraggableFabTriggerProps
>(function DraggableFabTrigger(
  {
    storageKey = "app_fab_position",
    className,
    children,
    onPointerDown,
    onClick,
    type = "button",
    ...props
  },
  forwardedRef,
) {
  const {
    fabRef,
    style,
    handlePointerDown,
    handleClick,
    className: fabClassName,
  } = useDraggableFab(storageKey);

  const setRefs = useCallback(
    (node: HTMLButtonElement | null) => {
      fabRef.current = node;
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    },
    [forwardedRef, fabRef],
  );

  return (
    <button
      ref={setRefs}
      type={type}
      className={cn(fabClassName, className)}
      style={style}
      onPointerDown={(event) => {
        handlePointerDown(event);
        onPointerDown?.(event);
      }}
      onClick={(event) => {
        handleClick(event);
        if (!event.defaultPrevented) {
          onClick?.(event);
        }
      }}
      {...props}
    >
      {children}
    </button>
  );
});
