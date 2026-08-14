import {
  useCallback,
  useRef,
  type ChangeEvent,
  type ReactElement,
} from "react";

import { ApiError } from "@rewindom/module-sdk/client";
import { Button } from "@rewindom/ui/button";
import { ButtonGroup } from "@rewindom/ui/button-group";
import { Spinner } from "@rewindom/ui/spinner";
import { toast } from "@rewindom/ui/toast";
import { Download, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  useExportAllSiteDocs,
  useImportSiteDocs,
} from "../hooks/useSiteDocs.js";
import { downloadMarkdownFile } from "../lib/site-doc-list.js";

/**
 * 文档库的批量导入 / 导出。
 *
 * 整体 `hidden md:flex`：`PageLayout` 在移动端会把 `action` 整块再渲染一遍到固定
 * 浮层里（那层是给 FAB 用的），不挡住的话这两个按钮会飘在内容上方。批量导入导出
 * 本来也不是手机上会做的事。
 */
export function SiteDocTransferActions({
  canWrite,
  hasDocs,
}: {
  canWrite: boolean;
  hasDocs: boolean;
}): ReactElement {
  const { t } = useTranslation("site-docs");
  const importDocs = useImportSiteDocs();
  const exportAll = useExportAllSiteDocs();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;
      try {
        const result = await importDocs.mutateAsync(Array.from(files));
        const created = result.imported.filter((item) => item.created).length;
        const updated = result.imported.length - created;
        toast.success(t("siteDocs.importResult", { created, updated }));
      } catch (error) {
        toast.error(
          error instanceof ApiError
            ? error.message
            : t("siteDocs.importFailed"),
        );
      }
      // 同一个文件连选两次也要能触发 change
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [importDocs, t],
  );

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
    <>
      {/* 放在 ButtonGroup 外：它的 `:first-child` 圆角规则会算上这个隐藏 input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,text/markdown"
        multiple
        className="hidden"
        onChange={(event) => void handleImport(event)}
      />
      <ButtonGroup className="hidden md:flex">
        {canWrite ? (
          <Button
            variant="outline"
            size="sm"
            disabled={importDocs.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            {importDocs.isPending ? (
              <Spinner className="size-3.5" />
            ) : (
              <Upload className="size-3.5" />
            )}
            {t("siteDocs.import")}
          </Button>
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
    </>
  );
}
