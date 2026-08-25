import { ApiError } from "@rewindom/module-sdk/client";
import { toast } from "@rewindom/ui/toast";
import { useTranslation } from "react-i18next";

import { useImportSiteDocs } from "./useSiteDocs.js";

/** 导入只吃 Markdown：文件名当路径、frontmatter 当元数据，别的格式没这套约定。 */
export const SITE_DOC_IMPORT_ACCEPT = ".md,text/markdown";

export interface SiteDocImport {
  importFiles: (files: File[]) => void;
  isPending: boolean;
}

/**
 * 文档批量导入的唯一入口：工具栏按钮、往列表上拖、粘贴，三条路共用它。
 *
 * 结果提示放在这里而不是各个组件里——同一件事在三个地方各写一遍 toast，迟早会有一处
 * 忘了报错，用户只看到「没反应」。
 */
export function useSiteDocImport(): SiteDocImport {
  const { t } = useTranslation("site-docs");
  const importDocs = useImportSiteDocs();

  return {
    isPending: importDocs.isPending,
    importFiles: (files) => {
      if (files.length === 0) return;
      importDocs.mutate(files, {
        onSuccess: (result) => {
          const created = result.imported.filter((item) => item.created).length;
          const updated = result.imported.length - created;
          toast.success(t("siteDocs.importResult", { created, updated }));
        },
        onError: (error) => {
          toast.error(
            error instanceof ApiError
              ? error.message
              : t("siteDocs.importFailed"),
          );
        },
      });
    },
  };
}
