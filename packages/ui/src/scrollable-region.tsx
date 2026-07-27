import { useCallback, useEffect, useRef, useState } from "react";

import { ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@be-water/ui/button";
import { cn } from "@be-water/ui/utils";

const DEFAULT_SCROLL_STEP_PX = 100;
const SCROLL_EDGE_THRESHOLD_PX = 2;

export function ensureElementFullyVisible(
  container: HTMLElement,
  element: HTMLElement,
  behavior: ScrollBehavior = "instant",
): void {
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  let scrollDelta = 0;

  if (elementRect.top < containerRect.top) {
    scrollDelta = elementRect.top - containerRect.top;
  } else if (elementRect.bottom > containerRect.bottom) {
    scrollDelta = elementRect.bottom - containerRect.bottom;
  }

  if (scrollDelta !== 0) {
    container.scrollBy({ top: scrollDelta, behavior });
  }
}

interface ScrollableRegionProps {
  children: React.ReactNode;
  className?: string;
  onViewportMount?: (viewport: HTMLDivElement | null) => void;
  scrollStepPx?: number;
  scrollUpLabel?: string;
  scrollDownLabel?: string;
  /** Re-run overflow detection when content changes */
  contentKey?: unknown;
  showScrollButtons?: boolean;
}

export function ScrollableRegion({
  children,
  className,
  onViewportMount,
  scrollStepPx = DEFAULT_SCROLL_STEP_PX,
  scrollUpLabel = "向上滚动",
  scrollDownLabel = "向下滚动",
  contentKey,
  showScrollButtons = true,
}: ScrollableRegionProps) {
  const internalViewportRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  useEffect(() => {
    onViewportMount?.(internalViewportRef.current);
    return () => {
      onViewportMount?.(null);
    };
  }, [onViewportMount]);

  const updateScrollState = useCallback(() => {
    const container = internalViewportRef.current;
    if (!container) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = container;
    setCanScrollUp(scrollTop > SCROLL_EDGE_THRESHOLD_PX);
    setCanScrollDown(
      scrollTop + clientHeight < scrollHeight - SCROLL_EDGE_THRESHOLD_PX,
    );
  }, []);

  useEffect(() => {
    const container = internalViewportRef.current;
    if (!container) {
      return;
    }

    updateScrollState();
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(container);
    return () => observer.disconnect();
  }, [contentKey, updateScrollState]);

  const scrollByStep = (direction: "up" | "down") => {
    internalViewportRef.current?.scrollBy({
      top: direction === "up" ? -scrollStepPx : scrollStepPx,
      behavior: "smooth",
    });
  };

  return (
    <div
      className={cn(
        "relative flex min-h-0 flex-col overflow-hidden",
        className,
      )}
    >
      {showScrollButtons ? (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8"
          />
          <Button
            type="button"
            variant="ghost"
            onClick={() => scrollByStep("up")}
            aria-label={scrollUpLabel}
            disabled={!canScrollUp}
          >
            <ChevronUp />
          </Button>
        </>
      ) : null}

      <div
        ref={internalViewportRef}
        onScroll={updateScrollState}
        className="h-0 min-h-0 flex-1 overflow-y-auto scroll-smooth"
      >
        {children}
      </div>

      {showScrollButtons ? (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8"
          />
          <Button
            type="button"
            variant="ghost"
            onClick={() => scrollByStep("down")}
            aria-label={scrollDownLabel}
            disabled={!canScrollDown}
          >
            <ChevronDown />
          </Button>
        </>
      ) : null}
    </div>
  );
}
