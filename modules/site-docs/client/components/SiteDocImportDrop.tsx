import type { ReactElement, ReactNode } from "react";

import { FileDropArea } from "@rewindom/module-sdk/client";
import { useTranslation } from "react-i18next";

import {
  SITE_DOC_IMPORT_ACCEPT,
  useSiteDocImport,
} from "../hooks/use-site-doc-import.js";

/**
 * 把文档列表整块变成导入投放区：`.md` 拖进来（或粘贴）就导入。
 *
 * 无写权限时原样透传 children——没权限的人拖进来只会拿到一个 403。
 */
export function SiteDocImportDrop({
  canWrite,
  children,
}: {
  canWrite: boolean;
  children: ReactNode;
}): ReactElement {
  const { t } = useTranslation("site-docs");
  const { importFiles, isPending } = useSiteDocImport();

  if (!canWrite) return <>{children}</>;

  return (
    <FileDropArea
      accept={SITE_DOC_IMPORT_ACCEPT}
      multiple
      pending={isPending}
      label={t("siteDocs.dropToImport")}
      onFiles={importFiles}
    >
      {children}
    </FileDropArea>
  );
}
