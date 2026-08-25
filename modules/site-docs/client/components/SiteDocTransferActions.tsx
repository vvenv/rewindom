import { useCallback, type ReactElement } from "react";

import { ApiError, FilePickerTrigger } from "@rewindom/module-sdk/client";
import { Button } from "@rewindom/ui/button";
import { ButtonGroup } from "@rewindom/ui/button-group";
import { Spinner } from "@rewindom/ui/spinner";
import { toast } from "@rewindom/ui/toast";
import { Download, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  SITE_DOC_IMPORT_ACCEPT,
  useSiteDocImport,
} from "../hooks/use-site-doc-import.js";
import { useExportAllSiteDocs } from "../hooks/useSiteDocs.js";
import { downloadMarkdownFile } from "../lib/site-doc-list.js";

/**
 * 文档库的批量导入 / 导出。
 *
 * 整体 `hidden md:flex`：`PageLayout` 在移动端会把 `action` 整块再渲染一遍到固定
 * 浮层里（那层是给 FAB 用的），不挡住的话这两个按钮会飘在内容上方。批量导入导出
 * 本来也不是手机上会做的事。
 *
 * 导入还有第二条路——直接把 `.md` 拖到列表上（`SiteDocImportDrop`），两边共用同一个
 * `useSiteDocImport`。
 */
export function SiteDocTransferActions({
  canWrite,
  hasDocs,
}: {
  canWrite: boolean;
  hasDocs: boolean;
}): ReactElement {
  const { t } = useTranslation("site-docs");
  const { importFiles, isPending: importing } = useSiteDocImport();
  const exportAll = useExportAllSiteDocs();

  const handleExportAll = useCallback(async () => {
    try {
      const result = await exportAll.mutateAsync();
      for (const doc of result.docs) {
        downloadMarkdownFile(doc.filename, doc.markdown);
      }
      toast.success(t("siteDocs.exportAllDone"));
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : t("siteDocs.exportAllFailed"),
      );
    }
  }, [exportAll, t]);

  return (
    <ButtonGroup className="hidden md:flex">
      {canWrite ? (
        <FilePickerTrigger
          accept={SITE_DOC_IMPORT_ACCEPT}
          multiple
          disabled={importing}
          onFiles={importFiles}
        >
          <Button variant="outline" size="sm">
            {importing ? (
              <Spinner className="size-3.5" />
            ) : (
              <Upload className="size-3.5" />
            )}
            {t("siteDocs.import")}
          </Button>
        </FilePickerTrigger>
      ) : null}
      <Button
        variant="outline"
        size="sm"
        disabled={exportAll.isPending || !hasDocs}
        onClick={() => void handleExportAll()}
      >
        {exportAll.isPending ? (
          <Spinner className="size-3.5" />
        ) : (
          <Download className="size-3.5" />
        )}
        {t("siteDocs.exportAll")}
      </Button>
    </ButtonGroup>
  );
}
