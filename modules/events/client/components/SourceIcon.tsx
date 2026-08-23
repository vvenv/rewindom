/**
 * 采集源 favicon。地址是本站 `/events/icons/{host}`。
 * 没有地址或取图失败时用 globe fallback 占位，不把图标摘掉。
 * alt 留空：名字写在旁边，图标是装饰。
 */

import { useState, type ReactElement } from "react";

function SourceIconFallback({
  className,
}: {
  className?: string;
}): ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 1 0 20 14.5 14.5 0 0 1 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}

export function SourceIcon({
  url,
  className = "size-4",
}: {
  url: string | null | undefined;
  className?: string;
}): ReactElement {
  const [broken, setBroken] = useState<string | null>(null);
  const src = url && broken !== url ? url : null;

  return (
    <span
      className={`text-muted-foreground relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[2px] ${className}`}
      aria-hidden="true"
    >
      {src ? (
        <img
          src={src}
          alt=""
          width={16}
          height={16}
          loading="lazy"
          decoding="async"
          className="size-full object-contain"
          onError={() => {
            setBroken(src);
          }}
        />
      ) : (
        <SourceIconFallback className="size-full" />
      )}
    </span>
  );
}
