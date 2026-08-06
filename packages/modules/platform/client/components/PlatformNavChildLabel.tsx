import { useNavBadgeCount, type PlatformNavChild } from "@be-water/client-kit";

function PlatformNavBadgeLabel({
  label,
  badgeKey,
}: {
  label: string;
  badgeKey: string;
}) {
  const badgeCount = useNavBadgeCount(badgeKey);

  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <span className="truncate">{label}</span>
      {badgeCount > 0 ? (
        <span className="ml-auto shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium leading-none text-primary-foreground">
          {badgeCount}
        </span>
      ) : null}
    </span>
  );
}

export function PlatformNavChildLabel({
  label,
  badgeKey,
}: {
  label: string;
  badgeKey?: PlatformNavChild["badgeKey"];
}) {
  if (badgeKey) {
    return <PlatformNavBadgeLabel label={label} badgeKey={badgeKey} />;
  }

  return <span className="truncate">{label}</span>;
}
