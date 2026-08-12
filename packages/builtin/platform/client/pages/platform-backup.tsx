import { useTranslation } from "react-i18next";

import { PlatformBackupCard } from "../components/PlatformBackupCard.js";

/**
 * 平台运维页：整库备份与还原。
 *
 * 挂在 `PlatformLayout` 下，不要再套 `PageLayout`——壳层已经画了标题。
 */
export function PlatformBackup() {
  const { t } = useTranslation("platform");

  return (
    <div className="flex flex-col gap-6">
      <p className="hidden text-muted-foreground md:block">
        {t("backup.description")}
      </p>
      <PlatformBackupCard />
    </div>
  );
}
