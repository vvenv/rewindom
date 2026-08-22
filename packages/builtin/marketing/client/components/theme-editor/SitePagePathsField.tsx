import { type ReactElement } from "react";

import { Checkbox } from "@rewindom/ui/checkbox";
import { useTranslation } from "react-i18next";

import { normalizeLogicalPagePath } from "../../../shared/section-settings.js";

import { useSiteNavPreview } from "./site-nav-preview-context.js";

/**
 * 页头 / 页脚段的「仅这些页面显示」：当前语言下的 CMS 页打勾。
 *
 * 空 = 全站。存逻辑路径（与 `link` 同一口径），模板页如 `/docs/:slug` 管那一类全部详情。
 */
export function SitePagePathsField({
  id,
  value,
  disabled,
  onChange,
}: {
  id: string;
  value: readonly string[];
  disabled?: boolean;
  onChange: (next: string[]) => void;
}): ReactElement {
  const { t } = useTranslation("marketing");
  const { editorPages = [] } = useSiteNavPreview();
  const selected = new Set(value);
  const listed = new Set(editorPages.map((page) => page.path));
  const orphans = value.filter((path) => !listed.has(path));

  function toggle(path: string, checked: boolean): void {
    const next = checked
      ? [...value.filter((item) => item !== path), path]
      : value.filter((item) => item !== path);
    onChange(next);
  }

  if (editorPages.length === 0 && orphans.length === 0) {
    return (
      <p id={id} className="text-xs text-muted-foreground">
        {t("editor.visibleOnEmpty")}
      </p>
    );
  }

  return (
    <div id={id} className="max-h-60 space-y-1 overflow-auto">
      {editorPages.map((page) => {
        const path = normalizeLogicalPagePath(page.path) ?? page.path;
        return (
          <label
            key={path}
            className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 hover:bg-muted/50"
          >
            <Checkbox
              disabled={disabled}
              checked={selected.has(path)}
              className="mt-0.5"
              onCheckedChange={(next) => toggle(path, next === true)}
            />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm">{page.title}</span>
              <span className="block truncate font-mono text-xs text-muted-foreground">
                {path}
              </span>
            </span>
          </label>
        );
      })}
      {orphans.map((path) => (
        <label
          key={path}
          className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 hover:bg-muted/50"
        >
          <Checkbox
            disabled={disabled}
            checked
            className="mt-0.5"
            onCheckedChange={(next) => toggle(path, next === true)}
          />
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-sm">
              {t("editor.visibleOnMissing")}
            </span>
            <span className="block truncate font-mono text-xs text-muted-foreground">
              {path}
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}
