import { cn } from "@be-water/ui/utils";

interface UserRoleBadgeProps {
  isSystemAdmin: boolean;
}

export function UserRoleBadge({ isSystemAdmin }: UserRoleBadgeProps) {
  return (
    <span
      className={cn(
        "px-2 py-1 rounded-full",
        isSystemAdmin
          ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      )}
    >
      {isSystemAdmin ? "系统管理员" : "普通用户"}
    </span>
  );
}
