/**
 * 采集源 favicon。地址是本站 `/events/icons/{host}`。
 * 没有地址或取图失败时用出版方**首字母**占位，不把图标摘掉——
 * 有的有标有的空一截比都没有更差。
 * alt 留空：名字写在旁边，图标是装饰。
 */

import { useState, type ReactElement } from "react";

import { sourceMonogram } from "../../shared/index.js";

export function SourceIcon({
  url,
  name,
  className = "size-4",
}: {
  url: string | null | undefined;
  /** 占位要画的首字母从这里来。与公开面 `sourceIconImgHtml` 同一份规则 */
  name: string;
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
        <span className="bg-foreground/8 flex size-full items-center justify-center text-[0.5625rem] leading-none font-semibold">
          {sourceMonogram(name)}
        </span>
      )}
    </span>
  );
}
