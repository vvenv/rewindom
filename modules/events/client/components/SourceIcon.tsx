/**
 * 采集源 favicon。地址是本站 `/events/icons/{host}`，坏掉就摘掉，不占位。
 * alt 留空：名字写在旁边，图标是装饰。
 */

export function SourceIcon({
  url,
  className = "size-4",
}: {
  url: string | null | undefined;
  className?: string;
}): React.ReactElement | null {
  if (!url) {
    return null;
  }
  return (
    <img
      src={url}
      alt=""
      width={16}
      height={16}
      loading="lazy"
      decoding="async"
      className={`shrink-0 rounded-[2px] object-contain ${className}`}
      onError={(event) => {
        event.currentTarget.remove();
      }}
    />
  );
}
