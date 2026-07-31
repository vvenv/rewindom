import { cn } from "@be-water/ui/utils";
import { useTranslation } from "react-i18next";

interface UserRoleBadgeProps {
  isSystemAdmin: boolean;
}

export function UserRoleBadge({ isSystemAdmin }: UserRoleBadgeProps) {
  const { t } = useTranslation("user");

  return (
    <span
      className={cn(
        "px-2 py-1 rounded-full",
        isSystemAdmin
          ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      )}
    >
      {isSystemAdmin ? t("roleBadge.systemAdmin") : t("roleBadge.regularUser")}
    </span>
  );
}
